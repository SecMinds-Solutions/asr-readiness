import { useCallback, useMemo, useState } from 'react';
import { SecMinds } from '../design-system';
import type { UserRecord, UserRecordClient } from '../user-record/client';
import { USER_RECORDS_CSV_TYPE, userRecordsCsv, userRecordsCsvFileName } from '../user-record/csv';
import { userRecordCounts, withContactConsent } from '../user-record/summary';
import { useNavigation } from '../navigation';
import { useLoad } from '../useLoad';
import { saveInBrowser, type SaveFile } from './saveFile';

const { Alert, Badge, Button, Card, Checkbox, EmptyState, Spinner, Stat, Table, TextLink } = SecMinds;

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

/** Which admin page: the counts (Admin overview) or the records themselves (User records). */
export type AdminView = 'overview' | 'users';

/**
 * The User records for SecMinds admins, read-only: the API refuses everyone else. The records are
 * read once while the admin moves between Admin overview and User records, since this component
 * stays in place for both; Try again reads them again.
 */
export function AdminPage({
  client,
  view,
  saveFile = saveInBrowser,
}: {
  client: UserRecordClient;
  view: AdminView;
  saveFile?: SaveFile;
}) {
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
      return view === 'overview' ? (
        <UserRecordCountsCard users={state.value.users} />
      ) : (
        <UserRecordsCard users={state.value.users} saveFile={saveFile} />
      );
  }
}

/** How many Users there are, how many gave Contact consent, and how many per Home tenant. */
function UserRecordCountsCard({ users }: { users: UserRecord[] }) {
  const { href } = useNavigation();
  const counts = useMemo(() => userRecordCounts(users), [users]);
  return (
    <Card
      title="Users"
      footer={<TextLink href={href({ site: 'app', page: 'admin-users' })}>See every User record</TextLink>}
    >
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

/** The User records, optionally only those with Contact consent, with a CSV of the rows shown. */
function UserRecordsCard({ users, saveFile }: { users: UserRecord[]; saveFile: SaveFile }) {
  const [onlyWithConsent, setOnlyWithConsent] = useState(false);
  const shown = useMemo(() => (onlyWithConsent ? withContactConsent(users) : users), [users, onlyWithConsent]);
  return (
    <>
      <Card>
        <p className="app-text">Every stored User record. SecMinds admins can see them here, but not change or delete them.</p>
        <Checkbox
          label="Only Users with Contact consent"
          checked={onlyWithConsent}
          onChange={(event) => setOnlyWithConsent(event.target.checked)}
        />
        {shown.length > 0 && (
          <div className="app-row">
            <Button
              variant="secondary"
              icon="download"
              onClick={() => saveFile(userRecordsCsvFileName(new Date()), userRecordsCsv(shown), USER_RECORDS_CSV_TYPE)}
            >
              Download CSV
            </Button>
          </div>
        )}
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
