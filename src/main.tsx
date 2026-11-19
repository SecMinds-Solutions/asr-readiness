import { readOrigins, resolve, type Origins, type Place } from './places';
import { createThemeController, type ThemeController } from './theme';

/** What both halves need to render: the root element, the theme and where they are. */
export interface MountOptions {
  container: HTMLElement;
  theme: ThemeController;
  origins: Origins;
  place: Place;
}

const origins = readOrigins(import.meta.env);
const resolution = resolve(new URL(window.location.href), origins);

if (resolution.kind === 'redirect') {
  window.location.replace(resolution.url);
} else {
  const container = document.getElementById('root');
  if (!container) throw new Error('Missing #root element');
  const theme = createThemeController(document.documentElement, window.matchMedia('(prefers-color-scheme: dark)'), () => window.localStorage);
  const options: MountOptions = { container, theme, origins, place: resolution.place };
  // Each half is its own chunk: the website never loads the sign-in library, the Graph client or the
  // User record client, which only the app imports.
  const half = resolution.place.site === 'website' ? import('./website/mount') : import('./appMount');
  half.then(({ mount }) => mount(options)).catch((error: unknown) => {
    container.textContent = 'ASR Compass could not be loaded. Reload the page to try again.';
    throw error;
  });
}
