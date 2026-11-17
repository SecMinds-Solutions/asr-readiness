import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { readAuthConfig } from './auth/config';
import { adminConsentUrl, readAdminConsentResult } from './auth/consent';
import { createAuthClient } from './auth/msalAuthClient';
import { applyTheme } from './theme';

applyTheme(document.documentElement, window.matchMedia('(prefers-color-scheme: dark)'));

// The admin consent page returns here with its outcome in the query string. Read it, then
// remove it from the address bar so a reload does not show it again.
const adminConsentResult = readAdminConsentResult(window.location.search);
if (adminConsentResult) window.history.replaceState(null, '', window.location.pathname);

const authConfig = readAuthConfig(import.meta.env, window.location.origin);
const signIn = authConfig && {
  client: createAuthClient(authConfig),
  adminConsentUrl: adminConsentUrl(authConfig),
};

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <App signIn={signIn} adminConsentResult={adminConsentResult} />
  </StrictMode>,
);
