import { useCallback } from 'react';
import { SecMinds } from '../design-system';
import type { UserRecord, UserRecordClient } from '../user-record/client';
import { useLoad } from '../useLoad';

const { Alert, Badge, Button, Card, EmptyState, Spinner, Table } = SecMinds;

/** The date of a Contact consent choice as yyyy-mm-dd, the same for every admin. */
const dateOf = (iso: string) => iso.slice(0, 10);

const orDash = (value: string) => value || '–';

function ContactConsentCell({ user }: { user: UserRecord }) {
  return (
    <>
      <Badge tone={user.contactConsent ? 'success' : 'neutral'}>{user.contactConsent ? 'Given' : 'Not given'}</Badge>{' '}
      {dateOf(user.contactConsentDate)}
    </>
  );
}

/** Every User record, for SecMinds admins. Read-only: the API refuses everyone else. */
export function AdminPage({ client }: { client: UserRecordClient }) {
  const load = useCallback(() => client.listUserRecords(), [client]);
  const { state, reload } = useLoad(load);

  switch (state.status) {
    case 'loading':
      return (
        <div className="app-row">
          <Spinner label="Loading the User records" />
          <p className="body app-text">Loading the User records…</p>
        </div>
      );
    case 'failed':
      return (
        <Alert tone="danger" title="The User records could not be read">
          {state.message}{' '}
          <Button variant="secondary" size="sm" onClick={reload}>
            Try again
          </Button>
        </Alert>
      );
    case 'loaded':
      if (state.value.status === 'not-allowed') {
        return (
          <Alert tone="warning" title="Not allowed">
            Only SecMinds admins can see the User records.
          </Alert>
        );
      }
      return <UserRecordsCard users={state.value.users} />;
  }
}

function UserRecordsCard({ users }: { users: UserRecord[] }) {
  return (
    <Card title="User records">
      <p className="app-text">Every stored User record. SecMinds admins can see them here, but not change or delete them.</p>
      {users.length === 0 ? (
        <EmptyState icon="users" title="No User records yet">
          Nobody has signed in and made the Contact consent choice yet.
        </EmptyState>
      ) : (
        <Table
          caption="Every stored User record"
          columns={[
            { key: 'homeTenantId', label: 'Home tenant ID', render: (row: UserRecord) => <span className="code app-break">{row.homeTenantId}</span> },
            { key: 'username', label: 'Username', render: (row: UserRecord) => <span className="app-break">{row.username}</span> },
            { key: 'firstName', label: 'First name', render: (row: UserRecord) => orDash(row.firstName) },
            { key: 'lastName', label: 'Last name', render: (row: UserRecord) => orDash(row.lastName) },
            { key: 'email', label: 'Email address', render: (row: UserRecord) => <span className="app-break">{orDash(row.email)}</span> },
            { key: 'contactConsent', label: 'Contact consent', render: (row: UserRecord) => <ContactConsentCell user={row} /> },
          ]}
          rows={users}
        />
      )}
    </Card>
  );
}

/** For a User who is not signed in. */
export function AdminSignInNotice() {
  return (
    <Alert tone="info" title="Admin page">
      Sign in as a SecMinds admin to see the User records.
    </Alert>
  );
}
