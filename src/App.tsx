import type { ReactNode } from 'react';
import { SecMinds } from './design-system';
import type { AdminConsentResult } from './auth/consent';
import type { AuthClient } from './auth/msalAuthClient';
import { useAuth } from './auth/useAuth';
import type { SignedInUser } from './auth/user';
import { ContactConsentCard, LoadingUserRecord, UserRecordFailedAlert } from './components/ContactConsent';
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
}

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
      {state.status === 'signed-in' && <SignedIn user={state.user} userRecord={setup.userRecord} />}
    </Page>
  );
}

/** A new User makes their Contact consent choice before anything else; a returning User is not asked again. */
function SignedIn({ user, userRecord }: { user: SignedInUser; userRecord: UserRecordClient }) {
  const { state, retry, saveContactConsent } = useUserRecord(userRecord);
  switch (state.status) {
    case 'loading':
      return <LoadingUserRecord />;
    case 'failed':
      return <UserRecordFailedAlert message={state.message} onRetry={retry} />;
    case 'choice-needed':
      return <ContactConsentCard onContinue={saveContactConsent} saving={state.saving} error={state.error} />;
    case 'known':
      return <SignedInCard user={user} />;
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
