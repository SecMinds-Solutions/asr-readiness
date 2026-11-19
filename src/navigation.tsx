import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_ORIGINS, hostsFor, MAIN_ID, resolve, urlFor, type Origins, type Place } from './places';

/** The page shown, and where links to every page point from here. */
export interface Navigation {
  place: Place;
  href: (place: Place) => string;
}

const NavigationContext = createContext<Navigation | null>(null);

function navigationAt(origin: string, origins: Origins, place: Place): Navigation {
  const hosts = hostsFor(origins, origin);
  return { place, href: (target) => urlFor(target, hosts) };
}

/**
 * The current page and its links. Without a provider, such as in a component test, the page is the
 * app's home page on the production app origin.
 */
export function useNavigation(): Navigation {
  return useContext(NavigationContext) ?? navigationAt(DEFAULT_ORIGINS.app, DEFAULT_ORIGINS, { site: 'app', page: 'home' });
}

/** Whether a click on this link should be left to the browser. */
function leftToBrowser(event: MouseEvent, link: HTMLAnchorElement): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    (link.target !== '' && link.target !== '_self') ||
    link.hasAttribute('download')
  );
}

/**
 * Keeps the page in step with the address bar. Links to another page of the same half (website or
 * app) change the page without reloading it, so the app does not sign in and read everything again;
 * links to the other half, to sections or to other sites are left to the browser. On a page
 * change, focus moves to the main content, so keyboard and screen reader users start at the new page.
 */
export function NavigationProvider({ origins, initial, children }: { origins: Origins; initial: Place; children: ReactNode }) {
  const [place, setPlace] = useState<Place>(initial);
  // A provider serves one half for its whole life: going to the other half loads the page.
  const site = initial.site;
  const shownPage = useRef(initial.page);

  useEffect(() => {
    /** Shows the page at `url` if it belongs to this half; returns false when the browser must load it. */
    const show = (url: URL): boolean => {
      const resolution = resolve(url, origins);
      if (resolution.kind !== 'show' || resolution.place.site !== site) return false;
      const next = resolution.place;
      setPlace((shown) => (shown.page === next.page ? shown : next));
      return true;
    };

    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (!link || !link.href || leftToBrowser(event, link)) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // A link to a section: the browser scrolls to it, also after loading another page for it.
      if (url.hash) return;
      const resolution = resolve(url, origins);
      if (resolution.kind !== 'show' || resolution.place.site !== site) return;
      event.preventDefault();
      window.history.pushState(null, '', url.href);
      show(url);
    };

    const onPopState = () => {
      const url = new URL(window.location.href);
      if (!show(url)) window.location.reload();
    };

    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPopState);
    };
  }, [origins, site]);

  useEffect(() => {
    if (place.page === shownPage.current) return;
    shownPage.current = place.page;
    document.getElementById(MAIN_ID)?.focus();
  }, [place]);

  const value = useMemo(() => navigationAt(window.location.origin, origins, place), [origins, place]);
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
