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
    ).toEqual({ name: 'Ada Lovelace', username: 'ada@contoso.com', homeTenantId });
  });

  it('takes the Home tenant from the home account, not the tenant signed in to', () => {
    expect(
      signedInUserFrom({ name: 'Ada', username: 'ada@contoso.com', homeAccountId: `aaaa.${homeTenantId}`, tenantId: otherTenantId })
        .homeTenantId,
    ).toBe(homeTenantId);
  });

  it('falls back to the username when the account has no name', () => {
    expect(
      signedInUserFrom({ username: 'ada@contoso.com', homeAccountId: `aaaa.${homeTenantId}`, tenantId: homeTenantId }).name,
    ).toBe('ada@contoso.com');
  });
});
