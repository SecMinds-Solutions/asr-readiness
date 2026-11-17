import { createGraphClient, GraphError } from './client';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

function setup(...responses: Response[]) {
  const fetchFn = vi.fn<typeof fetch>();
  for (const response of responses) fetchFn.mockResolvedValueOnce(response);
  const sleep = vi.fn(async () => {});
  const client = createGraphClient(async () => 'graph-token', { fetchFn, sleep, timeoutMs: 1000 });
  return { client, fetchFn, sleep };
}

describe('createGraphClient', () => {
  it('calls Microsoft Graph v1.0 with the delegated token', async () => {
    const { client, fetchFn } = setup(json(200, { value: [] }));
    await expect(client.get('/me')).resolves.toEqual({ value: [] });
    const [url, init] = fetchFn.mock.lastCall ?? [];
    expect(url).toBe('https://graph.microsoft.com/v1.0/me');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer graph-token');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('uses the beta endpoint when asked', async () => {
    const { client, fetchFn } = setup(json(200, {}));
    await client.get('/deviceManagement/configurationPolicies', { version: 'beta' });
    expect(fetchFn.mock.lastCall?.[0]).toBe('https://graph.microsoft.com/beta/deviceManagement/configurationPolicies');
  });

  it('posts a JSON body', async () => {
    const { client, fetchFn } = setup(json(200, { results: [] }));
    await client.post('/security/runHuntingQuery', { Query: 'DeviceEvents | take 1' });
    const init = fetchFn.mock.lastCall?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"Query":"DeviceEvents | take 1"}');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  });

  it('turns an error response into a GraphError with status, code and message', async () => {
    const { client } = setup(json(403, { error: { code: 'Forbidden', message: 'Missing role.' } }));
    const error = await client.get('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GraphError);
    expect(error).toMatchObject({ status: 403, code: 'Forbidden', message: 'Missing role.' });
  });

  it('keeps the status when the error body is not JSON', async () => {
    const { client } = setup(new Response('Bad gateway', { status: 502 }));
    await expect(client.get('/x')).rejects.toMatchObject({ status: 502, code: '' });
  });

  it('waits for Retry-After and retries a throttled request', async () => {
    const { client, fetchFn, sleep } = setup(json(429, {}, { 'Retry-After': '2' }), json(200, { ok: true }));
    await expect(client.get('/x')).resolves.toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('gives up after three retries instead of retrying forever', async () => {
    const { client, fetchFn } = setup(
      json(429, {}), json(503, {}), json(429, {}), json(429, { error: { code: 'TooManyRequests', message: 'Slow down.' } }),
    );
    await expect(client.get('/x')).rejects.toMatchObject({ status: 429 });
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('caps a long Retry-After', async () => {
    const { client, sleep } = setup(json(429, {}, { 'Retry-After': '3600' }), json(200, {}));
    await client.get('/x');
    expect(sleep).toHaveBeenCalledWith(30_000);
  });

  it('does not retry other errors', async () => {
    const { client, fetchFn } = setup(json(400, { error: { code: 'BadRequest', message: 'No.' } }));
    await expect(client.get('/x')).rejects.toMatchObject({ status: 400 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('gives up when Graph does not answer in time', async () => {
    const hanging = vi.fn<typeof fetch>(
      (_, init) => new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))),
    );
    const client = createGraphClient(async () => 't', { fetchFn: hanging, sleep: async () => {}, timeoutMs: 20 });
    await expect(client.get('/x')).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});
