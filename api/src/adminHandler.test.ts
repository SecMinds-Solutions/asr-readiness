import { ADMIN_ROLE, handleAdminUsersRequest, type AdminRequest } from './adminHandler.js';
import type { UserRecord } from './userRecord.js';

const adminTenant = '33333333-3333-3333-3333-333333333333';
const otherTenant = '11111111-1111-1111-1111-111111111111';

const ada: UserRecord = {
  homeTenantId: otherTenant,
  username: 'ada@contoso.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@contoso.com',
  contactConsent: true,
  contactConsentDate: '2026-11-17T10:00:00.000Z',
};
const grace: UserRecord = { ...ada, username: 'grace@fabrikam.com', firstName: 'Grace', contactConsent: false };

const request = (method = 'GET', authorization: string | null = 'Bearer good-token'): AdminRequest => ({ method, authorization });

function deps({
  claims = { tid: adminTenant, preferred_username: 'frans@secminds.nl', roles: [ADMIN_ROLE] } as Record<string, unknown>,
  adminTenantId = adminTenant as string | null,
  records = [ada, grace],
} = {}) {
  return {
    adminTenantId,
    store: { list: vi.fn(async () => records) },
    verify: vi.fn(async (token: string) => {
      if (token !== 'good-token') throw new Error('bad token');
      return claims;
    }),
  };
}

describe('handleAdminUsersRequest', () => {
  it('returns every User record to an admin of the admin tenant', async () => {
    const d = deps();
    expect(await handleAdminUsersRequest(request(), d)).toEqual({ status: 200, jsonBody: { users: [ada, grace] } });
    expect(d.store.list).toHaveBeenCalledOnce();
  });

  it.each([
    ['no Authorization header', null],
    ['an invalid token', 'Bearer bad-token'],
  ])('answers 401 to a request with %s, without reading storage', async (_, authorization) => {
    const d = deps();
    const response = await handleAdminUsersRequest(request('GET', authorization), d);
    expect(response.status).toBe(401);
    expect(response.headers?.['WWW-Authenticate']).toBe('Bearer');
    expect(d.store.list).not.toHaveBeenCalled();
  });

  it.each([
    ['a User without the Admin role', { tid: adminTenant, roles: [] }],
    ['a User whose roles claim is missing', { tid: adminTenant }],
    ['a User with another role', { tid: adminTenant, roles: ['Reader'] }],
    ['the Admin role from another tenant', { tid: otherTenant, roles: [ADMIN_ROLE] }],
    ['a roles claim that is not a list', { tid: adminTenant, roles: ADMIN_ROLE }],
    ['an email address of SecMinds without the role', { tid: otherTenant, email: 'frans@secminds.nl', preferred_username: 'frans@secminds.nl' }],
  ])('answers 403 to %s, without reading storage', async (_, claims) => {
    const d = deps({ claims });
    expect((await handleAdminUsersRequest(request(), d)).status).toBe(403);
    expect(d.store.list).not.toHaveBeenCalled();
  });

  it('answers 403 to everyone when no admin tenant is configured', async () => {
    const d = deps({ adminTenantId: null });
    expect((await handleAdminUsersRequest(request(), d)).status).toBe(403);
    expect(d.store.list).not.toHaveBeenCalled();
  });

  it('only reads: other methods are refused', async () => {
    for (const method of ['PUT', 'POST', 'DELETE', 'PATCH']) {
      const d = deps();
      const response = await handleAdminUsersRequest(request(method), d);
      expect(response).toEqual({ status: 405, headers: { Allow: 'GET' } });
      expect(d.store.list).not.toHaveBeenCalled();
    }
  });

  it('passes storage failures on instead of answering with an empty list', async () => {
    const d = deps();
    d.store.list = vi.fn(async () => Promise.reject(new Error('table unavailable')));
    await expect(handleAdminUsersRequest(request(), d)).rejects.toThrow('table unavailable');
  });
});
