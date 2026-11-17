import { createUserRecordClient } from './client';

const consent = { contactConsent: true, contactConsentDate: '2026-11-17T10:00:00.000Z' };

function respond(status: number, body?: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));
}

describe('createUserRecordClient', () => {
  it("reads the signed-in User's Contact consent with their access token", async () => {
    const fetchFn = respond(200, consent);
    const client = createUserRecordClient(async () => 'api-token', fetchFn);
    await expect(client.contactConsent()).resolves.toEqual(consent);
    const [url, init] = fetchFn.mock.lastCall ?? [];
    expect(url).toBe('/api/user');
    expect(init?.method).toBe('GET');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer api-token');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('says a new User has no record yet', async () => {
    await expect(createUserRecordClient(async () => 't', respond(404, { error: 'x' })).contactConsent()).resolves.toBeNull();
  });

  it('sends only the Contact consent choice when storing it', async () => {
    const fetchFn = respond(200, { ...consent, contactConsent: false });
    const client = createUserRecordClient(async () => 'api-token', fetchFn);
    await expect(client.saveContactConsent(false)).resolves.toEqual({ ...consent, contactConsent: false });
    const [url, init] = fetchFn.mock.lastCall ?? [];
    expect(url).toBe('/api/user');
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBe('{"contactConsent":false}');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  });

  it.each([401, 500, 503])('fails on HTTP %i instead of treating it as no record', async (status) => {
    await expect(createUserRecordClient(async () => 't', respond(status, { error: 'x' })).contactConsent()).rejects.toThrow(
      String(status),
    );
  });

  it('fails on a response that is not a Contact consent', async () => {
    await expect(createUserRecordClient(async () => 't', respond(200, { contactConsent: 'yes' })).contactConsent()).rejects.toThrow();
  });

  it('gives up when the API does not answer in time', async () => {
    const hanging = vi.fn<typeof fetch>(
      (_, init) => new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))),
    );
    await expect(createUserRecordClient(async () => 't', hanging, 20).contactConsent()).rejects.toThrow();
  });
});
