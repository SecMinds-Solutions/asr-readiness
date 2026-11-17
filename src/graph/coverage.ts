import { coverageFromRows } from '../analysis/coverage';
import { ASR_RULE_MODES_QUERY } from '../analysis/queries';
import type { Coverage } from '../analysis/ruleOverview';
import type { GraphClient } from './client';
import { runHuntingQuery } from './hunting';

/** Coverage from the Rule mode each device reports to advanced hunting; null when no device reports one. */
export async function fetchCoverage(graph: GraphClient): Promise<Coverage | null> {
  const coverage = coverageFromRows(await runHuntingQuery(graph, ASR_RULE_MODES_QUERY));
  return coverage.devices > 0 ? coverage : null;
}
