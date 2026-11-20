import { useMemo } from 'react';
import type { AuditEvents } from './analysis/auditEvents';
import { auditPeriodsFrom, type PolicyChanges } from './analysis/auditPeriods';
import { coverageFailed, type RuleOverview } from './analysis/ruleOverview';
import { verdictsFor, type RuleAssessment } from './analysis/verdicts';
import { useLoad, type LoadState } from './useLoad';

/** What the app reads for an Analysis once the Tenant is ready. */
export interface AnalysisLoaders {
  /** Every ASR rule with its Rule mode, and its Coverage once that can be read. */
  loadRuleOverview: () => Promise<RuleOverview>;
  /** Audit events per ASR rule, application and path in the Observation window. */
  loadAuditEvents: () => Promise<AuditEvents>;
  /** Changes to Intune policies and their assignments in the Observation window, for the Audit period. */
  loadPolicyChanges: () => Promise<PolicyChanges>;
}

export type Loaded<T> = { state: LoadState<T>; reload: () => void };

/** The three parts of an Analysis, read once and shared by every page of the Analysis. */
export interface Analysis {
  overview: Loaded<RuleOverview>;
  events: Loaded<AuditEvents>;
  changes: Loaded<PolicyChanges>;
  /** When the last part was read; null while a part is loading or has failed. */
  readAt: Date | null;
  /** Reads all three parts again. */
  readAgain: () => void;
}

/**
 * Reads each part of the Analysis once `loaders` is given, and only again on `readAgain` or a part's
 * own `reload`: moving between the pages of the Analysis never reads Graph again.
 */
export function useAnalysis(loaders: AnalysisLoaders | null): Analysis {
  const overview = useLoad(loaders ? loaders.loadRuleOverview : null);
  const events = useLoad(loaders ? loaders.loadAuditEvents : null);
  const changes = useLoad(loaders ? loaders.loadPolicyChanges : null);
  const parts = [overview.state, events.state, changes.state];
  const readAt = parts.every((state) => state.status === 'loaded')
    ? new Date(Math.max(...parts.map((state) => (state.status === 'loaded' ? state.at.getTime() : 0))))
    : null;
  return {
    overview,
    events,
    changes,
    readAt,
    readAgain: () => {
      overview.reload();
      events.reload();
      changes.reload();
    },
  };
}

/** The Verdicts of an Analysis: they need every part, so a part that failed means no Verdicts. */
export type Assessments =
  | { status: 'loading' }
  | { status: 'failed'; message: string; retry: () => void }
  | { status: 'ready'; assessments: RuleAssessment[] };

export function useAssessments({ overview, events, changes }: Analysis): Assessments {
  const assessments = useMemo(() => {
    if (overview.state.status !== 'loaded' || events.state.status !== 'loaded' || changes.state.status === 'loading') return null;
    const { modes, coverage } = overview.state.value;
    if (coverageFailed(coverage)) return null;
    // Without the audit log, only rules in Audit mode lose their Verdict (to No evidence, with the reason).
    // The Audit period runs to when the audit log was read, so a later render does not change it.
    const auditPeriods =
      changes.state.status === 'failed'
        ? { failed: changes.state.message }
        : auditPeriodsFrom(modes, changes.state.value, changes.state.at);
    return verdictsFor({ modes, coverage, auditEvents: events.state.value, auditPeriods });
  }, [overview.state, events.state, changes.state]);

  // A Verdict without Coverage would be No evidence for every rule, so a failed Coverage query is a failed part.
  const failed = [
    { name: 'the ASR rules', ...overview },
    { name: 'the Audit events', ...events },
  ].flatMap(({ name, state, reload }) => (state.status === 'failed' ? [{ message: `${name}: ${state.message}`, reload }] : []));
  if (overview.state.status === 'loaded' && coverageFailed(overview.state.value.coverage)) {
    failed.push({ message: `Coverage: ${overview.state.value.coverage.failed}`, reload: overview.reload });
  }
  if (failed.length > 0) {
    return {
      status: 'failed',
      message: `A Verdict needs every part of the Analysis, and these could not be read. ${failed.map((part) => part.message).join(' ')}`,
      retry: () => failed.forEach((part) => part.reload()),
    };
  }
  return assessments ? { status: 'ready', assessments } : { status: 'loading' };
}
