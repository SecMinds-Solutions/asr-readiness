import type { AccountInfo } from '@azure/msal-browser';

/** Who is signed in, as shown in the app. */
export interface SignedInUser {
  name: string;
  username: string;
  homeTenantId: string;
}

/**
 * The signed-in User from an MSAL account. The Home tenant comes from the home account ID
 * (`<object ID>.<home tenant ID>`), which stays the User's own tenant when they sign in to
 * another one, such as a guest or GDAP sign-in.
 */
export function signedInUserFrom(
  account: Pick<AccountInfo, 'name' | 'username' | 'homeAccountId' | 'tenantId'>,
): SignedInUser {
  const homeTenantId = account.homeAccountId.split('.')[1] || account.tenantId;
  return { name: account.name || account.username, username: account.username, homeTenantId };
}
