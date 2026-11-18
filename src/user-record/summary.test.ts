import type { UserRecord } from './client';
import { userRecordCounts, withContactConsent } from './summary';

const tenantA = '11111111-1111-1111-1111-111111111111';
const tenantB = '22222222-2222-2222-2222-222222222222';

const user = (username: string, homeTenantId: string, contactConsent: boolean): UserRecord => ({
  homeTenantId,
  username,
  firstName: '',
  lastName: '',
  email: '',
  contactConsent,
  contactConsentDate: '2026-11-17T10:00:00.000Z',
});

const users = [user('a@a.com', tenantA, true), user('b@b.com', tenantB, false), user('c@a.com', tenantA, false), user('d@b.com', tenantB, true), user('e@a.com', tenantA, true)];

describe('withContactConsent', () => {
  it('keeps only the Users who gave Contact consent, in their order', () => {
    expect(withContactConsent(users).map((entry) => entry.username)).toEqual(['a@a.com', 'd@b.com', 'e@a.com']);
  });

  it('returns no Users from no records', () => {
    expect(withContactConsent([])).toEqual([]);
  });
});

describe('userRecordCounts', () => {
  it('counts all Users, those with Contact consent, and Users per Home tenant, most first', () => {
    expect(userRecordCounts(users)).toEqual({
      total: 5,
      withContactConsent: 3,
      perHomeTenant: [
        { homeTenantId: tenantA, users: 3 },
        { homeTenantId: tenantB, users: 2 },
      ],
    });
  });

  it('orders Home tenants with the same count by their ID, so the order is stable', () => {
    const counts = userRecordCounts([user('x', tenantB, false), user('y', tenantA, false)]);
    expect(counts.perHomeTenant.map((entry) => entry.homeTenantId)).toEqual([tenantA, tenantB]);
  });

  it('is all zero without records', () => {
    expect(userRecordCounts([])).toEqual({ total: 0, withContactConsent: 0, perHomeTenant: [] });
  });
});
