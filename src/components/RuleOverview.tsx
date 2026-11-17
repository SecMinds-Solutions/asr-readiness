import { SecMinds } from '../design-system';
import type { AsrRule } from '../analysis/asrRules';
import type { AssignmentTarget, PolicyRuleMode, RuleMode, RuleState } from '../analysis/intuneRuleModes';
import type { RuleOverview } from '../analysis/ruleOverview';

const { Alert, Badge, Button, Card, Spinner, Table } = SecMinds;

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONE: Record<RuleMode, BadgeTone> = {
  'Not configured': 'neutral',
  Disabled: 'neutral',
  Audit: 'info',
  Warn: 'warning',
  Block: 'success',
};

/** Graph returns group IDs, not names; reading group names would need a scope ADR-0002 does not allow. */
function targetText(target: AssignmentTarget): string {
  switch (target.kind) {
    case 'all-devices':
      return 'All devices';
    case 'all-users':
      return 'All users';
    case 'group':
      return `group ${target.groupId}`;
    case 'other':
      return 'a target type this app does not recognise';
  }
}

const policiesText = (policies: PolicyRuleMode[]) =>
  policies.map(({ policy, mode, targets }) => `${policy}: ${mode} (${targets.map(targetText).join(', ')})`).join('; ');

function RuleModeCell({ state }: { state: RuleState }) {
  switch (state.kind) {
    case 'mode':
      return <Badge tone={TONE[state.mode]}>{state.mode}</Badge>;
    case 'conflict':
      return (
        <>
          <Badge tone="danger">Conflict</Badge>
          <span className="app-hint app-block app-break">{policiesText(state.policies)}</span>
        </>
      );
    case 'differs-by-group':
      return (
        <>
          <Badge tone="neutral">Differs by group</Badge>
          <span className="app-hint app-block app-break">{policiesText(state.policies)}</span>
          <span className="app-hint app-block">
            A Conflict only on a device that is in groups with different Rule modes, for example through nested groups.
          </span>
        </>
      );
  }
}

const devicesText = (count: number, total: number) => `${count} of ${total} ${total === 1 ? 'device' : 'devices'}`;

/** Every ASR rule with its Rule mode from Intune, and its Coverage when there is one. */
export function RuleOverviewView({ overview: { modes, coverage } }: { overview: RuleOverview }) {
  const conflicts = modes.rules.filter((row) => row.state.kind === 'conflict').length;
  const rows = modes.rules.map(({ rule, state }) => ({ rule, state }));
  return (
    <Card title="ASR rules">
      {coverage === null && (
        <Alert tone="info" title="Coverage not available">
          Coverage is not available yet: this version cannot read on how many devices each rule is in Audit mode.
        </Alert>
      )}
      {coverage !== null && coverage.devicesWithoutIntune > 0 && (
        <Alert tone="warning" title="Devices without Intune management">
          {devicesText(coverage.devicesWithoutIntune, coverage.devices)} are not managed through Intune. Their Rule modes
          come from elsewhere, such as Group Policy or Configuration Manager, and an Intune policy does not reach them.
        </Alert>
      )}
      {conflicts > 0 && (
        <Alert tone="warning" title="Conflicting Intune policies">
          {conflicts} ASR {conflicts === 1 ? 'rule has a conflict' : 'rules have a conflict'}: Intune policies assigned to the
          same group, or to All devices or All users, set different Rule modes. On a device that gets both, Intune applies
          neither until the policies agree.
        </Alert>
      )}
      {(modes.unassignedPolicies.length > 0 || modes.unrecognisedSettings.length > 0) && (
        <Alert tone="info" title="Not counted">
          {modes.unassignedPolicies.length > 0 && (
            <p className="app-text">
              Policies not assigned to any device or user (or only to excluded groups): {modes.unassignedPolicies.join(', ')}.
            </p>
          )}
          {modes.unrecognisedSettings.length > 0 && (
            <p className="app-text">
              ASR settings this version does not recognise:{' '}
              {modes.unrecognisedSettings.map(({ policy, setting }) => `${setting} (${policy})`).join(', ')}.
            </p>
          )}
        </Alert>
      )}
      <p className="app-text app-hint">
        Rule modes come from Intune settings catalog policies (Endpoint security › Attack surface reduction, and Settings
        catalog). ASR rules set by older Endpoint protection profiles, security baselines or custom OMA-URI profiles are not
        read yet, so a rule set only there shows as Not configured.
      </p>
      <Table
        caption="Rule mode from the Tenant's Intune policies; Coverage is the devices on which the rule is in Audit mode"
        columns={[
          { key: 'name', label: 'ASR rule', render: (row: { rule: AsrRule }) => row.rule.name },
          { key: 'mode', label: 'Rule mode', render: (row: { state: RuleState }) => <RuleModeCell state={row.state} /> },
          {
            key: 'coverage',
            label: 'Coverage',
            align: 'right',
            render: (row: { rule: AsrRule }) =>
              coverage === null ? 'Not available' : devicesText(coverage.auditDevices[row.rule.guid] ?? 0, coverage.devices),
          },
        ]}
        rows={rows}
      />
    </Card>
  );
}

export function LoadingRuleOverview() {
  return (
    <div className="app-row">
      <Spinner label="Reading ASR rules" />
      <p className="body app-text">Reading the Intune policies…</p>
    </div>
  );
}

export function RuleOverviewFailedAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert tone="danger" title="The ASR rules could not be read">
      <p className="app-text">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </Alert>
  );
}
