import { ruleByConfigurationKey } from './asrRules';
import { numberColumn, textColumn } from './huntingRows';

/** A rule's Audit period (CONTEXT.md) across the devices that now report it in Audit mode. */
export interface AuditPeriod {
  devices: number;
  /** The shortest Audit period among those devices, in whole days; the Minimum audit period is checked against it. */
  shortestDays: number;
}

/** Per ASR rule GUID; a rule no device reports in Audit mode is missing. */
export type AuditPeriods = Record<string, AuditPeriod>;

/** From the rows of AUDIT_PERIOD_QUERY. Unknown keys are left out; Coverage already lists them. */
export function auditPeriodsFromRows(rows: unknown[]): AuditPeriods {
  const periods: AuditPeriods = {};
  for (const row of rows) {
    const period = { devices: numberColumn(row, 'Devices'), shortestDays: numberColumn(row, 'ShortestDays') };
    const rule = ruleByConfigurationKey(textColumn(row, 'Rule'));
    if (rule) periods[rule.guid] = period;
  }
  return periods;
}
