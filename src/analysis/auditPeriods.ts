// The Audit period (CONTEXT.md) of each ASR rule, from when Intune last changed the policies that
// set it or their assignments. Pure: no network, storage or React.
import type { RuleModes } from './intuneRuleModes';

const DAY_MS = 86_400_000;

/** A rule's Audit period in whole days; `atLeast` when it reaches back past the audit log that was read. */
export interface AuditPeriod {
  days: number;
  atLeast: boolean;
}

/** Per ASR rule GUID; a rule whose Audit period is not known is missing. */
export type AuditPeriods = Record<string, AuditPeriod>;

/** The Audit periods, or why the Intune audit log they need could not be read. */
export type AuditPeriodsResult = AuditPeriods | { failed: string };

export const auditPeriodsFailed = (result: AuditPeriodsResult): result is { failed: string } =>
  typeof (result as { failed?: unknown }).failed === 'string';

/** Changes to Intune policies or their assignments from the Intune audit log, read from `since` on. */
export interface PolicyChanges {
  since: string;
  changes: { policyId: string; at: string }[];
}

/**
 * Per ASR rule: the time since Intune last changed a policy that sets the rule, in any Rule mode, or
 * that policy's assignments. Assignment changes are only known from `since`; before that, only the
 * policies' own dates are.
 */
export function auditPeriodsFrom(modes: RuleModes, log: PolicyChanges, now: Date): AuditPeriods {
  const periods: AuditPeriods = {};
  const since = Date.parse(log.since);
  if (Number.isNaN(since)) return periods;
  for (const { rule } of modes.rules) {
    const policies = modes.policies.filter((policy) => policy.rules.includes(rule.guid));
    if (policies.length === 0 || policies.some((policy) => policy.changedAt === null)) continue;
    const ids = new Set(policies.map((policy) => policy.id));
    const last = Math.max(
      ...policies.map((policy) => Date.parse(policy.changedAt as string)),
      ...log.changes.filter((change) => ids.has(change.policyId)).map((change) => Date.parse(change.at)),
    );
    periods[rule.guid] =
      last >= since
        ? { days: Math.floor((now.getTime() - last) / DAY_MS), atLeast: false }
        : { days: Math.floor((now.getTime() - since) / DAY_MS), atLeast: true };
  }
  return periods;
}
