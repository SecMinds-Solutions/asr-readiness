import { adminConsentUrl, isConsentError, readAdminConsentResult } from './consent';

describe('isConsentError', () => {
  it.each([
    ['consent_required', ''],
    ['invalid_grant', 'AADSTS65001: The user or administrator has not consented to use the application.'],
    ['access_denied', 'AADSTS65004: User declined to consent to access the app.'],
    ['access_denied', 'AADSTS90094: The grant requires admin permission.'],
    ['access_denied', 'AADSTS90099: The application has not been authorized in the tenant.'],
  ])('recognises %s %s as missing consent', (errorCode, errorMessage) => {
    expect(isConsentError({ errorCode, errorMessage })).toBe(true);
  });

  it('does not treat other sign-in errors as missing consent', () => {
    expect(isConsentError({ errorCode: 'invalid_request', errorMessage: 'AADSTS50011: The redirect URI does not match.' })).toBe(false);
    expect(isConsentError(new Error('network down'))).toBe(false);
    expect(isConsentError('consent_required')).toBe(false);
    expect(isConsentError(null)).toBe(false);
  });
});

describe('adminConsentUrl', () => {
  it('asks an admin of any tenant to consent to every permission the app registration requests', () => {
    const url = new URL(adminConsentUrl({ clientId: 'abc', redirectUri: 'https://asr.example.com/' }));
    expect(url.origin + url.pathname).toBe('https://login.microsoftonline.com/organizations/v2.0/adminconsent');
    expect(url.searchParams.get('client_id')).toBe('abc');
    expect(url.searchParams.get('scope')).toBe('https://graph.microsoft.com/.default');
    expect(url.searchParams.get('redirect_uri')).toBe('https://asr.example.com/');
    expect(url.searchParams.get('state')).toBe('admin-consent');
  });
});

describe('readAdminConsentResult', () => {
  it('reads a granted admin consent', () => {
    expect(readAdminConsentResult('?tenant=1234&state=admin-consent&admin_consent=True')).toEqual({ outcome: 'granted' });
  });

  it('reads a refused or failed admin consent with its description', () => {
    expect(
      readAdminConsentResult('?error=access_denied&error_description=The+admin+canceled+the+request&state=admin-consent'),
    ).toEqual({ outcome: 'failed', description: 'The admin canceled the request' });
    expect(readAdminConsentResult('?error=access_denied&state=admin-consent')).toEqual({
      outcome: 'failed',
      description: 'access_denied',
    });
  });

  it('does not count a return without admin_consent=True as granted', () => {
    expect(readAdminConsentResult('?state=admin-consent')).toEqual({ outcome: 'failed', description: 'No consent was granted.' });
  });

  it('ignores a page load that is not an admin consent response', () => {
    expect(readAdminConsentResult('')).toBeNull();
    expect(readAdminConsentResult('?foo=bar')).toBeNull();
    expect(readAdminConsentResult('?error=access_denied')).toBeNull();
    expect(readAdminConsentResult('?admin_consent=True')).toBeNull();
  });
});
