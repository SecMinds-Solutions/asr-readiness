import type { PolicyChanges } from '../analysis/auditPeriods';
import { policyChangesFromAuditEvents } from '../analysis/policyChanges';
import { OBSERVATION_WINDOW_DAYS } from '../analysis/thresholds';
import { GraphError, type GraphClient } from './client';

/**
 * Changes to Intune settings catalog policies and their assignments in the Observation window,
 * from the Intune audit log. The client follows at most 50 pages and fails beyond that, so a
 * Tenant with more changes gets no Audit period rather than an incomplete one.
 */
export async function fetchPolicyChanges(graph: GraphClient, now: Date): Promise<PolicyChanges> {
  const since = new Date(now.getTime() - OBSERVATION_WINDOW_DAYS * 86_400_000).toISOString();
  const filter = encodeURIComponent(`activityDateTime gt ${since} and category eq 'DeviceConfiguration'`);
  try {
    const events = await graph.getAll<unknown>(`/deviceManagement/auditEvents?$filter=${filter}`, { version: 'v1.0' });
    return policyChangesFromAuditEvents(events, since);
  } catch (error) {
    if (error instanceof GraphError && error.status === 403) {
      throw new Error(
        'Intune refused its audit log: the User needs an Intune role with Audit data: Read, and the Tenant must have consented to the app reading it.',
        { cause: error },
      );
    }
    throw error;
  }
}
