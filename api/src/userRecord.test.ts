import { fromEntity, identityFromClaims, parseContactConsentChoice, toEntity, type UserRecord } from './userRecord.js';

const homeTenantId = '11111111-1111-1111-1111-111111111111';

const claims = {
  tid: homeTenantId,
  preferred_username: 'Ada@Contoso.com',
  given_name: 'Ada',
  family_name: 'Lovelace',
  email: 'ada.lovelace@contoso.com',
  name: 'Ada Lovelace',
  oid: '33333333-3333-3333-3333-333333333333',
  scp: 'UserRecord.ReadWrite',
};

const ada: UserRecord = {
  homeTenantId,
  username: 'ada@contoso.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada.lovelace@contoso.com',
  contactConsent: true,
  contactConsentDate: '2026-11-17T10:00:00.000Z',
};

describe('identityFromClaims', () => {
  it('takes the Home tenant, username, names and email from the token claims', () => {
    expect(identityFromClaims(claims)).toEqual({
      homeTenantId,
      username: 'ada@contoso.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada.lovelace@contoso.com',
    });
  });

  it('keeps nothing else from the token, such as the object ID or display name', () => {
    expect(Object.keys(identityFromClaims(claims)).sort()).toEqual(['email', 'firstName', 'homeTenantId', 'lastName', 'username']);
  });

  it('uses empty names and email when the token has none', () => {
    expect(identityFromClaims({ tid: homeTenantId, preferred_username: 'ada@contoso.com' })).toMatchObject({
      firstName: '',
      lastName: '',
      email: '',
    });
  });

  it('refuses a token without a Home tenant or username', () => {
    expect(() => identityFromClaims({ preferred_username: 'ada@contoso.com' })).toThrow(/tid/);
    expect(() => identityFromClaims({ tid: homeTenantId })).toThrow(/preferred_username/);
    expect(() => identityFromClaims({ tid: 42, preferred_username: 'ada@contoso.com' })).toThrow(/tid/);
  });
});

describe('toEntity', () => {
  it('stores exactly the six User record fields, keyed by Home tenant and username', () => {
    expect(toEntity(ada)).toEqual({
      partitionKey: homeTenantId,
      rowKey: 'ada%40contoso.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada.lovelace@contoso.com',
      contactConsent: true,
      contactConsentDate: '2026-11-17T10:00:00.000Z',
    });
  });

  it('escapes characters Table Storage does not allow in a row key', () => {
    expect(toEntity({ ...ada, username: 'a/b\\c#d?e@contoso.com' }).rowKey).not.toMatch(/[/\\#?]/);
  });

  it('reads back what it stored', () => {
    expect(fromEntity(toEntity({ ...ada, username: 'a/b#c@contoso.com' }))).toEqual({ ...ada, username: 'a/b#c@contoso.com' });
  });
});

describe('parseContactConsentChoice', () => {
  it('accepts exactly a boolean contactConsent', () => {
    expect(parseContactConsentChoice({ contactConsent: true })).toBe(true);
    expect(parseContactConsentChoice({ contactConsent: false })).toBe(false);
  });

  it.each([
    [null],
    ['yes'],
    [{}],
    [{ contactConsent: 'true' }],
    [{ contactConsent: true, email: 'someone@else.com' }],
    [[true]],
  ])('rejects %j', (body) => {
    expect(parseContactConsentChoice(body)).toBeNull();
  });
});
