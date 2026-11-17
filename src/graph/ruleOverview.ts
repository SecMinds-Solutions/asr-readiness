import { ruleModesFromPolicies } from '../analysis/intuneRuleModes';
import type { RuleOverview } from '../analysis/ruleOverview';
import { errorMessage } from '../errorMessage';
import type { GraphClient } from './client';
import { fetchCoverage } from './coverage';
import { fetchIntunePolicies } from './intunePolicies';

/**
 * The Rule modes from Intune and the Coverage from advanced hunting, read in parallel. A User may
 * read Intune but not the Rule modes devices report (or the advanced hunting quota may be used up);
 * then the Rule modes still show, with the reason Coverage is missing. A failed Intune read fails
 * the overview.
 */
export async function fetchRuleOverview(graph: GraphClient): Promise<RuleOverview> {
  const [policies, coverage] = await Promise.all([
    fetchIntunePolicies(graph),
    fetchCoverage(graph).catch((error: unknown) => ({ failed: errorMessage(error) })),
  ]);
  return { modes: ruleModesFromPolicies(policies), coverage };
}
