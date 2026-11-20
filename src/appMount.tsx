import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, type SignInSetup } from './App';
import { readAuthConfig, type AuthConfig } from './auth/config';
import { adminConsentUrl, readAdminConsentResult } from './auth/consent';
import { createAuthClient } from './auth/msalAuthClient';
import { ThemeContext } from './components/ThemeToggle';
import { fetchAuditEvents } from './graph/auditEvents';
import { createGraphClient } from './graph/client';
import { fetchPolicyChanges } from './graph/policyChanges';
import { fetchRuleOverview } from './graph/ruleOverview';
import type { MountOptions } from './main';
import { NavigationProvider } from './navigation';
import { hostsFor, takeSignInRequest, urlFor } from './places';
import { createReadinessCheck } from './onboarding/readiness';
import { createUserRecordClient } from './user-record/client';

function signInSetup(config: AuthConfig): SignInSetup {
  const client = createAuthClient(config);
  const graph = createGraphClient(() => client.graphToken());
  return {
    client,
    adminConsentUrl: adminConsentUrl(config),
    userRecord: createUserRecordClient(() => client.userRecordToken()),
    checkReadiness: createReadinessCheck(graph, () => client.refreshGraphToken()),
    loadRuleOverview: () => fetchRuleOverview(graph),
    loadAuditEvents: () => fetchAuditEvents(graph),
    loadPolicyChanges: () => fetchPolicyChanges(graph, new Date()),
  };
}

/** Starts the app: sign-in, the User record and the Analysis. */
export function mount({ container, theme, origins, place }: MountOptions) {
  // The admin consent page returns here with its outcome in the query string. Read it, then remove
  // it from the address bar so a reload does not show it again. Locally it returns to the root, where
  // the website is, so the address becomes the app's own.
  const adminConsentResult = readAdminConsentResult(window.location.search);
  if (adminConsentResult) window.history.replaceState(null, '', urlFor(place, hostsFor(origins, window.location.origin)));

  // The website's "Get started" link asks for sign-in at once. The request leaves the address bar
  // before sign-in starts, so a return from Microsoft, a reload or Back never asks again.
  const signInRequest = takeSignInRequest(new URL(window.location.href));
  if (signInRequest.requested) window.history.replaceState(null, '', signInRequest.url);

  // The redirect URI is the root of the page's own origin: the app origin, the default hostname or localhost.
  const authConfig = readAuthConfig(import.meta.env, window.location.origin);
  const signIn = authConfig ? signInSetup(authConfig) : null;

  createRoot(container).render(
    <StrictMode>
      <ThemeContext.Provider value={theme}>
        <NavigationProvider origins={origins} initial={place}>
          <App signIn={signIn} adminConsentResult={adminConsentResult} signInRequested={signInRequest.requested} />
        </NavigationProvider>
      </ThemeContext.Provider>
    </StrictMode>,
  );
}
