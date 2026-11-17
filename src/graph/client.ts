// The only module that calls Microsoft Graph. Security data it returns stays in browser memory:
// it is never logged, stored or sent anywhere else (ADR-0003, ADR-0004).

const GRAPH = 'https://graph.microsoft.com';
const MAX_RETRIES = 3;
const MAX_RETRY_WAIT_MS = 30_000;
const DEFAULT_RETRY_WAIT_MS = 2_000;
const RETRYABLE = new Set([429, 503, 504]);
const MAX_PAGES = 50;

/** A failed Microsoft Graph request, with the HTTP status and Graph's error code and message. */
export class GraphError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'GraphError';
    this.status = status;
    this.code = code;
  }
}

export interface GraphRequestOptions {
  version?: 'v1.0' | 'beta';
  /** Overrides the client's timeout for this request. */
  timeoutMs?: number;
}

export interface GraphClient {
  get<T>(path: string, options?: GraphRequestOptions): Promise<T>;
  /** Every item of a collection, following @odata.nextLink for at most 50 pages. */
  getAll<T>(path: string, options?: GraphRequestOptions): Promise<T[]>;
  post<T>(path: string, body: unknown, options?: GraphRequestOptions): Promise<T>;
}

export interface GraphClientOptions {
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Per request; advanced hunting queries can take a while. */
  timeoutMs?: number;
}

const parse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const stringField = (value: unknown, key: string): string | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const field: unknown = (value as Record<string, unknown>)[key];
  return typeof field === 'string' ? field : undefined;
};

/**
 * Intune answers through Graph with its own error wrapped as JSON in Graph's message:
 * {"ErrorCode":"Forbidden","Message":"{\"Message\":\"An error has occurred ...\"}"}. The outer status
 * of a refusal is not always 403, so a wrapped Forbidden becomes a 403 here, and the readable inner
 * message replaces the JSON.
 */
function unwrapIntune(status: number, code: string, message: string): GraphError {
  const wrapper = parse(message);
  const intuneCode = stringField(wrapper, 'ErrorCode');
  if (intuneCode === undefined) return new GraphError(status, code, message);
  const outer = stringField(wrapper, 'Message') ?? '';
  const readable = stringField(parse(outer), 'Message') ?? (outer || message);
  return intuneCode === 'Forbidden' ? new GraphError(403, 'Forbidden', readable) : new GraphError(status, code, readable);
}

async function errorFrom(response: Response): Promise<GraphError> {
  let code = '';
  let message = `Microsoft Graph answered HTTP ${response.status}.`;
  try {
    const body = (await response.json()) as { error?: { code?: unknown; message?: unknown } };
    if (typeof body.error?.code === 'string') code = body.error.code;
    if (typeof body.error?.message === 'string' && body.error.message) message = body.error.message;
  } catch {
    // Not JSON: keep the status-only message.
  }
  return unwrapIntune(response.status, code, message);
}

function retryWaitMs(response: Response): number {
  const seconds = Number(response.headers.get('Retry-After'));
  const wait = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_RETRY_WAIT_MS;
  return Math.min(wait, MAX_RETRY_WAIT_MS);
}

/**
 * Calls Microsoft Graph with the User's delegated token. Throttled requests (429, 503, 504) are
 * retried at most three times, waiting for Retry-After up to 30 seconds; every request times out.
 */
export function createGraphClient(
  accessToken: () => Promise<string>,
  {
    fetchFn = (...args) => fetch(...args),
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    timeoutMs = 60_000,
  }: GraphClientOptions = {},
): GraphClient {
  async function request<T>(method: 'GET' | 'POST', url: string, body: unknown, requestTimeoutMs = timeoutMs): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const headers = new Headers({ Authorization: `Bearer ${await accessToken()}` });
      if (body !== undefined) headers.set('Content-Type', 'application/json');
      const response = await fetchFn(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      if (response.ok) return (await response.json()) as T;
      if (RETRYABLE.has(response.status) && attempt < MAX_RETRIES) {
        await sleep(retryWaitMs(response));
        continue;
      }
      throw await errorFrom(response);
    }
  }

  const urlOf = (path: string, { version = 'v1.0' }: GraphRequestOptions = {}) => `${GRAPH}/${version}${path}`;

  async function getAll<T>(path: string, options?: GraphRequestOptions): Promise<T[]> {
    const items: T[] = [];
    let url: string | undefined = urlOf(path, options);
    for (let page = 0; url; page++) {
      if (page === MAX_PAGES) throw new Error(`Microsoft Graph returned more than ${MAX_PAGES} pages.`);
      // The token goes only to Microsoft Graph, whatever a next link says.
      if (!url.startsWith(`${GRAPH}/`)) throw new Error('Microsoft Graph sent a next link outside Microsoft Graph.');
      const body: { value?: unknown; '@odata.nextLink'?: unknown } = await request('GET', url, undefined, options?.timeoutMs);
      if (!Array.isArray(body.value)) throw new Error('Microsoft Graph sent a page without a value list.');
      items.push(...(body.value as T[]));
      url = typeof body['@odata.nextLink'] === 'string' ? body['@odata.nextLink'] : undefined;
    }
    return items;
  }

  return {
    get: (path, options) => request('GET', urlOf(path, options), undefined, options?.timeoutMs),
    getAll,
    post: (path, body, options) => request('POST', urlOf(path, options), body, options?.timeoutMs),
  };
}
