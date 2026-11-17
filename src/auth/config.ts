/** Signs in work and school accounts of any tenant; the app registration is multi-tenant. */
export const ORGANIZATIONS_AUTHORITY = 'https://login.microsoftonline.com/organizations';

/** What MSAL needs to sign a User in to the app registration. */
export interface AuthConfig {
  clientId: string;
  redirectUri: string;
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads the app registration's client ID from the build environment (`VITE_ENTRA_CLIENT_ID`).
 * The redirect URI is the root of the page's own origin. Returns null when sign-in is not
 * configured, so the app can say so instead of failing at sign-in.
 */
export function readAuthConfig(env: { VITE_ENTRA_CLIENT_ID?: string }, origin: string): AuthConfig | null {
  const clientId = env.VITE_ENTRA_CLIENT_ID?.trim() ?? '';
  if (!GUID.test(clientId)) return null;
  return { clientId, redirectUri: new URL('/', origin).toString() };
}
