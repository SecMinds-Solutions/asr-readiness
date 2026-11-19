import { useEffect, useRef, useState, type ReactNode } from 'react';
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
} from './components/Onboarding';
import type { AuditEvents } from './analysis/auditEvents';
import { coverageFailed, type RuleOverview } from './analysis/ruleOverview';
import { readVerdictFilter } from './analysis/verdictSummary';
import { OverviewView } from './components/Overview';
import { AuditEventsFailedAlert, AuditEventsView, LoadingAuditEvents } from './components/AuditEvents';
import { LoadingRuleOverview, RuleOverviewFailedAlert, RuleOverviewView } from './components/RuleOverview';
import { SuggestedPolicyView } from './components/SuggestedPolicy';
import { LoadingVerdicts, VerdictsFailedAlert, VerdictsView } from './components/Verdicts';
import { AdminPage, AdminSignInNotice } from './components/Admin';
import { isAnalysisPage, Page, PAGE_HEADINGS, ShellPage } from './components/AppShell';
import {
  NoUserRecordYet,
  SettingsSignInNotice,
  SettingsView,
  UserRecordDeletedCard,
} from './components/Settings';
import { TenantStatus } from './components/TenantStatus';
import { UserMenu } from './components/UserMenu';
import type { ReadinessCheck } from './onboarding/readiness';
import { useNavigation } from './navigation';
import type { AppPage } from './places';
import { useAnalysis, useAssessments, type Analysis, type AnalysisLoaders, type Loaded } from './useAnalysis';
import { useReadiness } from './onboarding/useReadiness';
import {
  AdminConsentResultAlert,
  CheckingSignIn,
  ConsentRequiredAlert,
  SignInCard,
  SignInFailedAlert,
  SignInNotConfiguredAlert,
} from './components/SignIn';
import type { UserRecordClient } from './user-record/client';
import { useUserRecord } from './user-record/useUserRecord';
import './app.css';

const { Button, TextLink } = SecMinds;

/** What the app needs to sign Users in; null when this build has no app registration. */
export interface SignInSetup extends AnalysisLoaders {
  client: AuthClient;
  adminConsentUrl: string;
  userRecord: UserRecordClient;
  /** Whether the Tenant is a Supported tenant and the User has the roles an Analysis needs. */
  checkReadiness: ReadinessCheck;
}

export function App({
  signIn,
  adminConsentResult,
  signInRequested = false,
}: {
  signIn: SignInSetup | null;
  adminConsentResult: AdminConsentResult | null;
  /** The website's "Get started" link asked to start sign-in at once (`?sign-in`). */
  signInRequested?: boolean;
}) {
  const { place } = useNavigation();
  const page: AppPage = place.site === 'app' ? place.page : 'home';
  return signIn ? (
    <SignInPage setup={signIn} adminConsentResult={adminConsentResult} signInRequested={signInRequested} page={page} />
  ) : (
    <Page title={signedOutTitle(page)}>
      <SignInNotConfiguredAlert />
    </Page>
  );
}

/** Signed out, the home page carries the product name; other pages keep their own heading. */
const signedOutTitle = (page: AppPage) => (page === 'home' ? 'ASR Compass' : PAGE_HEADINGS[page].title);

function SignInPage({
  setup,
  adminConsentResult,
  signInRequested,
  page,
}: {
  setup: SignInSetup;
  adminConsentResult: AdminConsentResult | null;
  signInRequested: boolean;
  page: AppPage;
}) {
  const { state, signIn, signOut } = useAuth(setup.client);

  // A requested sign-in starts once, when MSAL finds nobody signed in; a signed-in User just sees the
  // app. If it fails, the card says why and the User tries again themselves.
  const pendingSignIn = useRef(signInRequested);
  useEffect(() => {
    if (state.status === 'starting') return;
    if (pendingSignIn.current && state.status === 'signed-out') signIn();
    pendingSignIn.current = false;
  }, [state.status, signIn]);

  if (state.status === 'signed-in') {
    return <SignedIn user={state.user} setup={setup} page={page} onSignOut={signOut} />;
  }

  const account =
    state.status === 'signed-out' || state.status === 'consent-required' || state.status === 'failed' ? (
      <Button size="sm" onClick={signIn}>
        Sign in
      </Button>
    ) : null;

  if (page !== 'home') {
    return (
      <Page account={account} title={signedOutTitle(page)}>
        {state.status === 'starting' ? (
          <CheckingSignIn />
        ) : state.status === 'consent-required' ? (
          <ConsentRequiredAlert adminConsentUrl={setup.adminConsentUrl} />
        ) : state.status === 'failed' ? (
          <SignInFailedAlert message={state.message} onRetry={signIn} />
        ) : page === 'settings' ? (
          <SettingsSignInNotice />
        ) : page === 'admin' || page === 'admin-users' ? (
          <AdminSignInNotice />
        ) : (
          <AnalysisSignInNotice />
        )}
      </Page>
    );
  }

  return (
    <Page account={account} title={signedOutTitle(page)}>
      {adminConsentResult && <AdminConsentResultAlert result={adminConsentResult} />}
      {state.status === 'starting' && <CheckingSignIn />}
      {(state.status === 'signed-out' || state.status === 'redirecting') && (
        <SignInCard onSignIn={signIn} redirecting={state.status === 'redirecting'} adminConsentUrl={setup.adminConsentUrl} />
      )}
      {state.status === 'consent-required' && <ConsentRequiredAlert adminConsentUrl={setup.adminConsentUrl} />}
      {state.status === 'failed' && <SignInFailedAlert message={state.message} onRetry={signIn} />}
    </Page>
  );
}

/** On a page of the Analysis, for a User who is not signed in. */
function AnalysisSignInNotice() {
  const { href } = useNavigation();
  return (
    <p className="body app-text">
      Sign in to run an Analysis of your Tenant. <TextLink href={href({ site: 'app', page: 'home' })}>Go to the start page</TextLink>
    </p>
  );
}

/**
 * A new User makes their Contact consent choice before anything else, on a page without the sidebar;
 * a returning User is not asked again. Once deleted, nothing continues until they sign out.
 */
function SignedIn({
  user,
  setup,
  page,
  onSignOut,
}: {
  user: SignedInUser;
  setup: SignInSetup;
  page: AppPage;
  onSignOut: () => void;
}) {
  const { href } = useNavigation();
  const record = useUserRecord(setup.userRecord);
  const { state, retry, saveContactConsent } = record;
  const account = <UserMenu user={user} admin={user.admin} onSignOut={onSignOut} />;
  const title = PAGE_HEADINGS[page].title;

  if (state.status === 'deleted') {
    return (
      <Page account={account} title={title}>
        <UserRecordDeletedCard onSignOut={onSignOut} />
      </Page>
    );
  }
  // The API decides who may see the User records; anyone else gets a "not allowed" message there.
  if (state.status === 'known' || page === 'admin' || page === 'admin-users') {
    return <Workspace user={user} setup={setup} page={page} account={account} record={record} />;
  }
  switch (state.status) {
    case 'loading':
      return (
        <Page account={account} title={title}>
          <LoadingUserRecord />
        </Page>
      );
    case 'failed':
      return (
        <Page account={account} title={title}>
          <UserRecordFailedAlert message={state.message} onRetry={retry} />
        </Page>
      );
    case 'choice-needed':
      return page === 'settings' ? (
        <Page account={account} title={title}>
          <NoUserRecordYet homeHref={href({ site: 'app', page: 'home' })} />
        </Page>
      ) : (
        <Page account={account} title="Welcome to ASR Compass">
          <ContactConsentCard onContinue={saveContactConsent} saving={state.saving} error={state.error} />
        </Page>
      );
  }
}

/**
 * The signed-in app with its sidebar. The onboarding check runs once the User first opens a page of
 * the Analysis, and the Analysis is read once the Tenant is ready; both stay while the User moves
 * between pages, so a page change never reads Graph again.
 */
function Workspace({
  user,
  setup,
  page,
  account,
  record,
}: {
  user: SignedInUser;
  setup: SignInSetup;
  page: AppPage;
  account: ReactNode;
  record: ReturnType<typeof useUserRecord>;
}) {
  const [analysisOpened, setAnalysisOpened] = useState(isAnalysisPage(page));
  if (isAnalysisPage(page) && !analysisOpened) setAnalysisOpened(true);
  const readiness = useReadiness(analysisOpened ? setup.checkReadiness : null);
  const analysis = useAnalysis(readiness.state.status === 'ready' ? setup : null);

  return (
    <ShellPage account={account} page={page}>
      {page === 'admin' || page === 'admin-users' ? (
        <AdminPage client={setup.userRecord} view={page === 'admin' ? 'overview' : 'users'} />
      ) : page === 'settings' ? (
        <SettingsContent record={record} />
      ) : (
        <AnalysisContent user={user} page={page} readiness={readiness} analysis={analysis} />
      )}
    </ShellPage>
  );
}

function SettingsContent({ record }: { record: ReturnType<typeof useUserRecord> }) {
  const { href } = useNavigation();
  const { state, retry, changeContactConsent, deleteUserRecord } = record;
  switch (state.status) {
    case 'loading':
      return <LoadingUserRecord />;
    case 'failed':
      return <UserRecordFailedAlert message={state.message} onRetry={retry} />;
    case 'choice-needed':
      return <NoUserRecordYet homeHref={href({ site: 'app', page: 'home' })} />;
    case 'deleted':
      return null;
    case 'known':
      return (
        <SettingsView
          record={state.record}
          changing={state.changing}
          error={state.error}
          onChangeContactConsent={(contactConsent) => changeContactConsent(state.record, contactConsent)}
          onDelete={() => deleteUserRecord(state.record)}
        />
      );
  }
}

/** A page of the Analysis: the onboarding message while the Tenant is not ready, then the Tenant status bar and the page. */
function AnalysisContent({
  user,
  page,
  readiness,
  analysis,
}: {
  user: SignedInUser;
  page: AppPage;
  readiness: ReturnType<typeof useReadiness>;
  analysis: Analysis;
}) {
  const { state, checkAgain } = readiness;
  switch (state.status) {
    case 'checking':
      return <CheckingTenant />;
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
    case 'ready': {
      const parts = [analysis.overview.state, analysis.events.state, analysis.periods.state];
      return (
        <>
          <TenantStatus
            tenantId={user.tenantId}
            devices={state.devices}
            readAt={analysis.readAt}
            reading={parts.some((part) => part.status === 'loading')}
            onReadAgain={analysis.readAgain}
          />
          <AnalysisPage page={page} analysis={analysis} />
        </>
      );
    }
  }
}

function AnalysisPage({ page, analysis }: { page: AppPage; analysis: Analysis }) {
  switch (page) {
    case 'verdicts':
      return <VerdictsSection analysis={analysis} />;
    case 'policy':
      return <SuggestedPolicySection analysis={analysis} />;
    case 'rules':
      return <RuleOverviewSection {...analysis.overview} />;
    case 'events':
      return <AuditEventsSection {...analysis.events} />;
    default:
      return <OverviewSection analysis={analysis} />;
  }
}

/** The Analysis at a glance; it needs the Verdicts, so it waits for every part. */
function OverviewSection({ analysis }: { analysis: Analysis }) {
  const verdicts = useAssessments(analysis);
  const { overview } = analysis;
  switch (verdicts.status) {
    case 'loading':
      return <LoadingVerdicts />;
    case 'failed':
      return <VerdictsFailedAlert message={verdicts.message} onRetry={verdicts.retry} />;
    case 'ready': {
      // Verdicts are ready only when Coverage was read, so the reporting devices are known.
      const coverage = overview.state.status === 'loaded' ? overview.state.value.coverage : null;
      const devices = coverage && !coverageFailed(coverage) ? coverage.devices : 0;
      return <OverviewView assessments={verdicts.assessments} devices={devices} />;
    }
  }
}

function VerdictsSection({ analysis }: { analysis: Analysis }) {
  const verdicts = useAssessments(analysis);
  const { search } = useNavigation();
  switch (verdicts.status) {
    case 'loading':
      return <LoadingVerdicts />;
    case 'failed':
      return <VerdictsFailedAlert message={verdicts.message} onRetry={verdicts.retry} />;
    case 'ready':
      return <VerdictsView assessments={verdicts.assessments} filter={readVerdictFilter(search)} />;
  }
}

function SuggestedPolicySection({ analysis }: { analysis: Analysis }) {
  const verdicts = useAssessments(analysis);
  switch (verdicts.status) {
    case 'loading':
      return <LoadingVerdicts />;
    case 'failed':
      return <VerdictsFailedAlert message={verdicts.message} onRetry={verdicts.retry} />;
    case 'ready':
      return <SuggestedPolicyView assessments={verdicts.assessments} />;
  }
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
