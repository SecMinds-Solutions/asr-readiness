import { SecMinds } from '../design-system';
import type { BadgeProps } from '../design-system/components';
import type { RuleAssessment, Verdict } from '../analysis/verdicts';
import { devicesText } from './devicesText';

const { Alert, Badge, Button, Card, Spinner, Table } = SecMinds;

type BadgeTone = NonNullable<BadgeProps['tone']>;

const TONE: Record<Verdict, BadgeTone> = {
  'Ready to block': 'success',
  'Ready with exclusions': 'info',
  'Not ready': 'warning',
  'No evidence': 'neutral',
};

function VerdictCell({ assessment }: { assessment: RuleAssessment }) {
  if (assessment.kind === 'already-blocking') return <Badge tone="success">Already blocking</Badge>;
  return <Badge tone={TONE[assessment.verdict]}>{assessment.verdict}</Badge>;
}

/** Coverage counts Audit mode, so a rule that is Already blocking has none. */
const coverageText = (row: RuleAssessment) => {
  if (row.coverage) return devicesText(row.coverage.auditDevices, row.coverage.devices);
  return row.kind === 'already-blocking' ? 'Not applicable' : 'Not available';
};

/** Every ASR rule with its Verdict, the Coverage it speaks for, and why it was given. */
export function VerdictsView({ assessments }: { assessments: RuleAssessment[] }) {
  return (
    <Card title="Verdicts">
      <p className="app-text">
        A Verdict per ASR rule across the Tenant. Each Verdict speaks only for the devices in its Coverage: the devices that
        report the rule in Audit mode.
      </p>
      <Table
        caption="Verdict, Coverage and reason per ASR rule"
        columns={[
          { key: 'name', label: 'ASR rule', render: (row: RuleAssessment) => row.rule.name },
          { key: 'verdict', label: 'Verdict', render: (row: RuleAssessment) => <VerdictCell assessment={row} /> },
          {
            key: 'coverage',
            label: 'Coverage',
            align: 'right',
            render: coverageText,
          },
          { key: 'reason', label: 'Reason', render: (row: RuleAssessment) => <span className="app-break">{row.reason}</span> },
        ]}
        rows={assessments}
      />
    </Card>
  );
}

export function LoadingVerdicts() {
  return (
    <div className="app-row">
      <Spinner label="Working out Verdicts" />
      <p className="body app-text">Working out a Verdict per ASR rule…</p>
    </div>
  );
}

/** A Verdict needs every part of the Analysis; this names what could not be read. */
export function VerdictsFailedAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert tone="danger" title="No Verdicts">
      <p className="app-text">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </Alert>
  );
}
