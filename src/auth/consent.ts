// Consent: the app's permissions need an admin of the User's tenant to grant them once.

import { ORGANIZATIONS_AUTHORITY, type AuthConfig } from './config';

/**
 * Entra error codes that mean the app has not been consented to in the tenant:
 * 65001 not consented, 65004 consent declined, 90094 admin consent required,
 * 90099 not authorised in the analysed Tenant (GDAP).
 */
const CONSENT_ERROR_CODES = ['AADSTS65001', 'AADSTS65004', 'AADSTS90094', 'AADSTS90099'];

/** Marks the admin consent page's return, which carries no other reliable marker on errors. */
const ADMIN_CONSENT_STATE = 'admin-consent';

/** Whether a sign-in error means an admin has to grant consent first. */
export function isConsentError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { errorCode, errorMessage } = error as { errorCode?: unknown; errorMessage?: unknown };
  if (errorCode === 'consent_required') return true;
  return typeof errorMessage === 'string' && CONSENT_ERROR_CODES.some((code) => errorMessage.includes(code));
}

/**
 * The Microsoft identity platform's admin consent page. An admin of any tenant signs in
 * there and grants, for their whole tenant, every permission the app registration requests:
 * with `.default` it asks for all required permissions, the app's own User record scope included.
 * It then returns to `redirectUri` with the outcome (see `readAdminConsentResult`).
 */
export function adminConsentUrl({ clientId, redirectUri }: AuthConfig): string {
  const url = new URL(`${ORGANIZATIONS_AUTHORITY}/v2.0/adminconsent`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'https://graph.microsoft.com/.default');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', ADMIN_CONSENT_STATE);
  return url.toString();
}

export type AdminConsentResult = { outcome: 'granted' } | { outcome: 'failed'; description: string };

/** Reads the outcome of the admin consent page from the query string it returned with, if any. */
export function readAdminConsentResult(search: string): AdminConsentResult | null {
  const params = new URLSearchParams(search);
  if (params.get('state') !== ADMIN_CONSENT_STATE) return null;
  const error = params.get('error');
  if (error) return { outcome: 'failed', description: params.get('error_description') || error };
  if (params.get('admin_consent') !== 'True') return { outcome: 'failed', description: 'No consent was granted.' };
  return { outcome: 'granted' };
}
