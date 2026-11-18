import { handleUserRequest, type UserRequest, type UserStore } from './userHandler.js';
import { fromEntity, toEntity, type UserEntity } from './userRecord.js';

const tid = '11111111-1111-1111-1111-111111111111';
const claims = {
  tid,
  preferred_username: 'ada@contoso.com',
  given_name: 'Ada',
  family_name: 'Lovelace',
  email: 'ada@contoso.com',
  oid: 'not-stored',
  name: 'not stored',
};
const now = new Date('2026-11-17T10:00:00.000Z');

/** The stored User record as the API returns it to its own User. */
const record = (contactConsent: boolean, contactConsentDate = '2026-11-17T10:00:00.000Z') => ({
  homeTenantId: tid,
  username: 'ada@contoso.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@contoso.com',
  contactConsent,
  contactConsentDate,
});

/** Stores entities the way Table Storage would, so the test can see exactly what is kept. */
function memoryStore(): UserStore & { entities: Map<string, UserEntity> } {
  const entities = new Map<string, UserEntity>();
  return {
    entities,
    get: async (homeTenantId, username) => {
      const entity = entities.get(`${homeTenantId}/${username}`);
      return entity ? fromEntity(entity) : null;
    },
    save: async (record) => {
      entities.set(`${record.homeTenantId}/${record.username}`, toEntity(record));
    },
    delete: async (homeTenantId, username) => {
      entities.delete(`${homeTenantId}/${username}`);
    },
  };
}

function request(method: string, body?: unknown, authorization: string | null = 'Bearer good-token'): UserRequest {
  return { method, authorization, json: async () => body };
}

function deps(store = memoryStore()) {
  return {
    store,
    now: () => now,
    verify: vi.fn(async (token: string) => {
      if (token !== 'good-token') throw new Error('bad token');
      return claims;
    }),
  };
}

describe('handleUserRequest', () => {
  it.each([
    ['no Authorization header', null],
    ['a non-Bearer Authorization header', 'Basic abc'],
    ['an empty Bearer token', 'Bearer '],
    ['an invalid token', 'Bearer bad-token'],
  ])('rejects a request with %s without touching storage', async (_, authorization) => {
    const store = memoryStore();
    const save = vi.spyOn(store, 'save');
    const get = vi.spyOn(store, 'get');
    const response = await handleUserRequest(request('PUT', { contactConsent: true }, authorization), deps(store));
    expect(response.status).toBe(401);
    expect(response.headers?.['WWW-Authenticate']).toBe('Bearer');
    expect(save).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it('says a new User has no record yet', async () => {
    const response = await handleUserRequest(request('GET'), deps());
    expect(response.status).toBe(404);
  });

  it('stores exactly the six User record fields from the token and the choice', async () => {
    const store = memoryStore();
    const response = await handleUserRequest(request('PUT', { contactConsent: true }), deps(store));
    expect(response).toEqual({ status: 200, jsonBody: record(true) });
    expect([...store.entities.values()]).toEqual([
      {
        partitionKey: tid,
        rowKey: 'ada%40contoso.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@contoso.com',
        contactConsent: true,
        contactConsentDate: '2026-11-17T10:00:00.000Z',
      },
    ]);
  });

  it('shows a returning User their whole stored User record', async () => {
    const d = deps();
    await handleUserRequest(request('PUT', { contactConsent: false }), d);
    const response = await handleUserRequest(request('GET'), d);
    expect(response).toEqual({ status: 200, jsonBody: record(false) });
  });

  it('stores a withdrawn Contact consent with the date of the withdrawal', async () => {
    const store = memoryStore();
    await handleUserRequest(request('PUT', { contactConsent: true }), deps(store));
    const later = { ...deps(store), now: () => new Date('2026-12-01T08:30:00.000Z') };
    const response = await handleUserRequest(request('PUT', { contactConsent: false }), later);
    expect(response).toEqual({ status: 200, jsonBody: record(false, '2026-12-01T08:30:00.000Z') });
    expect([...store.entities.values()]).toEqual([
      expect.objectContaining({ contactConsent: false, contactConsentDate: '2026-12-01T08:30:00.000Z' }),
    ]);
  });

  it('deletes the signed-in User\'s record, so nothing about them remains', async () => {
    const store = memoryStore();
    await handleUserRequest(request('PUT', { contactConsent: true }), deps(store));
    const response = await handleUserRequest(request('DELETE'), deps(store));
    expect(response).toEqual({ status: 204 });
    expect(store.entities.size).toBe(0);
    expect((await handleUserRequest(request('GET'), deps(store))).status).toBe(404);
  });

  it('deletes only the record of the User the token names', async () => {
    const store = memoryStore();
    const other = { ...record(true), homeTenantId: '22222222-2222-2222-2222-222222222222' };
    await store.save(other);
    await handleUserRequest(request('PUT', { contactConsent: true }), deps(store));
    await handleUserRequest(request('DELETE', { homeTenantId: other.homeTenantId }), deps(store));
    expect([...store.entities.keys()]).toEqual([`${other.homeTenantId}/ada@contoso.com`]);
  });

  it('answers a delete without a record as done', async () => {
    expect(await handleUserRequest(request('DELETE'), deps())).toEqual({ status: 204 });
  });

  it('deletes nothing without a valid token', async () => {
    const store = memoryStore();
    await handleUserRequest(request('PUT', { contactConsent: true }), deps(store));
    const response = await handleUserRequest(request('DELETE', undefined, 'Bearer bad-token'), deps(store));
    expect(response.status).toBe(401);
    expect(store.entities.size).toBe(1);
  });

  it.each([
    [{ contactConsent: 'yes' }],
    [{ contactConsent: true, email: 'mallory@evil.example' }],
    [{ contactConsent: true, homeTenantId: '22222222-2222-2222-2222-222222222222' }],
    [{}],
  ])('rejects the choice %j and stores nothing', async (body) => {
    const store = memoryStore();
    const response = await handleUserRequest(request('PUT', body), deps(store));
    expect(response.status).toBe(400);
    expect(store.entities.size).toBe(0);
  });

  it('rejects a body that is not JSON', async () => {
    const store = memoryStore();
    const response = await handleUserRequest(
      { method: 'PUT', authorization: 'Bearer good-token', json: async () => Promise.reject(new SyntaxError('bad json')) },
      deps(store),
    );
    expect(response.status).toBe(400);
    expect(store.entities.size).toBe(0);
  });

  it('rejects a token without a username', async () => {
    const d = { ...deps(), verify: async () => ({ tid }) };
    const response = await handleUserRequest(request('PUT', { contactConsent: true }), d);
    expect(response.status).toBe(401);
  });

  it('rejects other methods', async () => {
    const response = await handleUserRequest(request('PATCH'), deps());
    expect(response.status).toBe(405);
    expect(response.headers?.['Allow']).toBe('GET, PUT, DELETE');
  });

  it('passes storage failures on instead of answering as if nothing was stored', async () => {
    const store = memoryStore();
    store.get = async () => Promise.reject(new Error('table unavailable'));
    await expect(handleUserRequest(request('GET'), deps(store))).rejects.toThrow('table unavailable');
  });

  it('passes delete failures on instead of answering as if the record was deleted', async () => {
    const store = memoryStore();
    store.delete = async () => Promise.reject(new Error('table unavailable'));
    await expect(handleUserRequest(request('DELETE'), deps(store))).rejects.toThrow('table unavailable');
  });
});
