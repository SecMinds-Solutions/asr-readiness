import { useMemo } from 'react';
import type { AuditEvents } from './analysis/auditEvents';
import type { AuditPeriods } from './analysis/auditPeriods';
import { coverageFailed, type RuleOverview } from './analysis/ruleOverview';
import { verdictsFor, type RuleAssessment } from './analysis/verdicts';
import { useLoad, type LoadState } from './useLoad';

/** What the app reads for an Analysis once the Tenant is ready. */
export interface AnalysisLoaders {
  /** Every ASR rule with its Rule mode, and its Coverage once that can be read. */
  loadRuleOverview: () => Promise<RuleOverview>;
  /** Audit events per ASR rule, application and path in the Observation window. */
  loadAuditEvents: () => Promise<AuditEvents>;
  /** Per ASR rule GUID: how long it has been in Audit mode, or null while no source can measure that. */
  loadAuditPeriods: () => Promise<AuditPeriods | null>;
}

export type Loaded<T> = { state: LoadState<T>; reload: () => void };

/** The three parts of an Analysis, read once and shared by every page of the Analysis. */
export interface Analysis {
  overview: Loaded<RuleOverview>;
  events: Loaded<AuditEvents>;
  periods: Loaded<AuditPeriods | null>;
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
  const periods = useLoad(loaders ? loaders.loadAuditPeriods : null);
  const parts = [overview.state, events.state, periods.state];
  const readAt = parts.every((state) => state.status === 'loaded')
    ? new Date(Math.max(...parts.map((state) => (state.status === 'loaded' ? state.at.getTime() : 0))))
    : null;
  return {
    overview,
    events,
    periods,
    readAt,
    readAgain: () => {
      overview.reload();
      events.reload();
      periods.reload();
    },
  };
}

/** The Verdicts of an Analysis: they need every part, so a part that failed means no Verdicts. */
export type Assessments =
  | { status: 'loading' }
  | { status: 'failed'; message: string; retry: () => void }
  | { status: 'ready'; assessments: RuleAssessment[] };

export function useAssessments({ overview, events, periods }: Analysis): Assessments {
  const assessments = useMemo(() => {
    if (overview.state.status !== 'loaded' || events.state.status !== 'loaded' || periods.state.status !== 'loaded') return null;
    const { modes, coverage } = overview.state.value;
    if (coverageFailed(coverage)) return null;
    return verdictsFor({ modes, coverage, auditEvents: events.state.value, auditPeriods: periods.state.value });
  }, [overview.state, events.state, periods.state]);

  // A Verdict without Coverage would be No evidence for every rule, so a failed Coverage query is a failed part.
  const failed = [
    { name: 'the ASR rules', ...overview },
    { name: 'the Audit events', ...events },
    { name: 'how long rules have been in Audit mode', ...periods },
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
