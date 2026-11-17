import { SecMinds } from '../design-system';
import type { AuditEventGroup, AuditEvents, RuleAuditEvents } from '../analysis/auditEvents';
import { AUDIT_EVENT_GROUPS_PER_RULE } from '../analysis/queries';
import { OBSERVATION_WINDOW_DAYS } from '../analysis/thresholds';

const { Accordion, Alert, Button, Card, EmptyState, Spinner, Table } = SecMinds;

/** Per rule, only the groups with the most Audit events are shown, to keep the page fast. */
const SHOWN_GROUPS = 25;

const count = (value: number) => value.toLocaleString('en');
const orUnknown = (text: string) => text || 'Unknown';
const observationWindow = `the last ${OBSERVATION_WINDOW_DAYS} days`;

function RuleGroups({ entry }: { entry: RuleAuditEvents }) {
  const shown = entry.groups.slice(0, SHOWN_GROUPS);
  return (
    <>
      {shown.length < entry.totalGroups && (
        <p className="app-text app-hint">
          Showing {count(shown.length)} of {count(entry.totalGroups)} applications and paths, those with the most Audit events.
        </p>
      )}
      <Table
        caption={`Audit events of ${entry.rule.name} per application and path`}
        columns={[
          {
            key: 'application',
            label: 'Application',
            render: (group: AuditEventGroup) => (
              <>
                <span className="app-break">{orUnknown(group.application)}</span>
                {group.applicationFolder && <span className="app-hint app-block app-break">{group.applicationFolder}</span>}
              </>
            ),
          },
          { key: 'path', label: 'Path', render: (group: AuditEventGroup) => <span className="app-break">{orUnknown(group.path)}</span> },
          { key: 'events', label: 'Audit events', align: 'right', render: (group: AuditEventGroup) => count(group.events) },
          { key: 'devices', label: 'Devices', align: 'right', render: (group: AuditEventGroup) => count(group.devices) },
        ]}
        rows={shown}
      />
    </>
  );
}

/** Every ASR rule with its Audit events in the Observation window, per application and path. */
export function AuditEventsView({ events: { rules, notInAdvancedHunting } }: { events: AuditEvents }) {
  const withEvents = rules.filter((entry) => entry.events > 0);
  const incomplete = rules.filter((entry) => !entry.complete);
  return (
    <Card title="Audit events">
      <p className="app-text">
        Audit events in {observationWindow}, per ASR rule, application and path. Advanced hunting counts them; the events themselves are
        not downloaded, and nothing leaves your browser.
      </p>
      {incomplete.length > 0 && (
        <Alert tone="warning" title="Not every application and path was returned">
          For {incomplete.map((entry) => entry.rule.name).join(', ')}, the applications and paths shown do not account for every
          Audit event. Either the rule has more than {count(AUDIT_EVENT_GROUPS_PER_RULE)} of them and advanced hunting returned
          the ones with the most Audit events, or new Audit events arrived while they were counted. Try again for an
          up-to-date count.
        </Alert>
      )}
      <Table
        caption={`Audit events per ASR rule in ${observationWindow}`}
        columns={[
          { key: 'name', label: 'ASR rule', render: (entry: RuleAuditEvents) => entry.rule.name },
          { key: 'events', label: 'Audit events', align: 'right', render: (entry: RuleAuditEvents) => (entry.events > 0 ? count(entry.events) : 'None') },
          { key: 'groups', label: 'Applications and paths', align: 'right', render: (entry: RuleAuditEvents) => count(entry.totalGroups) },
        ]}
        rows={rules}
      />
      {withEvents.length === 0 ? (
        <EmptyState icon="check" title={`No Audit events in ${observationWindow}`}>
          No ASR rule recorded an Audit event on any device.
        </EmptyState>
      ) : (
        <Accordion
          items={withEvents.map((entry) => ({
            title: `${entry.rule.name}: ${count(entry.events)} Audit ${entry.events === 1 ? 'event' : 'events'}`,
            content: <RuleGroups entry={entry} />,
          }))}
        />
      )}
      {notInAdvancedHunting.length > 0 && (
        <p className="app-text app-hint">
          Advanced hunting records no Audit events for {notInAdvancedHunting.map((rule) => rule.name).join(', ')}, so they are
          not counted.
        </p>
      )}
    </Card>
  );
}

export function LoadingAuditEvents() {
  return (
    <div className="app-row">
      <Spinner label="Reading Audit events" />
      <p className="body app-text">Counting Audit events in advanced hunting…</p>
    </div>
  );
}

export function AuditEventsFailedAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert tone="danger" title="The Audit events could not be read">
      <p className="app-text">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </Alert>
  );
}
