// Which page a URL shows: the website or the app, chosen by hostname, and the page by path.
// Plain TypeScript without React, so both the website and the app can use it.

/** The origins the website and the app are served from, without a trailing slash. */
export interface Origins {
  site: string;
  app: string;
}

/** The production origins, used when the build sets none. */
export const DEFAULT_ORIGINS: Origins = { site: 'https://asrcompass.cloud', app: 'https://app.asrcompass.cloud' };

export type WebsitePage = 'home' | 'privacy';
export type AppPage = 'home' | 'settings' | 'admin';
export type Place = { site: 'website'; page: WebsitePage } | { site: 'app'; page: AppPage };
export type Resolution = { kind: 'show'; place: Place } | { kind: 'redirect'; url: string };

/** Where links to each half point from the current page: full URLs without a trailing slash. */
export interface Hosts {
  siteBase: string;
  appBase: string;
}

/** Locally the app is served under this path, so the website and the app can both be tried. */
export const LOCAL_APP_PATH = '/app';

/** The id of the page's main element, which takes focus when the page changes. */
export const MAIN_ID = 'main';

const WEBSITE_PATHS: Record<string, WebsitePage> = { '/': 'home', '/privacy': 'privacy' };
const APP_PATHS: Record<string, AppPage> = { '/': 'home', '/settings': 'settings', '/admin': 'admin' };

/** An origin given at build time; anything else than a plain https origin is ignored. */
function httpsOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Reads `VITE_SITE_ORIGIN` and `VITE_APP_ORIGIN`; each falls back to its production origin. */
export function readOrigins(env: { VITE_SITE_ORIGIN?: string; VITE_APP_ORIGIN?: string }): Origins {
  return {
    site: httpsOrigin(env.VITE_SITE_ORIGIN) ?? DEFAULT_ORIGINS.site,
    app: httpsOrigin(env.VITE_APP_ORIGIN) ?? DEFAULT_ORIGINS.app,
  };
}

type Role = 'website' | 'app' | 'local';

const hostnameOf = (origin: string) => new URL(origin).hostname;

/**
 * The website on the site origin's hostname, both halves on localhost, and the app everywhere else:
 * on the app origin and on the default `*.azurestaticapps.net` hostname, so it keeps working.
 */
function roleOf(hostname: string, origins: Origins): Role {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'local';
  if (hostname === hostnameOf(origins.site)) return 'website';
  return 'app';
}

export function hostsFor(origins: Origins, currentOrigin: string): Hosts {
  switch (roleOf(hostnameOf(currentOrigin), origins)) {
    case 'local':
      return { siteBase: currentOrigin, appBase: `${currentOrigin}${LOCAL_APP_PATH}` };
    case 'website':
      return { siteBase: currentOrigin, appBase: origins.app };
    case 'app':
      return { siteBase: origins.site, appBase: currentOrigin };
  }
}

const pathOf = (place: Place) => (place.page === 'home' ? '/' : `/${place.page}`);

export function urlFor(place: Place, hosts: Hosts): string {
  return `${place.site === 'website' ? hosts.siteBase : hosts.appBase}${pathOf(place)}`;
}

/** Without trailing slashes, except for the root. */
const normalise = (path: string) => path.replace(/\/+$/, '') || '/';

/**
 * Whether Microsoft is returning to this URL from sign-in or from the admin consent page. Locally the
 * redirect URI is the root, where the website is, so such a return is shown by the app instead.
 */
function isSignInReturn(url: URL): boolean {
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  return [fragment, url.searchParams].some(
    (params) => params.has('state') && (params.has('code') || params.has('error') || params.has('admin_consent')),
  );
}

/** The page `path` names in one half, if any. */
function placeAt(site: Place['site'], path: string): Place | null {
  if (site === 'website') {
    const page = WEBSITE_PATHS[path];
    return page ? { site, page } : null;
  }
  const page = APP_PATHS[path];
  return page ? { site, page } : null;
}

/** Pages of the other half are redirected there; unknown paths go to the home page of their half. */
function resolvePath(path: string, half: Place['site'], hosts: Hosts): Resolution {
  const own = placeAt(half, path);
  if (own) return { kind: 'show', place: own };
  const other = placeAt(half === 'website' ? 'app' : 'website', path);
  return { kind: 'redirect', url: urlFor(other ?? { site: half, page: 'home' }, hosts) };
}

/** What the page at `url` shows, or where it redirects to. */
export function resolve(url: URL, origins: Origins): Resolution {
  const hosts = hostsFor(origins, url.origin);
  // Links from before the website and the app had their own paths.
  if (url.hash === '#privacy') return { kind: 'redirect', url: urlFor({ site: 'website', page: 'privacy' }, hosts) };
  if (url.hash === '#admin') return { kind: 'redirect', url: urlFor({ site: 'app', page: 'admin' }, hosts) };

  const path = normalise(url.pathname);
  const role = roleOf(url.hostname, origins);
  if (role === 'local') {
    if (path === LOCAL_APP_PATH || path.startsWith(`${LOCAL_APP_PATH}/`)) {
      return resolvePath(normalise(path.slice(LOCAL_APP_PATH.length)), 'app', hosts);
    }
    if (path === '/' && isSignInReturn(url)) return { kind: 'show', place: { site: 'app', page: 'home' } };
    return resolvePath(path, 'website', hosts);
  }
  return resolvePath(path, role, hosts);
}
