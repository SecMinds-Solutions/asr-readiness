import { useEffect, useState } from 'react';

/** The pages of the app, addressed by the URL fragment so the static host needs no routes. */
export type Route = 'home' | 'privacy';

export const PRIVACY_HREF = '#privacy';
export const HOME_HREF = '#';

/** The id of the page's main element, which takes focus when the page changes. */
export const MAIN_ID = 'main';

export const routeOf = (hash: string): Route => (hash === PRIVACY_HREF ? 'privacy' : 'home');

/**
 * The page the URL fragment names, kept up to date as the User follows links or goes back. On a
 * change, focus moves to the main content, so keyboard and screen reader users start at the new page.
 */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => routeOf(window.location.hash));
  useEffect(() => {
    const update = () => {
      setRoute(routeOf(window.location.hash));
      document.getElementById(MAIN_ID)?.focus();
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}
