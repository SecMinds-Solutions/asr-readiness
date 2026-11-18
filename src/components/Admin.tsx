import { useCallback, useMemo, useState } from 'react';
import { SecMinds } from '../design-system';
import type { UserRecord, UserRecordClient } from '../user-record/client';
import { userRecordCounts, withContactConsent } from '../user-record/summary';
import { useLoad } from '../useLoad';

const { Alert, Badge, Button, Card, Checkbox, EmptyState, Spinner, Stat, Table } = SecMinds;

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

/** How many Users there are, how many gave Contact consent, and how many per Home tenant. */
function UserRecordCountsCard({ users }: { users: UserRecord[] }) {
  const counts = useMemo(() => userRecordCounts(users), [users]);
  return (
    <Card title="Users">
      <div className="app-stats">
        <Stat value={counts.total} label="Users" />
        <Stat value={counts.withContactConsent} label="With Contact consent" />
        <Stat value={counts.perHomeTenant.length} label="Home tenants" />
      </div>
      {counts.perHomeTenant.length > 0 && (
        <Table
          caption="Users per Home tenant"
          columns={[
            { key: 'homeTenantId', label: 'Home tenant ID', render: (row: { homeTenantId: string }) => <span className="code app-break">{row.homeTenantId}</span> },
            { key: 'users', label: 'Users', align: 'right' },
          ]}
          rows={counts.perHomeTenant}
        />
      )}
    </Card>
  );
}

/** The User records, optionally only those with Contact consent, with their counts above. */
function UserRecordsCard({ users }: { users: UserRecord[] }) {
  const [onlyWithConsent, setOnlyWithConsent] = useState(false);
  const shown = useMemo(() => (onlyWithConsent ? withContactConsent(users) : users), [users, onlyWithConsent]);
  return (
    <>
      <UserRecordCountsCard users={users} />
      <Card title="User records">
        <p className="app-text">Every stored User record. SecMinds admins can see them here, but not change or delete them.</p>
        <Checkbox
          label="Only Users with Contact consent"
          checked={onlyWithConsent}
          onChange={(event) => setOnlyWithConsent(event.target.checked)}
        />
        {users.length === 0 ? (
          <EmptyState icon="users" title="No User records yet">
            Nobody has signed in and made the Contact consent choice yet.
          </EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState icon="filter" title="No Users with Contact consent">
            No stored User has given Contact consent.
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
            rows={shown}
          />
        )}
      </Card>
    </>
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
