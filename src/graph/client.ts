// The only module that calls Microsoft Graph. Security data it returns stays in browser memory:
// it is never logged, stored or sent anywhere else (ADR-0003, ADR-0004).

const GRAPH = 'https://graph.microsoft.com';
const MAX_RETRIES = 3;
const MAX_RETRY_WAIT_MS = 30_000;
const DEFAULT_RETRY_WAIT_MS = 2_000;
const RETRYABLE = new Set([429, 503, 504]);

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
}

export interface GraphClient {
  get<T>(path: string, options?: GraphRequestOptions): Promise<T>;
  post<T>(path: string, body: unknown, options?: GraphRequestOptions): Promise<T>;
}

export interface GraphClientOptions {
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Per request; advanced hunting queries can take a while. */
  timeoutMs?: number;
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
  return new GraphError(response.status, code, message);
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
  async function request<T>(method: 'GET' | 'POST', path: string, body: unknown, { version = 'v1.0' }: GraphRequestOptions = {}) {
    for (let attempt = 0; ; attempt++) {
      const headers = new Headers({ Authorization: `Bearer ${await accessToken()}` });
      if (body !== undefined) headers.set('Content-Type', 'application/json');
      const response = await fetchFn(`${GRAPH}/${version}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) return (await response.json()) as T;
      if (RETRYABLE.has(response.status) && attempt < MAX_RETRIES) {
        await sleep(retryWaitMs(response));
        continue;
      }
      throw await errorFrom(response);
    }
  }

  return {
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, body, options) => request('POST', path, body, options),
  };
}
