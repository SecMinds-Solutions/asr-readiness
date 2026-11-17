import { useMemo, type ReactNode } from 'react';
import { SecMinds } from './design-system';
import type { AdminConsentResult } from './auth/consent';
import type { AuthClient } from './auth/msalAuthClient';
import { useAuth } from './auth/useAuth';
import type { SignedInUser } from './auth/user';
import { ContactConsentCard, LoadingUserRecord, UserRecordFailedAlert } from './components/ContactConsent';
import {
  AccessNeededAlert,
  CheckFailedAlert,
  CheckingTenant,
  NoDevicesCard,
  NotSupportedCard,
  ReadyCard,
} from './components/Onboarding';
import type { AuditEvents } from './analysis/auditEvents';
import type { AuditPeriods } from './analysis/auditPeriods';
import { coverageFailed, type RuleOverview } from './analysis/ruleOverview';
import { verdictsFor } from './analysis/verdicts';
import { AuditEventsFailedAlert, AuditEventsView, LoadingAuditEvents } from './components/AuditEvents';
import { LoadingRuleOverview, RuleOverviewFailedAlert, RuleOverviewView } from './components/RuleOverview';
import { LoadingVerdicts, VerdictsFailedAlert, VerdictsView } from './components/Verdicts';
import type { ReadinessCheck } from './onboarding/readiness';
import { useLoad, type LoadState } from './useLoad';
import { useReadiness } from './onboarding/useReadiness';
import {
  AdminConsentResultAlert,
  CheckingSignIn,
  ConsentRequiredAlert,
  SignedInCard,
  SignInCard,
  SignInFailedAlert,
  SignInNotConfiguredAlert,
} from './components/SignIn';
import type { UserRecordClient } from './user-record/client';
import { useUserRecord } from './user-record/useUserRecord';
import './app.css';

const { Navbar, Logo, Badge, Button } = SecMinds;

/** What the app needs to sign Users in; null when this build has no app registration. */
export interface SignInSetup {
  client: AuthClient;
  adminConsentUrl: string;
  userRecord: UserRecordClient;
  /** Whether the Tenant is a Supported tenant and the User has the roles an Analysis needs. */
  checkReadiness: ReadinessCheck;
  /** Every ASR rule with its Rule mode, and its Coverage once that can be read. */
  loadRuleOverview: () => Promise<RuleOverview>;
  /** Audit events per ASR rule, application and path in the Observation window. */
  loadAuditEvents: () => Promise<AuditEvents>;
  /** Per ASR rule GUID: how long devices have reported it in Audit mode without a break. */
  loadAuditPeriods: () => Promise<AuditPeriods>;
}

/** What the app reads once the Tenant is ready for an Analysis. */
type AnalysisLoaders = Pick<SignInSetup, 'loadRuleOverview' | 'loadAuditEvents' | 'loadAuditPeriods'>;

export function App({
  signIn,
  adminConsentResult,
}: {
  signIn: SignInSetup | null;
  adminConsentResult: AdminConsentResult | null;
}) {
  return signIn ? (
    <SignInPage setup={signIn} adminConsentResult={adminConsentResult} />
  ) : (
    <Page>
      <SignInNotConfiguredAlert />
    </Page>
  );
}

function SignInPage({ setup, adminConsentResult }: { setup: SignInSetup; adminConsentResult: AdminConsentResult | null }) {
  const { state, signIn, signOut } = useAuth(setup.client);

  const actions =
    state.status === 'signed-in' ? (
      <>
        <span className="body app-text">{state.user.name}</span>
        <Button variant="secondary" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </>
    ) : state.status === 'signed-out' || state.status === 'consent-required' || state.status === 'failed' ? (
      <Button size="sm" onClick={signIn}>
        Sign in
      </Button>
    ) : null;

  return (
    <Page actions={actions}>
      {adminConsentResult && <AdminConsentResultAlert result={adminConsentResult} />}
      {state.status === 'starting' && <CheckingSignIn />}
      {(state.status === 'signed-out' || state.status === 'redirecting') && (
        <SignInCard onSignIn={signIn} redirecting={state.status === 'redirecting'} adminConsentUrl={setup.adminConsentUrl} />
      )}
      {state.status === 'consent-required' && <ConsentRequiredAlert adminConsentUrl={setup.adminConsentUrl} />}
      {state.status === 'failed' && <SignInFailedAlert message={state.message} onRetry={signIn} />}
      {state.status === 'signed-in' && <SignedIn
          user={state.user}
          userRecord={setup.userRecord}
          checkReadiness={setup.checkReadiness}
          loaders={setup}
        />}
    </Page>
  );
}

/** A new User makes their Contact consent choice before anything else; a returning User is not asked again. */
function SignedIn({
  user,
  userRecord,
  checkReadiness,
  loaders,
}: {
  user: SignedInUser;
  userRecord: UserRecordClient;
  checkReadiness: ReadinessCheck;
  loaders: AnalysisLoaders;
}) {
  const { state, retry, saveContactConsent } = useUserRecord(userRecord);
  switch (state.status) {
    case 'loading':
      return <LoadingUserRecord />;
    case 'failed':
      return <UserRecordFailedAlert message={state.message} onRetry={retry} />;
    case 'choice-needed':
      return <ContactConsentCard onContinue={saveContactConsent} saving={state.saving} error={state.error} />;
    case 'known':
      return (
        <>
          <SignedInCard user={user} />
          <OnboardingCheck checkReadiness={checkReadiness} loaders={loaders} />
        </>
      );
  }
}

/** After the Contact consent choice: is this a Supported tenant, and may this User run an Analysis? */
function OnboardingCheck({ checkReadiness, loaders }: { checkReadiness: ReadinessCheck; loaders: AnalysisLoaders }) {
  const { state, checkAgain } = useReadiness(checkReadiness);
  switch (state.status) {
    case 'checking':
      return <CheckingTenant />;
    case 'ready':
      return (
        <>
          <ReadyCard devices={state.devices} />
          <AnalysisSections loaders={loaders} />
        </>
      );
    case 'no-devices':
      return <NoDevicesCard onCheckAgain={checkAgain} />;
    case 'not-supported':
      return <NotSupportedCard details={state.details} />;
    case 'access-needed':
      return (
        <AccessNeededAlert
          advancedHunting={state.advancedHunting}
          intune={state.intune}
          details={state.details}
          onCheckAgain={checkAgain}
        />
      );
    case 'failed':
      return <CheckFailedAlert message={state.message} onRetry={checkAgain} />;
  }
}

type Loaded<T> = { state: LoadState<T>; reload: () => void };

/** Each part of the Analysis is read once; the Verdicts combine them, the other sections show them. */
function AnalysisSections({ loaders }: { loaders: AnalysisLoaders }) {
  const overview = useLoad(loaders.loadRuleOverview);
  const events = useLoad(loaders.loadAuditEvents);
  const periods = useLoad(loaders.loadAuditPeriods);
  return (
    <>
      <VerdictsSection overview={overview} events={events} periods={periods} />
      <RuleOverviewSection {...overview} />
      <AuditEventsSection {...events} />
    </>
  );
}

function VerdictsSection({
  overview,
  events,
  periods,
}: {
  overview: Loaded<RuleOverview>;
  events: Loaded<AuditEvents>;
  periods: Loaded<AuditPeriods>;
}) {
  const assessments = useMemo(() => {
    if (overview.state.status !== 'loaded' || events.state.status !== 'loaded' || periods.state.status !== 'loaded') return null;
    const { modes, coverage } = overview.state.value;
    if (coverageFailed(coverage)) return null;
    return verdictsFor({ modes, coverage, auditEvents: events.state.value, auditPeriods: periods.state.value });
  }, [overview.state, events.state, periods.state]);

  // A Verdict without Coverage would be No evidence for every rule, so a failed Coverage query is a failed part.
  const failed = [
    { name: 'the ASR rules', ...overview },
    { name: 'the Audit events', ...events },
    { name: 'how long rules have been in Audit mode', ...periods },
  ].flatMap(({ name, state, reload }) => (state.status === 'failed' ? [{ message: `${name}: ${state.message}`, reload }] : []));
  if (overview.state.status === 'loaded' && coverageFailed(overview.state.value.coverage)) {
    failed.push({ message: `Coverage: ${overview.state.value.coverage.failed}`, reload: overview.reload });
  }
  if (failed.length > 0) {
    return (
      <VerdictsFailedAlert
        message={`A Verdict needs every part of the Analysis, and these could not be read. ${failed.map((part) => part.message).join(' ')}`}
        onRetry={() => failed.forEach((part) => part.reload())}
      />
    );
  }
  return assessments ? <VerdictsView assessments={assessments} /> : <LoadingVerdicts />;
}

function RuleOverviewSection({ state, reload }: Loaded<RuleOverview>) {
  switch (state.status) {
    case 'loading':
      return <LoadingRuleOverview />;
    case 'failed':
      return <RuleOverviewFailedAlert message={state.message} onRetry={reload} />;
    case 'loaded':
      return <RuleOverviewView overview={state.value} onRetry={reload} />;
  }
}

function AuditEventsSection({ state, reload }: Loaded<AuditEvents>) {
  switch (state.status) {
    case 'loading':
      return <LoadingAuditEvents />;
    case 'failed':
      return <AuditEventsFailedAlert message={state.message} onRetry={reload} />;
    case 'loaded':
      return <AuditEventsView events={state.value} />;
  }
}

function Page({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="sm-root app">
      <Navbar brand={<Logo height={32} />} actions={actions} />
      <main className="app-main">
        <Badge tone="info">In development</Badge>
        <h1 className="h1 app-title">ASR Readiness</h1>
        <p className="body-lg app-lead">
          Move Microsoft Defender Attack Surface Reduction rules from audit to block mode, safely. Get a verdict
          for every ASR rule based on its audit events, and download a suggested Intune policy to review and
          deploy yourself. Your security data never leaves your browser.
        </p>
        {children}
      </main>
    </div>
  );
}
