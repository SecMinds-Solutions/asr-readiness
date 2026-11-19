import type { AccountInfo } from '@azure/msal-browser';

/** The app role of SecMinds admins, as the app registration defines it. */
export const ADMIN_ROLE = 'Admin';

/** Who is signed in, as shown in the app. */
export interface SignedInUser {
  name: string;
  username: string;
  homeTenantId: string;
  /** The Tenant the User signed in to, whose devices and policies an Analysis reads; shown in the Tenant status bar. */
  tenantId: string;
  /** The email address from the ID token, or the username when it has none; shown in the user menu only. */
  email: string;
  /**
   * Whether the ID token carries the app role Admin. It only decides whether the app shows the
   * admin page link; the API checks the role and the admin tenant itself.
   */
  admin: boolean;
}

/**
 * The signed-in User from an MSAL account. The Home tenant comes from the home account ID
 * (`<object ID>.<home tenant ID>`), which stays the User's own tenant when they sign in to
 * another one, such as a guest or GDAP sign-in.
 */
export function signedInUserFrom(
  account: Pick<AccountInfo, 'name' | 'username' | 'homeAccountId' | 'tenantId' | 'idTokenClaims'>,
): SignedInUser {
  const homeTenantId = account.homeAccountId.split('.')[1] || account.tenantId;
  const roles = account.idTokenClaims?.roles;
  const admin = Array.isArray(roles) && roles.includes(ADMIN_ROLE);
  const emailClaim = account.idTokenClaims?.email;
  const email = typeof emailClaim === 'string' && emailClaim ? emailClaim : account.username;
  return { name: account.name || account.username, username: account.username, homeTenantId, tenantId: account.tenantId || homeTenantId, email, admin };
}
