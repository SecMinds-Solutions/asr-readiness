export type Theme = 'light' | 'dark';

/** The design system theme for the user's system preference. */
export function themeFor(prefersDark: boolean): Theme {
  return prefersDark ? 'dark' : 'light';
}

interface ColorSchemeQuery {
  matches: boolean;
  addEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
  removeEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
}

/**
 * Sets `data-theme` on `root` from the system color scheme and keeps it in sync.
 * Returns a function that stops following changes.
 */
export function applyTheme(root: HTMLElement, query: ColorSchemeQuery): () => void {
  root.dataset.theme = themeFor(query.matches);
  const onChange = (event: { matches: boolean }) => {
    root.dataset.theme = themeFor(event.matches);
  };
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
