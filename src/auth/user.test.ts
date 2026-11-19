import { signedInUserFrom } from './user';

const homeTenantId = '11111111-1111-1111-1111-111111111111';
const otherTenantId = '22222222-2222-2222-2222-222222222222';

describe('signedInUserFrom', () => {
  it('takes the name, username and Home tenant from the account', () => {
    expect(
      signedInUserFrom({
        name: 'Ada Lovelace',
        username: 'ada@contoso.com',
        homeAccountId: `aaaa.${homeTenantId}`,
        tenantId: homeTenantId,
      }),
    ).toEqual({ name: 'Ada Lovelace', username: 'ada@contoso.com', homeTenantId, tenantId: homeTenantId, email: 'ada@contoso.com', admin: false });
  });

  it('takes the Home tenant from the home account, not the tenant signed in to', () => {
    expect(
      signedInUserFrom({ name: 'Ada', username: 'ada@contoso.com', homeAccountId: `aaaa.${homeTenantId}`, tenantId: otherTenantId })
        .homeTenantId,
    ).toBe(homeTenantId);
  });

  it('keeps the tenant signed in to apart, as the Tenant an Analysis reads', () => {
    expect(
      signedInUserFrom({ name: 'Ada', username: 'ada@contoso.com', homeAccountId: `aaaa.${homeTenantId}`, tenantId: otherTenantId })
        .tenantId,
    ).toBe(otherTenantId);
  });

  it.each([
    [['Admin'], true],
    [['Reader'], false],
    ['Admin', false],
    [undefined, false],
  ])('treats roles %j in the ID token as admin: %s, only to show the admin link', (roles, admin) => {
    expect(
      signedInUserFrom({
        username: 'frans@secminds.nl',
        homeAccountId: `aaaa.${homeTenantId}`,
        tenantId: homeTenantId,
        idTokenClaims: roles === undefined ? {} : { roles: roles as string[] },
      }).admin,
    ).toBe(admin);
  });

  it('takes the email address from the ID token, or else the username', () => {
    const account = { username: 'ada@contoso.com', homeAccountId: `aaaa.${homeTenantId}`, tenantId: homeTenantId };
    expect(signedInUserFrom({ ...account, idTokenClaims: { email: 'ada.lovelace@contoso.com' } }).email).toBe('ada.lovelace@contoso.com');
    expect(signedInUserFrom({ ...account, idTokenClaims: {} }).email).toBe('ada@contoso.com');
  });

  it('falls back to the username when the account has no name', () => {
    expect(
      signedInUserFrom({ username: 'ada@contoso.com', homeAccountId: `aaaa.${homeTenantId}`, tenantId: homeTenantId }).name,
    ).toBe('ada@contoso.com');
  });
});
