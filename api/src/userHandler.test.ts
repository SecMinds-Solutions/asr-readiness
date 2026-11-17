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
    expect(response).toEqual({
      status: 200,
      jsonBody: { contactConsent: true, contactConsentDate: '2026-11-17T10:00:00.000Z' },
    });
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

  it('recognises a returning User', async () => {
    const d = deps();
    await handleUserRequest(request('PUT', { contactConsent: false }), d);
    const response = await handleUserRequest(request('GET'), d);
    expect(response).toEqual({
      status: 200,
      jsonBody: { contactConsent: false, contactConsentDate: '2026-11-17T10:00:00.000Z' },
    });
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
    expect((await handleUserRequest(request('DELETE'), deps())).status).toBe(405);
  });

  it('passes storage failures on instead of answering as if nothing was stored', async () => {
    const store = memoryStore();
    store.get = async () => Promise.reject(new Error('table unavailable'));
    await expect(handleUserRequest(request('GET'), deps(store))).rejects.toThrow('table unavailable');
  });
});
