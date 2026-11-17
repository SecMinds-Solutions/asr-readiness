import { hasAsrRules, type IntunePolicy } from '../analysis/intuneRuleModes';
import type { GraphClient } from './client';

const BASE = '/deviceManagement/configurationPolicies';
/** At most this many policies are read at once, to stay well within Graph's throttling limits. */
const CONCURRENCY = 4;

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null;

/** Assigned means at least one target that includes devices or users, not only exclusions. */
const isAssigned = (assignments: unknown[]) =>
  assignments.some(
    (assignment) =>
      isObject(assignment) &&
      isObject(assignment['target']) &&
      assignment['target']['@odata.type'] !== '#microsoft.graph.exclusionGroupAssignmentTarget',
  );

async function inBatches<T, R>(items: T[], work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += CONCURRENCY) {
    results.push(...(await Promise.all(items.slice(start, start + CONCURRENCY).map(work))));
  }
  return results;
}

/**
 * The Tenant's Windows settings catalog policies (Graph beta, the only version that has them)
 * with their settings; assignments are read only for policies that hold ASR rules.
 */
export async function fetchIntunePolicies(graph: GraphClient): Promise<IntunePolicy[]> {
  const listed = await graph.getAll<Json>(`${BASE}?$select=id,name,platforms`, { version: 'beta' });
  const windows = listed.filter((policy) => String(policy['platforms'] ?? '').toLowerCase().includes('windows10'));
  return inBatches(windows, async (policy) => {
    const id = String(policy['id']);
    const path = `${BASE}/${encodeURIComponent(id)}`;
    const settings = await graph.getAll<unknown>(`${path}/settings`, { version: 'beta' });
    const assigned = hasAsrRules(settings) && isAssigned(await graph.getAll<unknown>(`${path}/assignments`, { version: 'beta' }));
    return { id, name: String(policy['name'] ?? id), settings, assigned };
  });
}
