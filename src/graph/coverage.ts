import type { Coverage } from '../analysis/ruleOverview';

/**
 * Coverage from advanced hunting. Not built yet: the shape of the per-device ASR rule states is
 * being confirmed against a real Tenant first, so there is none instead of a guess.
 */
export async function fetchCoverage(): Promise<Coverage | null> {
  return null;
}
