import { createUserRecordClient } from './client';

const record = {
  homeTenantId: '11111111-1111-1111-1111-111111111111',
  username: 'ada@contoso.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@contoso.com',
  contactConsent: true,
  contactConsentDate: '2026-11-17T10:00:00.000Z',
};

function respond(status: number, body?: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));
}

describe('createUserRecordClient', () => {
  it("reads the signed-in User's stored User record with their access token", async () => {
    const fetchFn = respond(200, record);
    const client = createUserRecordClient(async () => 'api-token', fetchFn);
    await expect(client.userRecord()).resolves.toEqual(record);
    const [url, init] = fetchFn.mock.lastCall ?? [];
    expect(url).toBe('/api/user');
    expect(init?.method).toBe('GET');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer api-token');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('says a new User has no record yet', async () => {
    await expect(createUserRecordClient(async () => 't', respond(404, { error: 'x' })).userRecord()).resolves.toBeNull();
  });

  it('sends only the Contact consent choice when storing it', async () => {
    const fetchFn = respond(200, { ...record, contactConsent: false });
    const client = createUserRecordClient(async () => 'api-token', fetchFn);
    await expect(client.saveContactConsent(false)).resolves.toEqual({ ...record, contactConsent: false });
    const [url, init] = fetchFn.mock.lastCall ?? [];
    expect(url).toBe('/api/user');
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBe('{"contactConsent":false}');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  });

  it('deletes the signed-in User record with their access token and no body', async () => {
    const fetchFn = respond(204);
    const client = createUserRecordClient(async () => 'api-token', fetchFn);
    await expect(client.deleteUserRecord()).resolves.toBeUndefined();
    const [url, init] = fetchFn.mock.lastCall ?? [];
    expect(url).toBe('/api/user');
    expect(init?.method).toBe('DELETE');
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer api-token');
  });

  it.each([401, 404, 500])('fails a delete answered with HTTP %i instead of saying the record is gone', async (status) => {
    await expect(createUserRecordClient(async () => 't', respond(status, { error: 'x' })).deleteUserRecord()).rejects.toThrow(String(status));
  });

  it.each([401, 500, 503])('fails on HTTP %i instead of treating it as no record', async (status) => {
    await expect(createUserRecordClient(async () => 't', respond(status, { error: 'x' })).userRecord()).rejects.toThrow(String(status));
  });

  it.each([
    ['a Contact consent that is not a boolean', { ...record, contactConsent: 'yes' }],
    ['a record without a username', { ...record, username: undefined }],
  ])('fails on an answer with %s', async (_, body) => {
    await expect(createUserRecordClient(async () => 't', respond(200, body)).userRecord()).rejects.toThrow();
  });

  it('gives up when the API does not answer in time', async () => {
    const hanging = vi.fn<typeof fetch>(
      (_, init) => new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))),
    );
    await expect(createUserRecordClient(async () => 't', hanging, 20).userRecord()).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});
