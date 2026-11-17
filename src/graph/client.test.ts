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

  describe('an Intune error wrapped in the Graph message', () => {
    const inner = JSON.stringify({ _version: 3, Message: 'An error has occurred - Activity ID: a1 - Url: https://intune' }, null, 2);
    const wrapped = (errorCode: string, spacing?: number) =>
      JSON.stringify({ ErrorCode: errorCode, Message: inner, Target: null, InstanceAnnotations: [] }, null, spacing);

    it.each([400, 401, 500])('reports a wrapped Forbidden under HTTP %i as a 403 with the readable message', async (status) => {
      const { client } = setup(json(status, { error: { code: 'UnknownError', message: wrapped('Forbidden') } }));
      await expect(client.get('/x')).rejects.toMatchObject({
        status: 403,
        code: 'Forbidden',
        message: 'An error has occurred - Activity ID: a1 - Url: https://intune',
      });
    });

    it('also reads the wrapper when Intune puts spaces in its JSON', async () => {
      const { client } = setup(json(401, { error: { code: 'UnknownError', message: wrapped('Forbidden', 2) } }));
      await expect(client.get('/x')).rejects.toMatchObject({ status: 403 });
    });

    it('keeps the status of another wrapped Intune error, with the readable message', async () => {
      const { client } = setup(json(500, { error: { code: 'UnknownError', message: wrapped('InternalServerError') } }));
      await expect(client.get('/x')).rejects.toMatchObject({
        status: 500,
        code: 'UnknownError',
        message: 'An error has occurred - Activity ID: a1 - Url: https://intune',
      });
    });

    it('leaves a message that is not an Intune wrapper as it is', async () => {
      const { client } = setup(json(401, { error: { code: 'InvalidAuthenticationToken', message: '{"error":"expired"}' } }));
      await expect(client.get('/x')).rejects.toMatchObject({ status: 401, message: '{"error":"expired"}' });
    });
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

  it('lets one request wait longer than the default timeout', async () => {
    const hanging = vi.fn<typeof fetch>(
      (_, init) => new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))),
    );
    const client = createGraphClient(async () => 't', { fetchFn: hanging, sleep: async () => {}, timeoutMs: 20 });
    const started = Date.now();
    await expect(client.post('/x', {}, { timeoutMs: 120 })).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(Date.now() - started).toBeGreaterThanOrEqual(100);
  });

  it('follows @odata.nextLink and returns every page', async () => {
    const { client, fetchFn } = setup(
      json(200, { value: [1, 2], '@odata.nextLink': 'https://graph.microsoft.com/beta/deviceManagement/configurationPolicies?$skiptoken=abc' }),
      json(200, { value: [3] }),
    );
    await expect(client.getAll('/deviceManagement/configurationPolicies', { version: 'beta' })).resolves.toEqual([1, 2, 3]);
    expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
      'https://graph.microsoft.com/beta/deviceManagement/configurationPolicies',
      'https://graph.microsoft.com/beta/deviceManagement/configurationPolicies?$skiptoken=abc',
    ]);
  });

  it('never sends the token to a next link outside Microsoft Graph', async () => {
    const { client, fetchFn } = setup(json(200, { value: [1], '@odata.nextLink': 'https://evil.example.com/steal' }));
    await expect(client.getAll('/x')).rejects.toThrow(/next link/i);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('stops after a bounded number of pages', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => json(200, { value: [1], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/x?page=n' }));
    const client = createGraphClient(async () => 't', { fetchFn, sleep: async () => {}, timeoutMs: 1000 });
    await expect(client.getAll('/x')).rejects.toThrow(/pages/i);
    expect(fetchFn).toHaveBeenCalledTimes(50);
  });

  it('refuses a page without a value array', async () => {
    const { client } = setup(json(200, { items: [] }));
    await expect(client.getAll('/x')).rejects.toThrow();
  });
});
