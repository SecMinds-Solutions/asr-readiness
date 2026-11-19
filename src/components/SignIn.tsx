import { SecMinds } from '../design-system';
import type { AdminConsentResult } from '../auth/consent';
import { useNavigation } from '../navigation';

const { Alert, Button, Card, Spinner, TextLink } = SecMinds;

export function CheckingSignIn() {
  return (
    <div className="app-row">
      <Spinner label="Checking sign-in" />
      <p className="body app-text">Checking sign-in…</p>
    </div>
  );
}

export function SignInCard({
  onSignIn,
  redirecting,
  adminConsentUrl,
}: {
  onSignIn: () => void;
  redirecting: boolean;
  adminConsentUrl: string;
}) {
  const { href } = useNavigation();
  return (
    <Card
      title="Sign in"
      footer={
        <Button onClick={onSignIn} loading={redirecting}>
          Sign in with Microsoft
        </Button>
      }
    >
      <p className="app-text">
        Sign in with the work or school account you use for Microsoft Defender and Intune. ASR Compass
        reads with your own permissions and changes nothing in your tenant. Your security data never leaves
        your browser.
      </p>
      <p className="app-text">
        Before the first sign-in, an admin of your tenant grants consent once for the whole tenant.
        Admins can <TextLink href={adminConsentUrl}>grant admin consent</TextLink> now.
      </p>
      <p className="app-text app-hint">
        <TextLink href={href({ site: 'website', page: 'home' })}>What is ASR Compass?</TextLink>
      </p>
    </Card>
  );
}

export function ConsentRequiredAlert({ adminConsentUrl }: { adminConsentUrl: string }) {
  return (
    <Alert tone="warning" title="Admin consent needed">
      <p className="app-text">
        Your tenant has not approved ASR Compass yet. An admin of your tenant who can grant
        tenant-wide consent for applications has to open the admin consent page once. Send them this link, or
        if you are that admin, <TextLink href={adminConsentUrl}>grant admin consent</TextLink> yourself.
      </p>
      <p className="code app-break">{adminConsentUrl}</p>
    </Alert>
  );
}

export function SignInFailedAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert tone="danger" title="Sign-in failed">
      <p className="app-text">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </Alert>
  );
}

export function AdminConsentResultAlert({ result }: { result: AdminConsentResult }) {
  if (result.outcome === 'granted') {
    return (
      <Alert tone="success" title="Admin consent granted">
        Users in your tenant can now sign in to ASR Compass.
      </Alert>
    );
  }
  return (
    <Alert tone="warning" title="Admin consent was not granted">
      <p className="app-text">{result.description}</p>
    </Alert>
  );
}

export function SignInNotConfiguredAlert() {
  return (
    <Alert tone="info" title="Sign-in is not configured">
      This build of ASR Compass has no app registration client ID, so sign-in is not available. Set
      VITE_ENTRA_CLIENT_ID when building; see .env.example.
    </Alert>
  );
}
