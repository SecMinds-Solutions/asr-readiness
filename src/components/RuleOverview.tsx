import { SecMinds } from '../design-system';
import type { BadgeProps } from '../design-system/components';
import { devicesText } from './devicesText';
import type { AsrRule } from '../analysis/asrRules';
import type { AssignmentTarget, PolicyRuleMode, RuleMode, RuleState } from '../analysis/intuneRuleModes';
import { coverageFailed, type RuleOverview } from '../analysis/ruleOverview';

const { Alert, Badge, Button, Card, Spinner, Table } = SecMinds;

type BadgeTone = NonNullable<BadgeProps['tone']>;

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

/** Every ASR rule with its Rule mode from Intune, and its Coverage when there is one. */
export function RuleOverviewView({
  overview: { modes, coverage: result },
  onRetry,
}: {
  overview: RuleOverview;
  onRetry: () => void;
}) {
  const coverage = coverageFailed(result) ? null : result;
  const conflicts = modes.rules.filter((row) => row.state.kind === 'conflict').length;
  const rows = modes.rules.map(({ rule, state }) => ({ rule, state }));
  return (
    <Card title="ASR rules">
      {coverageFailed(result) && (
        <Alert tone="warning" title="Coverage could not be read">
          <p className="app-text">
            The Rule modes from Intune are shown, but the Rule modes devices report could not be read from advanced hunting.
          </p>
          <p className="app-text code app-break">{result.failed}</p>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </Alert>
      )}
      {result === null && (
        <Alert tone="info" title="Coverage not available">
          Coverage is not available: no device reports its ASR Rule modes to advanced hunting yet.
        </Alert>
      )}
      <Alert tone="info" title="Devices without Intune management">
        Coverage counts every device that reports its Rule modes, whatever manages it. ASR Compass cannot tell which of
        them Intune manages, so it cannot show the devices without Intune management separately: its read permissions do
        not show that. On such devices an Intune policy has no effect, and their Rule modes come from elsewhere, such as
        Group Policy or Configuration Manager.
      </Alert>
      {conflicts > 0 && (
        <Alert tone="warning" title="Conflicting Intune policies">
          {conflicts} ASR {conflicts === 1 ? 'rule has a conflict' : 'rules have a conflict'}: Intune policies assigned to the
          same group, or to All devices or All users, set different Rule modes. On a device that gets both, Intune applies
          neither until the policies agree.
        </Alert>
      )}
      {(modes.unassignedPolicies.length > 0 ||
        modes.unrecognisedSettings.length > 0 ||
        (coverage?.unrecognisedRules.length ?? 0) > 0) && (
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
          {coverage && coverage.unrecognisedRules.length > 0 && (
            <p className="app-text">
              ASR rules in advanced hunting this version does not recognise: {coverage.unrecognisedRules.join(', ')}.
            </p>
          )}
        </Alert>
      )}
      <p className="app-text app-hint">
        Rule modes come from Intune settings catalog policies (Endpoint security › Attack surface reduction, and Settings
        catalog). ASR rules set by older Endpoint protection profiles, security baselines or custom OMA-URI profiles are not
        read yet, so a rule set only there shows as Not configured. Coverage comes from the Rule mode each device reports to
        advanced hunting in the last 7 days, whatever set it.
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
      <p className="body app-text">Reading the Intune policies and the Rule modes devices report…</p>
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
