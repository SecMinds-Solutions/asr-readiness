// Counting and filtering User records for the admin page. Pure: no network, storage or React.
import type { UserRecord } from './client';

export interface UserRecordCounts {
  total: number;
  withContactConsent: number;
  /** Users per Home tenant ID (the only tenant detail stored), most Users first. */
  perHomeTenant: { homeTenantId: string; users: number }[];
}

/** The Users who gave Contact consent, in their original order. */
export const withContactConsent = (users: readonly UserRecord[]): UserRecord[] => users.filter((user) => user.contactConsent);

export function userRecordCounts(users: readonly UserRecord[]): UserRecordCounts {
  const perTenant = new Map<string, number>();
  for (const user of users) perTenant.set(user.homeTenantId, (perTenant.get(user.homeTenantId) ?? 0) + 1);
  const perHomeTenant = [...perTenant]
    .map(([homeTenantId, count]) => ({ homeTenantId, users: count }))
    .sort((a, b) => b.users - a.users || a.homeTenantId.localeCompare(b.homeTenantId));
  return { total: users.length, withContactConsent: withContactConsent(users).length, perHomeTenant };
}
