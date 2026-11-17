import {
  BrowserCacheLocation,
  PublicClientApplication,
  type Configuration,
  type IPublicClientApplication,
} from '@azure/msal-browser';
import { ORGANIZATIONS_AUTHORITY, type AuthConfig } from './config';
import { signedInUserFrom, type SignedInUser } from './user';

/**
 * The delegated scopes the app asks for at sign-in: exactly those the app registration
 * requests (see ADR-0002). Asking for all of them at sign-in means a missing admin consent shows up
 * straight away, not halfway through an Analysis. MSAL adds `offline_access` itself, for a
 * refresh token (see ADR-0002).
 */
export const SIGN_IN_SCOPES: readonly string[] = [
  'openid',
  'profile',
  'email',
  'User.Read',
  'ThreatHunting.Read.All',
  'DeviceManagementConfiguration.Read.All',
];

/** Signs the User in and out. The UI depends on this, not on MSAL. */
export interface AuthClient {
  /** Completes a sign-in redirect if the page is returning from one, and returns who is signed in. */
  start(): Promise<SignedInUser | null>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

/** The part of MSAL's PublicClientApplication the auth client uses. */
export type MsalApp = Pick<
  IPublicClientApplication,
  | 'initialize'
  | 'handleRedirectPromise'
  | 'getActiveAccount'
  | 'setActiveAccount'
  | 'getAllAccounts'
  | 'loginRedirect'
  | 'logoutRedirect'
>;

export function msalConfiguration({ clientId, redirectUri }: AuthConfig): Configuration {
  return {
    auth: {
      clientId,
      authority: ORGANIZATIONS_AUTHORITY,
      redirectUri,
      postLogoutRedirectUri: redirectUri,
    },
    // Tokens live only as long as the browser tab.
    cache: { cacheLocation: BrowserCacheLocation.SessionStorage },
  };
}

export function createAuthClient(config: AuthConfig): AuthClient {
  return createMsalAuthClient(new PublicClientApplication(msalConfiguration(config)));
}

export function createMsalAuthClient(msal: MsalApp): AuthClient {
  let started: Promise<SignedInUser | null> | undefined;

  async function start(): Promise<SignedInUser | null> {
    await msal.initialize();
    const result = await msal.handleRedirectPromise();
    const account = result?.account ?? msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;
    msal.setActiveAccount(account);
    return account ? signedInUserFrom(account) : null;
  }

  return {
    // React StrictMode and remounts may ask twice; MSAL must handle a redirect only once.
    start: () => (started ??= start()),
    signIn: () => msal.loginRedirect({ scopes: [...SIGN_IN_SCOPES], prompt: 'select_account' }),
    signOut: () => msal.logoutRedirect({ account: msal.getActiveAccount() }),
  };
}
