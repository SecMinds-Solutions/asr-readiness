import { useRef, useState, type KeyboardEvent } from 'react';
import { SecMinds } from '../design-system';
import type { UserRecord } from '../user-record/client';
import type { UserRecordChange } from '../user-record/useUserRecord';
import { HOME_HREF } from '../route';

const { Alert, Badge, Button, Card, Dialog, TextLink } = SecMinds;

/** What ASR Readiness stores about a User, why, where, and how they see, change or delete it. */
export function PrivacyNotice() {
  return (
    <Card title="Privacy notice">
      <h4 className="h4">What is stored about you</h4>
      <p className="app-text">
        When you sign in for the first time, ASR Readiness stores a User record with exactly these fields, and nothing else:
      </p>
      <ul className="app-list">
        <li>your Home tenant ID: the ID of the Entra tenant your account belongs to;</li>
        <li>your username, first name, last name and email address;</li>
        <li>your Contact consent: whether SecMinds may email you about its other products, with the date of that choice.</li>
      </ul>
      <p className="app-text">
        Everything except the Contact consent comes from your Microsoft sign-in, not from anything you type. You make the
        Contact consent choice after your first sign-in, with the box unticked.
      </p>

      <h4 className="h4">What is never stored</h4>
      <p className="app-text">
        An Analysis runs in your browser. Your Tenant&apos;s security data, such as Audit events, paths, device names, policies
        and Verdicts, is never sent to SecMinds and never stored, and neither is which Tenants you analyse. Your sign-in tokens
        stay in your browser tab and are gone when you close it. ASR Readiness uses no analytics or trackers.
      </p>

      <h4 className="h4">Why</h4>
      <ul className="app-list">
        <li>To know who uses ASR Readiness, and to email you about ASR Readiness itself.</li>
        <li>Only with your Contact consent: to email you about SecMinds&apos; other products.</li>
      </ul>

      <h4 className="h4">Who can see it</h4>
      <p className="app-text">
        A small number of SecMinds admins can see every User record. They cannot change or delete your record. Nobody else at SecMinds has access through
        the app.
      </p>

      <h4 className="h4">Where and for how long</h4>
      <p className="app-text">
        The User record is stored in Azure Table Storage in Microsoft&apos;s West Europe region, in the European Union. It is kept
        until you delete it.
      </p>

      <h4 className="h4">Your rights</h4>
      <p className="app-text">Sign in and open this page to:</p>
      <ul className="app-list">
        <li>see your stored User record;</li>
        <li>withdraw your Contact consent, or give it later; your new choice is stored with its date;</li>
        <li>delete your User record; it is removed from storage at once, and nothing about you remains.</li>
      </ul>
      <TextLink href={HOME_HREF}>Back to ASR Readiness</TextLink>
    </Card>
  );
}

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
      <p className="app-text">This is everything ASR Readiness stores about you.</p>
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

/** For a User who is not signed in, or has no record yet, on the privacy notice page. */
export function NoUserRecordNotice({ signedIn }: { signedIn: boolean }) {
  return (
    <Alert tone="info" title="Your User record">
      {signedIn
        ? 'Nothing is stored about you yet: your User record is stored once you make the Contact consent choice.'
        : 'Sign in to see, change or delete your User record.'}
    </Alert>
  );
}
