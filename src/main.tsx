import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, type SignInSetup } from './App';
import { readAuthConfig, type AuthConfig } from './auth/config';
import { adminConsentUrl, readAdminConsentResult } from './auth/consent';
import { createAuthClient } from './auth/msalAuthClient';
import { applyTheme } from './theme';
import { ruleModesFromPolicies } from './analysis/intuneRuleModes';
import { fetchAuditEvents } from './graph/auditEvents';
import { createGraphClient } from './graph/client';
import { fetchCoverage } from './graph/coverage';
import { fetchIntunePolicies } from './graph/intunePolicies';
import { createReadinessCheck } from './onboarding/readiness';
import { createUserRecordClient } from './user-record/client';

applyTheme(document.documentElement, window.matchMedia('(prefers-color-scheme: dark)'));

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
    loadRuleOverview: async () => {
      const [policies, coverage] = await Promise.all([fetchIntunePolicies(graph), fetchCoverage(graph)]);
      return { modes: ruleModesFromPolicies(policies), coverage };
    },
    loadAuditEvents: () => fetchAuditEvents(graph),
  };
}

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <App signIn={signIn} adminConsentResult={adminConsentResult} />
  </StrictMode>,
);
