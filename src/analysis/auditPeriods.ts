/** A rule's Audit period (CONTEXT.md), and how many of the devices in its Coverage it speaks for. */
export interface AuditPeriod {
  devices: number;
  /** The shortest Audit period among those devices, in whole days; the Minimum audit period is checked against it. */
  shortestDays: number;
}

/** Per ASR rule GUID; a rule whose Audit period is not known is missing. */
export type AuditPeriods = Record<string, AuditPeriod>;
