import { ASR_RULES } from './asrRules';
import type { RuleAssessment } from './verdicts';
import { matchesVerdictFilter, readVerdictFilter, verdictSummary, VERDICT_FILTERS } from './verdictSummary';

const [a, b, c, d, e] = ASR_RULES as [typeof ASR_RULES[0], typeof ASR_RULES[0], typeof ASR_RULES[0], typeof ASR_RULES[0], typeof ASR_RULES[0]];
const verdict = (rule: typeof a, v: 'Ready to block' | 'Ready with exclusions' | 'Not ready' | 'No evidence', auditDevices: number): RuleAssessment => ({
  kind: 'verdict',
  rule,
  verdict: v,
  reason: '',
  paths: [],
  coverage: { auditDevices, devices: 50 },
});
const assessments: RuleAssessment[] = [
  verdict(a, 'Ready to block', 48),
  verdict(b, 'Ready to block', 50),
  verdict(c, 'Ready with exclusions', 40),
  verdict(d, 'No evidence', 0),
  { kind: 'already-blocking', rule: e, reason: '', coverage: null },
];

describe('readVerdictFilter', () => {
  it('reads each Verdict and Already blocking from the query string', () => {
    for (const filter of VERDICT_FILTERS) expect(readVerdictFilter(`?verdict=${filter.value}`)).toBe(filter.value);
  });

  it('reads no filter, an unknown value or free text as all rules', () => {
    expect(readVerdictFilter('')).toBeNull();
    expect(readVerdictFilter('?verdict=')).toBeNull();
    expect(readVerdictFilter('?verdict=<script>')).toBeNull();
    expect(readVerdictFilter('?verdict=Ready%20to%20block')).toBeNull();
  });
});

describe('matchesVerdictFilter', () => {
  it('keeps every rule without a filter, and only the rules with that Verdict with one', () => {
    expect(assessments.filter((x) => matchesVerdictFilter(x, null))).toHaveLength(5);
    expect(assessments.filter((x) => matchesVerdictFilter(x, 'ready-to-block')).map((x) => x.rule)).toEqual([a, b]);
    expect(assessments.filter((x) => matchesVerdictFilter(x, 'already-blocking')).map((x) => x.rule)).toEqual([e]);
    expect(assessments.filter((x) => matchesVerdictFilter(x, 'not-ready'))).toEqual([]);
  });
});

describe('verdictSummary', () => {
  it('counts the rules per Verdict, with the range of their Coverage', () => {
    const summary = verdictSummary(assessments);
    expect(summary.find((s) => s.value === 'ready-to-block')).toMatchObject({ rules: 2, coverage: { lowest: 48, highest: 50, devices: 50 } });
    expect(summary.find((s) => s.value === 'ready-with-exclusions')).toMatchObject({ rules: 1, coverage: { lowest: 40, highest: 40, devices: 50 } });
    expect(summary.find((s) => s.value === 'not-ready')).toMatchObject({ rules: 0, coverage: null });
    expect(summary.find((s) => s.value === 'already-blocking')).toMatchObject({ rules: 1, coverage: null });
  });

  it('adds up to every rule', () => {
    expect(verdictSummary(assessments).reduce((sum, s) => sum + s.rules, 0)).toBe(assessments.length);
  });
});
