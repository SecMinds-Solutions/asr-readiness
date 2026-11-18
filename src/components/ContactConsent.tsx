import { useState } from 'react';
import { SecMinds } from '../design-system';

const { Alert, Button, Card, Checkbox, Spinner } = SecMinds;

export function LoadingUserRecord() {
  return (
    <div className="app-row">
      <Spinner label="Loading your User record" />
      <p className="body app-text">Loading your User record…</p>
    </div>
  );
}

export function UserRecordFailedAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert tone="danger" title="Your User record could not be loaded">
      <p className="app-text">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </Alert>
  );
}

/** The Contact consent choice a new User makes before anything else. Unticked by default. */
export function ContactConsentCard({
  onContinue,
  saving,
  error,
}: {
  onContinue: (contactConsent: boolean) => void;
  saving: boolean;
  error?: string;
}) {
  const [contactConsent, setContactConsent] = useState(false);
  return (
    <Card
      title="Before you start"
      footer={
        <Button onClick={() => onContinue(contactConsent)} loading={saving}>
          Continue
        </Button>
      }
    >
      <p className="app-text">
        ASR Compas stores your Home tenant, username, first and last name, email address and the choice below,
        with its date. Nothing about your Tenant&apos;s security data is stored.
      </p>
      <Checkbox
        label="SecMinds may email me about its other products."
        checked={contactConsent}
        onChange={(event) => setContactConsent(event.target.checked)}
        disabled={saving}
      />
      <p className="app-text app-hint">Without this, SecMinds only emails you about ASR Compas itself.</p>
      {error && (
        <Alert tone="danger" title="Your choice could not be saved">
          {error}
        </Alert>
      )}
    </Card>
  );
}
