import { InteractionRequiredAuthError, type AccountInfo, type AuthenticationResult } from '@azure/msal-browser';
import type { Mock } from 'vitest';
import {
  createMsalAuthClient,
  GRAPH_SCOPES,
  msalConfiguration,
  SIGN_IN_SCOPES,
  userRecordScope,
  type MsalApp,
} from './msalAuthClient';

const config = { clientId: '0b5c3a1e-7d2f-4c8a-9e6b-1f2a3b4c5d6e', redirectUri: 'https://asr.example.com/' };
const homeTenantId = '11111111-1111-1111-1111-111111111111';
const apiScope = `api://${config.clientId}/UserRecord.ReadWrite`;

function account(name: string): AccountInfo {
  return {
    homeAccountId: `oid-${name}.${homeTenantId}`,
    environment: 'login.microsoftonline.com',
    tenantId: homeTenantId,
    username: `${name}@contoso.com`,
    localAccountId: `oid-${name}`,
    name,
  };
}

type FakeMsal = { [K in keyof MsalApp]: Mock<MsalApp[K]> } & { active: AccountInfo | null };

function fakeMsal(overrides: Partial<FakeMsal> = {}): FakeMsal {
  const state: { active: AccountInfo | null } = { active: null };
  return Object.assign(state, {
    initialize: vi.fn<MsalApp['initialize']>(async () => {}),
    handleRedirectPromise: vi.fn<MsalApp['handleRedirectPromise']>(async () => null),
    getActiveAccount: vi.fn<MsalApp['getActiveAccount']>(() => state.active),
    setActiveAccount: vi.fn<MsalApp['setActiveAccount']>((a) => {
      state.active = a;
    }),
    getAllAccounts: vi.fn<MsalApp['getAllAccounts']>(() => []),
    loginRedirect: vi.fn<MsalApp['loginRedirect']>(async () => {}),
    logoutRedirect: vi.fn<MsalApp['logoutRedirect']>(async () => {}),
    acquireTokenSilent: vi.fn<MsalApp['acquireTokenSilent']>(async () => ({ accessToken: 'api-token' }) as AuthenticationResult),
    acquireTokenRedirect: vi.fn<MsalApp['acquireTokenRedirect']>(async () => {}),
    ...overrides,
  });
}

describe('msalConfiguration', () => {
  it('signs in work and school accounts of any tenant and keeps the token cache in sessionStorage', () => {
    const configuration = msalConfiguration(config);
    expect(configuration.auth).toEqual({
      clientId: config.clientId,
      authority: 'https://login.microsoftonline.com/organizations',
      redirectUri: config.redirectUri,
      postLogoutRedirectUri: config.redirectUri,
    });
    expect(configuration.cache?.cacheLocation).toBe('sessionStorage');
  });
});

describe('SIGN_IN_SCOPES', () => {
  it('are exactly the delegated scopes the app registration requests', () => {
    expect([...SIGN_IN_SCOPES].sort()).toEqual(
      ['DeviceManagementConfiguration.Read.All', 'ThreatHunting.Read.All', 'User.Read', 'email', 'openid', 'profile'].sort(),
    );
  });
});

describe('userRecordScope', () => {
  it("is the app registration's own User record scope", () => {
    expect(userRecordScope(config.clientId)).toBe(apiScope);
  });
});

describe('createMsalAuthClient', () => {
  it('returns the User who just signed in and makes them the active account', async () => {
    const ada = account('Ada');
    const msal = fakeMsal({
      handleRedirectPromise: vi.fn<MsalApp['handleRedirectPromise']>(async () => ({ account: ada }) as AuthenticationResult),
    });
    const client = createMsalAuthClient(msal, apiScope);
    await expect(client.start()).resolves.toEqual({ name: 'Ada', username: 'Ada@contoso.com', homeTenantId });
    expect(msal.initialize).toHaveBeenCalledBefore(msal.handleRedirectPromise);
    expect(msal.setActiveAccount).toHaveBeenCalledWith(ada);
  });

  it('returns the User already signed in in this browser tab', async () => {
    const msal = fakeMsal({ getAllAccounts: vi.fn<MsalApp['getAllAccounts']>(() => [account('Grace')]) });
    await expect(createMsalAuthClient(msal, apiScope).start()).resolves.toMatchObject({ name: 'Grace' });
  });

  it('returns null when nobody is signed in', async () => {
    await expect(createMsalAuthClient(fakeMsal(), apiScope).start()).resolves.toBeNull();
  });

  it('starts MSAL only once, also when asked twice', async () => {
    const msal = fakeMsal();
    const client = createMsalAuthClient(msal, apiScope);
    await Promise.all([client.start(), client.start()]);
    expect(msal.initialize).toHaveBeenCalledTimes(1);
    expect(msal.handleRedirectPromise).toHaveBeenCalledTimes(1);
  });

  it('passes on the error of a failed sign-in redirect', async () => {
    const error = Object.assign(new Error('AADSTS65004'), { errorCode: 'access_denied' });
    const msal = fakeMsal({ handleRedirectPromise: vi.fn<MsalApp['handleRedirectPromise']>(async () => Promise.reject(error)) });
    await expect(createMsalAuthClient(msal, apiScope).start()).rejects.toBe(error);
  });

  it('signs in with a redirect for the sign-in scopes, letting the User pick an account', async () => {
    const msal = fakeMsal();
    await createMsalAuthClient(msal, apiScope).signIn();
    expect(msal.loginRedirect).toHaveBeenCalledWith({
      scopes: [...SIGN_IN_SCOPES],
      extraScopesToConsent: [apiScope],
      prompt: 'select_account',
    });
  });

  it('gets an access token for the User record API for the active account', async () => {
    const msal = fakeMsal({ getAllAccounts: vi.fn<MsalApp['getAllAccounts']>(() => [account('Ada')]) });
    const client = createMsalAuthClient(msal, apiScope);
    await client.start();
    await expect(client.userRecordToken()).resolves.toBe('api-token');
    expect(msal.acquireTokenSilent).toHaveBeenCalledWith({ scopes: [apiScope], account: msal.active });
  });

  it('asks the User to sign in again when the token cannot be renewed silently', async () => {
    const msal = fakeMsal({
      getAllAccounts: vi.fn<MsalApp['getAllAccounts']>(() => [account('Ada')]),
      acquireTokenSilent: vi.fn<MsalApp['acquireTokenSilent']>(async () =>
        Promise.reject(new InteractionRequiredAuthError('interaction_required', 'Sign in again.')),
      ),
    });
    const client = createMsalAuthClient(msal, apiScope);
    await client.start();
    void client.userRecordToken();
    await vi.waitFor(() => expect(msal.acquireTokenRedirect).toHaveBeenCalledWith({ scopes: [apiScope], account: msal.active }));
  });

  it('passes on other token errors', async () => {
    const msal = fakeMsal({
      getAllAccounts: vi.fn<MsalApp['getAllAccounts']>(() => [account('Ada')]),
      acquireTokenSilent: vi.fn<MsalApp['acquireTokenSilent']>(async () => Promise.reject(new Error('network'))),
    });
    const client = createMsalAuthClient(msal, apiScope);
    await client.start();
    await expect(client.userRecordToken()).rejects.toThrow('network');
  });

  it('gets an access token for Microsoft Graph with the read scopes an Analysis needs', async () => {
    const msal = fakeMsal({ getAllAccounts: vi.fn<MsalApp['getAllAccounts']>(() => [account('Ada')]) });
    const client = createMsalAuthClient(msal, apiScope);
    await client.start();
    await expect(client.graphToken()).resolves.toBe('api-token');
    expect(msal.acquireTokenSilent).toHaveBeenCalledWith({ scopes: [...GRAPH_SCOPES], account: msal.active });
    expect([...GRAPH_SCOPES].sort()).toEqual(['DeviceManagementConfiguration.Read.All', 'ThreatHunting.Read.All']);
    expect(GRAPH_SCOPES.every((scope) => SIGN_IN_SCOPES.includes(scope))).toBe(true);
  });

  it('replaces the cached Microsoft Graph token with a new one, for roles assigned since sign-in', async () => {
    const msal = fakeMsal({ getAllAccounts: vi.fn<MsalApp['getAllAccounts']>(() => [account('Ada')]) });
    const client = createMsalAuthClient(msal, apiScope);
    await client.start();
    await client.refreshGraphToken();
    expect(msal.acquireTokenSilent).toHaveBeenCalledWith({ scopes: [...GRAPH_SCOPES], account: msal.active, forceRefresh: true });
  });

  it('asks the User to sign in again when the Graph token cannot be replaced silently', async () => {
    const msal = fakeMsal({
      getAllAccounts: vi.fn<MsalApp['getAllAccounts']>(() => [account('Ada')]),
      acquireTokenSilent: vi.fn<MsalApp['acquireTokenSilent']>(async () =>
        Promise.reject(new InteractionRequiredAuthError('interaction_required', 'Sign in again.')),
      ),
    });
    const client = createMsalAuthClient(msal, apiScope);
    await client.start();
    void client.refreshGraphToken();
    await vi.waitFor(() =>
      expect(msal.acquireTokenRedirect).toHaveBeenCalledWith({ scopes: [...GRAPH_SCOPES], account: msal.active }),
    );
  });

  it('refuses to get a token when nobody is signed in', async () => {
    await expect(createMsalAuthClient(fakeMsal(), apiScope).userRecordToken()).rejects.toThrow(/signed in/);
  });

  it('signs the active account out', async () => {
    const msal = fakeMsal({ getAllAccounts: vi.fn<MsalApp['getAllAccounts']>(() => [account('Ada')]) });
    const client = createMsalAuthClient(msal, apiScope);
    await client.start();
    await client.signOut();
    expect(msal.logoutRedirect).toHaveBeenCalledWith({ account: msal.active });
  });
});
