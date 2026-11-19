import { useRef, useState, type KeyboardEvent } from 'react';
import { SecMinds } from '../design-system';
import type { UserRecord } from '../user-record/client';
import type { UserRecordChange } from '../user-record/useUserRecord';

const { Alert, Badge, Button, Card, Dialog, EmptyState, TextLink } = SecMinds;

/** The date of a Contact consent choice in words, as the User's browser shows dates. */
const dateText = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const orNotGiven = (value: string) => value || 'Not in your sign-in';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab and Shift+Tab inside an open dialog: the design system's Dialog focuses itself and
 * closes on Escape, but does not contain focus.
 */
function containFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return;
  const dialog = event.currentTarget.querySelector<HTMLElement>('[role="dialog"]');
  const focusable = dialog ? [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!dialog || !first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === dialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

/** The signed-in User's stored User record, with the actions to change their Contact consent or delete it. */
export function UserRecordCard({
  record,
  changing,
  error,
  onChangeContactConsent,
  onDelete,
}: {
  record: UserRecord;
  changing?: UserRecordChange;
  error?: string;
  onChangeContactConsent: (contactConsent: boolean) => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const busy = changing !== undefined;
  const openConfirmation = () => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirming(true);
  };
  /** Closing without deleting returns focus to the button that opened the dialog. */
  const cancel = () => {
    setConfirming(false);
    // After React removes the dialog, so focus does not land on an element that is going away.
    setTimeout(() => opener.current?.focus(), 0);
  };
  return (
    <Card title="Your User record">
      <p className="app-text">This is everything ASR Compass stores about you.</p>
      <dl className="app-details">
        <dt>Home tenant ID</dt>
        <dd>{record.homeTenantId}</dd>
        <dt>Username</dt>
        <dd>{record.username}</dd>
        <dt>First name</dt>
        <dd>{orNotGiven(record.firstName)}</dd>
        <dt>Last name</dt>
        <dd>{orNotGiven(record.lastName)}</dd>
        <dt>Email address</dt>
        <dd>{orNotGiven(record.email)}</dd>
        <dt>Contact consent</dt>
        <dd>
          <Badge tone={record.contactConsent ? 'success' : 'neutral'}>{record.contactConsent ? 'Given' : 'Not given'}</Badge>{' '}
          {record.contactConsent ? 'since' : 'as of'} {dateText(record.contactConsentDate)}
        </dd>
      </dl>
      {error && (
        <Alert tone="danger" title="Not changed">
          {error}
        </Alert>
      )}
      <div className="app-row">
        {record.contactConsent ? (
          <Button variant="secondary" loading={changing === 'contact-consent'} disabled={busy} onClick={() => onChangeContactConsent(false)}>
            Withdraw Contact consent
          </Button>
        ) : (
          <Button variant="secondary" loading={changing === 'contact-consent'} disabled={busy} onClick={() => onChangeContactConsent(true)}>
            Give Contact consent
          </Button>
        )}
        <Button variant="danger" loading={changing === 'delete'} disabled={busy} onClick={openConfirmation}>
          Delete my User record
        </Button>
      </div>
      <div onKeyDown={containFocus}>
        <Dialog
          open={confirming}
          title="Delete your User record?"
          onClose={cancel}
          footer={
            <>
              <Button variant="secondary" onClick={cancel}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirming(false);
                  onDelete();
                }}
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="app-text">
            Your User record is removed from storage at once, and nothing about you remains. If you sign in again later, you
            make the Contact consent choice again and a new User record is stored.
          </p>
        </Dialog>
      </div>
    </Card>
  );
}

/** After deleting: nothing is stored, and the User is not taken back into the app until they sign in again. */
export function UserRecordDeletedCard({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Alert tone="success" title="Your User record is deleted">
      Nothing about you remains in storage. Sign out to finish; if you sign in again, a new User record is stored after your
      Contact consent choice.{' '}
      <Button variant="secondary" size="sm" onClick={onSignOut}>
        Sign out
      </Button>
    </Alert>
  );
}

/** On Settings, for a signed-in User who has not made the Contact consent choice yet. */
export function NoUserRecordYet({ homeHref }: { homeHref: string }) {
  return (
    <EmptyState icon="user" title="Nothing is stored about you yet" action={<TextLink href={homeHref}>Make the Contact consent choice</TextLink>}>
      Your User record is stored once you make the Contact consent choice.
    </EmptyState>
  );
}

/** On Settings, for a User who is not signed in. */
export function SettingsSignInNotice() {
  return (
    <Alert tone="info" title="Your User record">
      Sign in to see, change or delete your User record.
    </Alert>
  );
}
