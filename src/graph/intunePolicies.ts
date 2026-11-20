import { hasAsrRules, type IntunePolicy } from '../analysis/intuneRuleModes';
import type { GraphClient } from './client';

const BASE = '/deviceManagement/configurationPolicies';
/** At most this many policies are read at once, to stay well within Graph's throttling limits. */
const CONCURRENCY = 4;

type Json = Record<string, unknown>;

async function inBatches<T, R>(items: T[], work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += CONCURRENCY) {
    results.push(...(await Promise.all(items.slice(start, start + CONCURRENCY).map(work))));
  }
  return results;
}

/**
 * The Tenant's Windows settings catalog policies (Graph beta, the only version that has them)
 * with their settings and when they were created and last changed; assignments are read only for policies that hold ASR rules, and passed on
 * as Graph returns them for the analysis to read.
 */
export async function fetchIntunePolicies(graph: GraphClient): Promise<IntunePolicy[]> {
  const listed = await graph.getAll<Json>(`${BASE}?$select=id,name,platforms,createdDateTime,lastModifiedDateTime`, { version: 'beta' });
  const windows = listed.filter((policy) => String(policy['platforms'] ?? '').toLowerCase().includes('windows10'));
  return inBatches(windows, async (policy) => {
    const id = String(policy['id']);
    const path = `${BASE}/${encodeURIComponent(id)}`;
    const settings = await graph.getAll<unknown>(`${path}/settings`, { version: 'beta' });
    const assignments = hasAsrRules(settings) ? await graph.getAll<unknown>(`${path}/assignments`, { version: 'beta' }) : [];
    return {
      id,
      name: String(policy['name'] ?? id),
      settings,
      assignments,
      createdDateTime: policy['createdDateTime'],
      lastModifiedDateTime: policy['lastModifiedDateTime'],
    };
  });
}
