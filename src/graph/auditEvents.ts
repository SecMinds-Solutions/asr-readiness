import { auditEventsFromRows, type AuditEvents } from '../analysis/auditEvents';
import { AUDIT_EVENT_GROUPS_QUERY, AUDIT_EVENT_TOTALS_QUERY } from '../analysis/queries';
import type { GraphClient } from './client';
import { runHuntingQuery } from './hunting';

/** Audit events per rule, application and path in the Observation window, aggregated in KQL. */
export async function fetchAuditEvents(graph: GraphClient): Promise<AuditEvents> {
  const [totals, groups] = await Promise.all([
    runHuntingQuery(graph, AUDIT_EVENT_TOTALS_QUERY),
    runHuntingQuery(graph, AUDIT_EVENT_GROUPS_QUERY),
  ]);
  return auditEventsFromRows(totals, groups);
}
