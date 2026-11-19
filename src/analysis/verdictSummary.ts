// How many ASR rules have each Verdict, and the filter on the Verdicts page. Pure: no network, storage or React.
import type { RuleAssessment, Verdict } from './verdicts';

/** The value of a Verdict filter in the address, from this fixed list only. */
export type VerdictFilter = 'ready-to-block' | 'ready-with-exclusions' | 'not-ready' | 'no-evidence' | 'already-blocking';

/** Every Verdict, and Already blocking, in the order the app shows them. */
export const VERDICT_FILTERS: readonly { value: VerdictFilter; label: Verdict | 'Already blocking' }[] = [
  { value: 'ready-to-block', label: 'Ready to block' },
  { value: 'ready-with-exclusions', label: 'Ready with exclusions' },
  { value: 'not-ready', label: 'Not ready' },
  { value: 'no-evidence', label: 'No evidence' },
  { value: 'already-blocking', label: 'Already blocking' },
];

/** The name of the query parameter that holds the Verdict filter. */
export const VERDICT_FILTER_PARAM = 'verdict';

/** The filter in a query string; anything not in the list means no filter. */
export function readVerdictFilter(search: string): VerdictFilter | null {
  const value = new URLSearchParams(search).get(VERDICT_FILTER_PARAM);
  return VERDICT_FILTERS.find((filter) => filter.value === value)?.value ?? null;
}

const filterOf = (assessment: RuleAssessment): VerdictFilter =>
  assessment.kind === 'already-blocking'
    ? 'already-blocking'
    : (VERDICT_FILTERS.find((filter) => filter.label === assessment.verdict) as (typeof VERDICT_FILTERS)[number]).value;

export const matchesVerdictFilter = (assessment: RuleAssessment, filter: VerdictFilter | null) =>
  filter === null || filterOf(assessment) === filter;

/** The Coverage of a set of rules: the lowest and highest number of devices in Audit mode, out of the reporting devices. */
export interface CoverageRange {
  lowest: number;
  highest: number;
  devices: number;
}

export interface VerdictCount {
  value: VerdictFilter;
  label: Verdict | 'Already blocking';
  rules: number;
  /** Null when no rule has this Verdict, or for Already blocking, which has no Coverage. */
  coverage: CoverageRange | null;
}

/** The number of rules per Verdict, with the range of Coverage they speak for. */
export function verdictSummary(assessments: readonly RuleAssessment[]): VerdictCount[] {
  return VERDICT_FILTERS.map(({ value, label }) => {
    const rules = assessments.filter((assessment) => filterOf(assessment) === value);
    const coverages = rules.flatMap((rule) => (rule.coverage ? [rule.coverage] : []));
    const coverage =
      coverages.length === 0
        ? null
        : {
            lowest: Math.min(...coverages.map((c) => c.auditDevices)),
            highest: Math.max(...coverages.map((c) => c.auditDevices)),
            devices: Math.max(...coverages.map((c) => c.devices)),
          };
    return { value, label, rules: rules.length, coverage };
  });
}
