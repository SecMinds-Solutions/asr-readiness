export type Theme = 'light' | 'dark';

/**
 * Where the User's theme choice is kept in their browser: a preference, never security data. The key
 * keeps the app's former name, so a choice made before the rename to ASR Compass still applies.
 */
export const THEME_STORAGE_KEY = 'asr-readiness-theme';

/** The part of `localStorage` the theme uses. */
export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The design system theme for the user's system preference. */
export function themeFor(prefersDark: boolean): Theme {
  return prefersDark ? 'dark' : 'light';
}

interface ColorSchemeQuery {
  matches: boolean;
  addEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
  removeEventListener(type: 'change', listener: (event: { matches: boolean }) => void): void;
}

export interface ThemeController {
  theme(): Theme;
  /** The User's choice: applied at once, remembered when the browser allows it. */
  choose(theme: Theme): void;
  /** Called whenever the theme changes; returns the function that unsubscribes. */
  subscribe(listener: () => void): () => void;
  /** Stops following the system setting. */
  stop(): void;
}

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

/**
 * Sets `data-theme` on `root`. Without a remembered choice it follows the system color scheme and
 * keeps following it; once the User chooses, that choice wins, also on later visits. Browser
 * storage may be missing or throw (private windows, blocked site data); the choice then lasts for
 * the visit only.
 */
export function createThemeController(root: HTMLElement, query: ColorSchemeQuery, storage: () => ThemeStorage): ThemeController {
  const listeners = new Set<() => void>();
  let chosen: Theme | null = null;
  try {
    const stored = storage().getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) chosen = stored;
  } catch {
    // No browser storage: follow the system until the User chooses.
  }

  let current: Theme = chosen ?? themeFor(query.matches);
  const apply = (theme: Theme) => {
    current = theme;
    root.dataset.theme = theme;
    listeners.forEach((listener) => listener());
  };
  root.dataset.theme = current;

  const onSystemChange = (event: { matches: boolean }) => {
    if (chosen === null) apply(themeFor(event.matches));
  };
  query.addEventListener('change', onSystemChange);

  return {
    theme: () => current,
    choose(theme) {
      chosen = theme;
      try {
        storage().setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Not remembered, but still applied for this visit.
      }
      apply(theme);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    stop: () => query.removeEventListener('change', onSystemChange),
  };
}
