import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, type SignInSetup } from './App';
import { readAuthConfig, type AuthConfig } from './auth/config';
import { adminConsentUrl, readAdminConsentResult } from './auth/consent';
import { createAuthClient } from './auth/msalAuthClient';
import { ThemeContext } from './components/ThemeToggle';
import { createThemeController } from './theme';
import { fetchAuditEvents } from './graph/auditEvents';
import { fetchAuditPeriods } from './graph/auditPeriods';
import { createGraphClient } from './graph/client';
import { fetchRuleOverview } from './graph/ruleOverview';
import { createReadinessCheck } from './onboarding/readiness';
import { createUserRecordClient } from './user-record/client';

const theme = createThemeController(document.documentElement, window.matchMedia('(prefers-color-scheme: dark)'), () => window.localStorage);

// The admin consent page returns here with its outcome in the query string. Read it, then
// remove it from the address bar so a reload does not show it again.
const adminConsentResult = readAdminConsentResult(window.location.search);
if (adminConsentResult) window.history.replaceState(null, '', window.location.pathname);

const authConfig = readAuthConfig(import.meta.env, window.location.origin);
const signIn = authConfig ? signInSetup(authConfig) : null;

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
    loadAuditPeriods: () => fetchAuditPeriods(graph),
  };
}

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <ThemeContext.Provider value={theme}>
      <App signIn={signIn} adminConsentResult={adminConsentResult} />
    </ThemeContext.Provider>
  </StrictMode>,
);
