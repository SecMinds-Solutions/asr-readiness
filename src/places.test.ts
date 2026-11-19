import { hostsFor, readOrigins, resolve, signInUrl, takeSignInRequest, urlFor, type Origins } from './places';

const origins: Origins = { site: 'https://asrcompass.cloud', app: 'https://app.asrcompass.cloud' };
const at = (url: string) => resolve(new URL(url), origins);
const show = (site: 'website' | 'app', page: string) => ({ kind: 'show', place: { site, page } });
const redirect = (url: string) => ({ kind: 'redirect', url });

describe('resolve: the website host', () => {
  it('shows the home page and the privacy notice', () => {
    expect(at('https://asrcompass.cloud/')).toEqual(show('website', 'home'));
    expect(at('https://asrcompass.cloud/privacy')).toEqual(show('website', 'privacy'));
    expect(at('https://asrcompass.cloud/privacy/')).toEqual(show('website', 'privacy'));
  });

  it('sends app pages to the app host', () => {
    expect(at('https://asrcompass.cloud/settings')).toEqual(redirect('https://app.asrcompass.cloud/settings'));
    expect(at('https://asrcompass.cloud/admin')).toEqual(redirect('https://app.asrcompass.cloud/admin'));
  });

  it('falls back to the home page for an unknown path', () => {
    expect(at('https://asrcompass.cloud/nope')).toEqual(redirect('https://asrcompass.cloud/'));
  });

  it('keeps old fragment links working', () => {
    expect(at('https://asrcompass.cloud/#privacy')).toEqual(redirect('https://asrcompass.cloud/privacy'));
    expect(at('https://asrcompass.cloud/#admin')).toEqual(redirect('https://app.asrcompass.cloud/admin'));
  });

  it('leaves section links on the home page alone', () => {
    expect(at('https://asrcompass.cloud/#faq')).toEqual(show('website', 'home'));
  });
});

describe('resolve: the app host', () => {
  it('shows the app, Settings and the admin page', () => {
    expect(at('https://app.asrcompass.cloud/')).toEqual(show('app', 'home'));
    expect(at('https://app.asrcompass.cloud/settings')).toEqual(show('app', 'settings'));
    expect(at('https://app.asrcompass.cloud/admin/')).toEqual(show('app', 'admin'));
  });

  it('sends the privacy notice to the website host', () => {
    expect(at('https://app.asrcompass.cloud/privacy')).toEqual(redirect('https://asrcompass.cloud/privacy'));
  });

  it('falls back to the app for an unknown path', () => {
    expect(at('https://app.asrcompass.cloud/nope/deeper')).toEqual(redirect('https://app.asrcompass.cloud/'));
  });

  it('keeps old fragment links working', () => {
    expect(at('https://app.asrcompass.cloud/#privacy')).toEqual(redirect('https://asrcompass.cloud/privacy'));
    expect(at('https://app.asrcompass.cloud/#admin')).toEqual(redirect('https://app.asrcompass.cloud/admin'));
  });

  it('shows the app when Microsoft returns from sign-in or admin consent', () => {
    expect(at('https://app.asrcompass.cloud/#code=abc&state=xyz')).toEqual(show('app', 'home'));
    expect(at('https://app.asrcompass.cloud/?admin_consent=True&state=admin-consent')).toEqual(show('app', 'home'));
  });
});

describe('resolve: the default Static Web Apps hostname', () => {
  const host = 'https://happy-sea-0123.westeurope.1.azurestaticapps.net';

  it('behaves as the app host, and keeps app pages on itself', () => {
    expect(at(`${host}/`)).toEqual(show('app', 'home'));
    expect(at(`${host}/settings`)).toEqual(show('app', 'settings'));
    expect(at(`${host}/#admin`)).toEqual(redirect(`${host}/admin`));
  });

  it('sends the privacy notice to the website host', () => {
    expect(at(`${host}/privacy`)).toEqual(redirect('https://asrcompass.cloud/privacy'));
  });
});

describe('resolve: localhost', () => {
  it('serves the website at / and the app under /app', () => {
    expect(at('http://localhost:5173/')).toEqual(show('website', 'home'));
    expect(at('http://localhost:5173/privacy')).toEqual(show('website', 'privacy'));
    expect(at('http://localhost:5173/app')).toEqual(show('app', 'home'));
    expect(at('http://localhost:5173/app/')).toEqual(show('app', 'home'));
    expect(at('http://localhost:5173/app/settings')).toEqual(show('app', 'settings'));
    expect(at('http://127.0.0.1:5173/app/admin')).toEqual(show('app', 'admin'));
  });

  it('redirects between the two halves', () => {
    expect(at('http://localhost:5173/settings')).toEqual(redirect('http://localhost:5173/app/settings'));
    expect(at('http://localhost:5173/app/privacy')).toEqual(redirect('http://localhost:5173/privacy'));
    expect(at('http://localhost:5173/#admin')).toEqual(redirect('http://localhost:5173/app/admin'));
    expect(at('http://localhost:5173/app/#privacy')).toEqual(redirect('http://localhost:5173/privacy'));
  });

  it('falls back to the home page of each half', () => {
    expect(at('http://localhost:5173/nope')).toEqual(redirect('http://localhost:5173/'));
    expect(at('http://localhost:5173/app/nope')).toEqual(redirect('http://localhost:5173/app/'));
    expect(at('http://localhost:5173/application')).toEqual(redirect('http://localhost:5173/'));
  });

  it('shows the app at / when Microsoft returns there from sign-in, sign-in errors or admin consent', () => {
    expect(at('http://localhost:5173/#code=abc&state=xyz')).toEqual(show('app', 'home'));
    expect(at('http://localhost:5173/#error=access_denied&state=xyz')).toEqual(show('app', 'home'));
    expect(at('http://localhost:5173/?code=abc&state=xyz')).toEqual(show('app', 'home'));
    expect(at('http://localhost:5173/?admin_consent=True&state=admin-consent')).toEqual(show('app', 'home'));
    expect(at('http://localhost:5173/?state=xyz')).toEqual(show('website', 'home'));
  });
});

describe('hostsFor and urlFor', () => {
  it('links from the website to the configured app origin', () => {
    const hosts = hostsFor(origins, 'https://asrcompass.cloud');
    expect(urlFor({ site: 'app', page: 'home' }, hosts)).toBe('https://app.asrcompass.cloud/');
    expect(urlFor({ site: 'website', page: 'privacy' }, hosts)).toBe('https://asrcompass.cloud/privacy');
  });

  it('links from the default hostname to itself for app pages', () => {
    const hosts = hostsFor(origins, 'https://x.azurestaticapps.net');
    expect(urlFor({ site: 'app', page: 'settings' }, hosts)).toBe('https://x.azurestaticapps.net/settings');
    expect(urlFor({ site: 'website', page: 'home' }, hosts)).toBe('https://asrcompass.cloud/');
  });

  it('links locally within one origin', () => {
    const hosts = hostsFor(origins, 'http://localhost:5173');
    expect(urlFor({ site: 'app', page: 'home' }, hosts)).toBe('http://localhost:5173/app/');
    expect(urlFor({ site: 'app', page: 'admin' }, hosts)).toBe('http://localhost:5173/app/admin');
    expect(urlFor({ site: 'website', page: 'home' }, hosts)).toBe('http://localhost:5173/');
  });
});

describe('readOrigins', () => {
  it('reads the site and app origins from the build environment', () => {
    expect(readOrigins({ VITE_SITE_ORIGIN: 'https://example.org/', VITE_APP_ORIGIN: ' https://app.example.org ' })).toEqual({
      site: 'https://example.org',
      app: 'https://app.example.org',
    });
  });

  it('falls back to the production origins when a value is missing or not an https origin', () => {
    expect(readOrigins({})).toEqual(origins);
    expect(readOrigins({ VITE_SITE_ORIGIN: 'http://example.org', VITE_APP_ORIGIN: 'not a url' })).toEqual(origins);
    expect(readOrigins({ VITE_SITE_ORIGIN: 'https://example.org/path' })).toEqual(origins);
  });
});

describe('signInUrl and takeSignInRequest', () => {
  it('links to the app home page with the sign-in request', () => {
    expect(signInUrl(urlFor({ site: 'app', page: 'home' }, hostsFor(origins, 'https://asrcompass.cloud')))).toBe('https://app.asrcompass.cloud/?sign-in');
    expect(signInUrl(urlFor({ site: 'app', page: 'home' }, hostsFor(origins, 'http://localhost:5173')))).toBe('http://localhost:5173/app/?sign-in');
  });

  it('takes the request from the address, keeping everything else', () => {
    expect(takeSignInRequest(new URL('https://app.asrcompass.cloud/?sign-in'))).toEqual({
      requested: true,
      url: 'https://app.asrcompass.cloud/',
    });
    expect(takeSignInRequest(new URL('http://localhost:5173/app/?sign-in&x=1#top'))).toEqual({
      requested: true,
      url: 'http://localhost:5173/app/?x=1#top',
    });
  });

  it('reports no request when the address has none', () => {
    expect(takeSignInRequest(new URL('https://app.asrcompass.cloud/settings'))).toEqual({
      requested: false,
      url: 'https://app.asrcompass.cloud/settings',
    });
  });
});
