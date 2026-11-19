import { SecMinds } from '../design-system';
import type { BadgeProps } from '../design-system/components';
import type { RuleAssessment, Verdict } from '../analysis/verdicts';
import {
  matchesVerdictFilter,
  VERDICT_FILTER_PARAM,
  VERDICT_FILTERS,
  type VerdictFilter,
} from '../analysis/verdictSummary';
import { useNavigation } from '../navigation';
import { ButtonLink } from './ButtonLink';
import { devicesText } from './devicesText';

const { Alert, Badge, Button, Card, EmptyState, Icon, Spinner, Table, TextLink } = SecMinds;

type BadgeTone = NonNullable<BadgeProps['tone']>;

const TONE: Record<Verdict, BadgeTone> = {
  'Ready to block': 'success',
  'Ready with exclusions': 'info',
  'Not ready': 'warning',
  'No evidence': 'neutral',
};

/** A Verdict as a badge with its word, so its color never stands alone. */
export const VerdictBadge = ({ verdict }: { verdict: Verdict }) => <Badge tone={TONE[verdict]}>{verdict}</Badge>;

function VerdictCell({ assessment }: { assessment: RuleAssessment }) {
  if (assessment.kind === 'already-blocking') return <Badge tone="success">Already blocking</Badge>;
  return <VerdictBadge verdict={assessment.verdict} />;
}

/** Coverage counts Audit mode, so a rule that is Already blocking has none. */
const coverageText = (row: RuleAssessment) => {
  if (row.coverage) return devicesText(row.coverage.auditDevices, row.coverage.devices);
  return row.kind === 'already-blocking' ? 'Not applicable' : 'Not available';
};

/**
 * The filter above the Verdict table: All, then every Verdict with its number of rules. Each is a link
 * to the Verdicts with that filter in the address, so Back, reload and shared links keep it. The
 * active one is marked with a check and `aria-current`, not by color alone.
 */
function VerdictFilters({ assessments, filter }: { assessments: RuleAssessment[]; filter: VerdictFilter | null }) {
  const { href } = useNavigation();
  const base = href({ site: 'app', page: 'verdicts' });
  const options = [
    { value: null, label: 'All', count: assessments.length, href: base },
    ...VERDICT_FILTERS.map((option) => ({
      value: option.value,
      label: option.label,
      count: assessments.filter((assessment) => matchesVerdictFilter(assessment, option.value)).length,
      href: `${base}?${VERDICT_FILTER_PARAM}=${option.value}`,
    })),
  ];
  return (
    <nav className="app-filters" aria-label="Filter by Verdict">
      <ul>
        {options.map((option) => {
          const active = option.value === filter;
          return (
            <li key={option.label}>
              <ButtonLink
                size="sm"
                variant={active ? 'primary' : 'secondary'}
                href={option.href}
                aria-current={active ? 'true' : undefined}
              >
                {active && <Icon name="check" size={16} />}
                {option.label} ({option.count})
              </ButtonLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Every ASR rule with its Verdict, the Coverage it speaks for, and why it was given; `filter` keeps one Verdict. */
export function VerdictsView({ assessments, filter = null }: { assessments: RuleAssessment[]; filter?: VerdictFilter | null }) {
  const { href } = useNavigation();
  const shown = assessments.filter((assessment) => matchesVerdictFilter(assessment, filter));
  const label = VERDICT_FILTERS.find((option) => option.value === filter)?.label;
  return (
    <Card title="Verdict per ASR rule">
      <p className="app-text">
        A Verdict per ASR rule across the Tenant. Each Verdict speaks only for the devices in its Coverage: the devices that
        report the rule in Audit mode.
      </p>
      <VerdictFilters assessments={assessments} filter={filter} />
      {shown.length === 0 ? (
        <EmptyState
          icon="filter"
          title={`No ASR rules in ${label ?? 'this filter'}`}
          action={<TextLink href={href({ site: 'app', page: 'verdicts' })}>Show all ASR rules</TextLink>}
        >
          {filter === 'already-blocking' ? 'Intune sets no ASR rule to Block mode.' : 'No ASR rule has this Verdict in this Analysis.'}
        </EmptyState>
      ) : (
        <Table
          caption={label ? `Verdict, Coverage and reason per ASR rule: ${label}` : 'Verdict, Coverage and reason per ASR rule'}
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
          rows={shown}
        />
      )}
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
