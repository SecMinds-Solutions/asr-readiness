import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { readAuthConfig } from '../auth/config';
import { adminConsentUrl } from '../auth/consent';
import { ThemeContext } from '../components/ThemeToggle';
import type { MountOptions } from '../main';
import { NavigationProvider } from '../navigation';
import { hostsFor } from '../places';
import { Website } from './Website';

/**
 * Starts the website. It loads no sign-in code: nothing here imports MSAL, the Graph client or the
 * User record client (see ADR-0010). The admin consent link is only a URL to Microsoft's page, built
 * from the public client ID, which returns to the app.
 */
export function mount({ container, theme, origins, place }: MountOptions) {
  const authConfig = readAuthConfig(import.meta.env, hostsFor(origins, window.location.origin).appBase);
  createRoot(container).render(
    <StrictMode>
      <ThemeContext.Provider value={theme}>
        <NavigationProvider origins={origins} initial={place}>
          <Website adminConsentUrl={authConfig ? adminConsentUrl(authConfig) : null} />
        </NavigationProvider>
      </ThemeContext.Provider>
    </StrictMode>,
  );
}
