import { auditPeriodsFromRows, type AuditPeriods } from '../analysis/auditPeriods';
import { AUDIT_PERIOD_QUERY } from '../analysis/queries';
import type { GraphClient } from './client';
import { runHuntingQuery } from './hunting';

/** Per ASR rule: how long the devices that now report it in Audit mode have done so without a break. */
export async function fetchAuditPeriods(graph: GraphClient): Promise<AuditPeriods> {
  return auditPeriodsFromRows(await runHuntingQuery(graph, AUDIT_PERIOD_QUERY));
}
