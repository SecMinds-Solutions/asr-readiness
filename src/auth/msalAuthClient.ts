import {
  BrowserCacheLocation,
  InteractionRequiredAuthError,
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
  // Only for the Intune audit log, which tells when policy assignments changed (ADR-0002, ADR-0007).
  'DeviceManagementApps.Read.All',
];

/** The Microsoft Graph scopes an Analysis reads with; all are among the sign-in scopes. */
export const GRAPH_SCOPES: readonly string[] = ['ThreatHunting.Read.All', 'DeviceManagementConfiguration.Read.All', 'DeviceManagementApps.Read.All'];

/**
 * The scope the app registration exposes for the app's own API, which stores the User record.
 * It is a scope of ASR Compass itself, not of Microsoft Graph (see ADR-0002).
 */
export function userRecordScope(clientId: string): string {
  return `api://${clientId}/UserRecord.ReadWrite`;
}

/** Signs the User in and out. The UI depends on this, not on MSAL. */
export interface AuthClient {
  /** Completes a sign-in redirect if the page is returning from one, and returns who is signed in. */
  start(): Promise<SignedInUser | null>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** An access token for the app's own API, to read and store the User record. */
  userRecordToken(): Promise<string>;
  /** An access token for Microsoft Graph, to run advanced hunting and read Intune policies. */
  graphToken(): Promise<string>;
  /**
   * Replaces the cached Microsoft Graph token with a new one. A token carries the User's Microsoft
   * Entra roles from when it was issued, so after a role is assigned the cached one is out of date.
   */
  refreshGraphToken(): Promise<void>;
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
  | 'acquireTokenSilent'
  | 'acquireTokenRedirect'
>;

/**
 * A redirect has started: the browser is leaving for Microsoft's sign-in page and the app starts
 * again when it returns, so nothing waiting on this may go on.
 */
function waitForRedirect(): Promise<never> {
  return new Promise<never>(() => {});
}

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
  return createMsalAuthClient(new PublicClientApplication(msalConfiguration(config)), userRecordScope(config.clientId));
}

export function createMsalAuthClient(msal: MsalApp, apiScope: string): AuthClient {
  let started: Promise<SignedInUser | null> | undefined;

  async function start(): Promise<SignedInUser | null> {
    await msal.initialize();
    const result = await msal.handleRedirectPromise();
    const account = result?.account ?? msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;
    msal.setActiveAccount(account);
    return account ? signedInUserFrom(account) : null;
  }

  /** Tokens are issued for one resource at a time: the app's own API, or Microsoft Graph. */
  async function accessToken(scopes: string[], forceRefresh = false): Promise<string> {
    const account = msal.getActiveAccount();
    if (!account) throw new Error('Nobody is signed in.');
    const request = { scopes, account };
    try {
      return (await msal.acquireTokenSilent(forceRefresh ? { ...request, forceRefresh } : request)).accessToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) throw error;
      await msal.acquireTokenRedirect(request);
      return waitForRedirect();
    }
  }

  return {
    // React StrictMode and remounts may ask twice; MSAL must handle a redirect only once.
    start: () => (started ??= start()),
    // Tokens are issued for one resource at a time; consent for the app's own scope is asked for
    // in the same sign-in, so the User record token can then be fetched silently.
    signIn: () =>
      msal.loginRedirect({ scopes: [...SIGN_IN_SCOPES], extraScopesToConsent: [apiScope], prompt: 'select_account' }),
    signOut: () => msal.logoutRedirect({ account: msal.getActiveAccount() }),
    userRecordToken: () => accessToken([apiScope]),
    graphToken: () => accessToken([...GRAPH_SCOPES]),
    // MSAL caches the new token, so the next graphToken() returns it.
    refreshGraphToken: async () => {
      await accessToken([...GRAPH_SCOPES], true);
    },
  };
}
