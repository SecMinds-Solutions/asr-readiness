import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { SecMinds } from '../design-system';
import type { UserRecord } from '../user-record/client';
import type { UserRecordChange } from '../user-record/useUserRecord';
import { AppearanceChoice } from './Appearance';
import { PermissionsList } from './Permissions';

const { Alert, Button, Dialog, EmptyState, Switch, TextLink } = SecMinds;

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

/** One section of Settings: its title and what it is about on the left, its content on the right. */
function SettingsSection({
  id,
  title,
  description,
  danger = false,
  children,
}: {
  id: string;
  title: string;
  description: ReactNode;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={danger ? 'app-settings-section app-settings-danger' : 'app-settings-section'} aria-labelledby={id}>
      <div className="app-settings-intro">
        <h2 id={id} className="h4 app-settings-title">
          {title}
        </h2>
        <p className="body-sm app-settings-description">{description}</p>
      </div>
      <div className="app-settings-body">{children}</div>
    </section>
  );
}

/** The Contact consent switch: it saves at once, says so, and shows the stored choice again if saving fails. */
function ContactConsentSetting({
  record,
  saving,
  error,
  disabled,
  onChange,
}: {
  record: UserRecord;
  saving: boolean;
  error?: string;
  disabled: boolean;
  onChange: (contactConsent: boolean) => void;
}) {
  // "Saved" shows once a save ends without an error, until the next save starts. Worked out while
  // rendering, when `saving` changes, rather than in an effect.
  const [saved, setSaved] = useState(false);
  const [wasSaving, setWasSaving] = useState(saving);
  if (saving !== wasSaving) {
    setWasSaving(saving);
    setSaved(!saving && !error);
  }
  return (
    <>
      <Switch
        label="SecMinds may email me about its other products"
        checked={record.contactConsent}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <p className="body-sm app-settings-note">
        {record.contactConsent ? 'Given' : 'Not given'} {record.contactConsent ? 'since' : 'as of'} {dateText(record.contactConsentDate)}.
        Without it, you only hear from SecMinds about ASR Compass itself.
      </p>
      <p className="body-sm app-settings-status" role="status">
        {saving ? 'Saving…' : saved ? 'Saved' : ''}
      </p>
      {error && (
        <Alert tone="danger" title="Not changed">
          {error}{' '}
          <Button variant="secondary" size="sm" onClick={() => onChange(!record.contactConsent)}>
            Try again
          </Button>
        </Alert>
      )}
    </>
  );
}

/**
 * Settings for a User with a stored User record: Profile, Contact consent, Appearance, Permissions
 * and, apart at the bottom, deleting the User record.
 */
export function SettingsView({
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
  // An error belongs to the action the User took last, so it shows next to that action.
  const [lastAction, setLastAction] = useState<UserRecordChange>('contact-consent');
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
    <div className="app-settings">
      <SettingsSection id="settings-profile" title="Profile" description="Taken from your Microsoft sign-in and stored in your User record.">
        <dl className="app-details">
          <dt>First name</dt>
          <dd>{orNotGiven(record.firstName)}</dd>
          <dt>Last name</dt>
          <dd>{orNotGiven(record.lastName)}</dd>
          <dt>Username</dt>
          <dd>{record.username}</dd>
          <dt>Email address</dt>
          <dd>{orNotGiven(record.email)}</dd>
          <dt>Home tenant ID</dt>
          <dd className="code">{record.homeTenantId}</dd>
        </dl>
      </SettingsSection>

      <SettingsSection
        id="settings-contact-consent"
        title="Contact consent"
        description="Whether SecMinds may email you about its other products. Each change is stored with its date."
      >
        <ContactConsentSetting
          record={record}
          saving={changing === 'contact-consent'}
          error={lastAction === 'contact-consent' ? error : undefined}
          disabled={busy}
          onChange={(contactConsent) => {
            setLastAction('contact-consent');
            onChangeContactConsent(contactConsent);
          }}
        />
      </SettingsSection>

      <SettingsSection id="settings-appearance" title="Appearance" description="Kept in this browser only.">
        <AppearanceChoice />
      </SettingsSection>

      <SettingsSection
        id="settings-permissions"
        title="Permissions"
        description="What ASR Compass may read when you sign in, and why. Everything it reads stays in your browser."
      >
        <PermissionsList />
      </SettingsSection>

      <SettingsSection
        id="settings-delete"
        title="Delete your data"
        description="Your Analyses are never stored, so your User record is all there is to delete."
        danger
      >
        <p className="app-text">
          Deleting removes your User record from storage at once, and nothing about you remains. If you sign in again later,
          you make the Contact consent choice again.
        </p>
        {lastAction === 'delete' && error && (
          <Alert tone="danger" title="Not changed">
            {error}
          </Alert>
        )}
        <Button
          variant="danger"
          loading={changing === 'delete'}
          disabled={busy}
          onClick={() => {
            setLastAction('delete');
            openConfirmation();
          }}
        >
          Delete my User record
        </Button>
      </SettingsSection>

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
    </div>
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
