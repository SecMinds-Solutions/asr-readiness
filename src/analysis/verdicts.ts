// Verdicts (CONTEXT.md): the outcome of an Analysis for each ASR rule. Pure: no network, storage or React.
import { ASR_RULES, type AsrRule } from './asrRules';
import type { AuditEventGroup, AuditEvents, RuleAuditEvents } from './auditEvents';
import type { AuditPeriod, AuditPeriods } from './auditPeriods';
import type { RuleModes, RuleState } from './intuneRuleModes';
import type { Coverage } from './ruleOverview';
import { MAX_SUGGESTED_EXCLUSIONS, MINIMUM_AUDIT_PERIOD_DAYS, OBSERVATION_WINDOW_DAYS } from './thresholds';
import { userWritableLocation } from './userWritable';

export type Verdict = 'Ready to block' | 'Ready with exclusions' | 'Not ready' | 'No evidence';

/** The devices a Verdict speaks for: those reporting the rule in Audit mode, out of all reporting devices. */
export interface VerdictCoverage {
  auditDevices: number;
  devices: number;
}

export type RuleAssessment =
  /** Not a Verdict (CONTEXT.md: Already blocking); Coverage counts Audit mode, so it has none. */
  | { kind: 'already-blocking'; rule: AsrRule; reason: string; coverage: null }
  | {
      kind: 'verdict';
      rule: AsrRule;
      verdict: Verdict;
      /** Why the rule got this Verdict, in words for the User. */
      reason: string;
      /** For Ready with exclusions: the paths all Audit events come from. Empty otherwise. */
      paths: string[];
      coverage: VerdictCoverage | null;
    };

export interface VerdictInput {
  modes: RuleModes;
  coverage: Coverage | null;
  /** Null while no source can measure how long a rule has been in Audit mode (see ADR-0007). */
  auditPeriods: AuditPeriods | null;
  auditEvents: AuditEvents;
}

type Judgement = { verdict: Verdict; reason: string; paths?: string[] };

const days = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`;
const paths = (count: number) => `${count} ${count === 1 ? 'path' : 'paths'}`;

/** Whether Intune puts the rule in Audit mode: if so, a note when only some groups are; if not, why not. */
type IntuneAuditMode = { inAudit: true; note: string } | { inAudit: false; reason: string };

function intuneAuditMode(state: RuleState): IntuneAuditMode {
  switch (state.kind) {
    case 'mode':
      if (state.mode === 'Audit') return { inAudit: true, note: '' };
      return {
        inAudit: false,
        reason:
          state.mode === 'Not configured'
            ? 'Not in Audit mode: no Intune policy configures this rule.'
            : `Not in Audit mode: Intune sets it to ${state.mode}.`,
      };
    case 'conflict':
      return {
        inAudit: false,
        reason: 'Intune policies conflict on this rule: on a device that gets both, Intune applies neither Rule mode.',
      };
    case 'differs-by-group': {
      const auditing = state.policies.filter((entry) => entry.mode === 'Audit').map((entry) => entry.policy);
      if (auditing.length === 0) return { inAudit: false, reason: 'Not in Audit mode: no Intune policy sets Audit mode for this rule.' };
      return { inAudit: true, note: ` Only the groups of ${auditing.join(', ')} are in Audit mode.` };
    }
  }
}

/** The file an exclusion would name for one group of Audit events (see AsrRule.excludes). */
function exclusionPath(rule: AsrRule, group: AuditEventGroup): string {
  if (rule.excludes === 'target') return group.path;
  const folder = group.applicationFolder.replace(/\\+$/, '');
  if (!folder || !group.application) return '';
  // Advanced hunting's InitiatingProcessFolderPath often already ends with the file name.
  return folder.toLowerCase().endsWith(`\\${group.application.toLowerCase()}`) ? folder : `${folder}\\${group.application}`;
}

/** Distinct paths, compared without case or slash direction, in the order of the largest groups first. */
function distinctPaths(rule: AsrRule, events: RuleAuditEvents): string[] {
  const seen = new Map<string, string>();
  for (const group of events.groups) {
    const path = exclusionPath(rule, group);
    const key = path.replace(/\//g, '\\').toLowerCase();
    if (!seen.has(key)) seen.set(key, path);
  }
  return [...seen.values()];
}

/**
 * For a rule that excludes the file it acts on: why an application that triggered its Audit events
 * makes excluding that file unsafe, or null. Excluding the file would let an application from a
 * User-writable location through, and an application whose folder is unknown may be in one.
 */
function unsafeApplication(events: RuleAuditEvents): string | null {
  for (const group of events.groups) {
    if (!group.applicationFolder) {
      return `Audit events are triggered by ${group.application || 'an application'} whose folder advanced hunting does not record, so it may run from a User-writable location.`;
    }
    const location = userWritableLocation(group.applicationFolder);
    if (location) {
      return `Audit events are triggered by an application in a User-writable location (${location}), where ordinary users can replace it: ${group.applicationFolder}`;
    }
  }
  return null;
}

function judgeEvents(rule: AsrRule, events: RuleAuditEvents, period: AuditPeriod): Judgement {
  const auditFor = `In Audit mode for at least ${days(period.shortestDays)} on every device that reports it`;
  if (events.events === 0) {
    return { verdict: 'Ready to block', reason: `${auditFor}, with no Audit events in the last ${OBSERVATION_WINDOW_DAYS} days.` };
  }
  if (!events.complete) {
    return {
      verdict: 'Not ready',
      reason: 'Not every application and path of its Audit events was returned, so they cannot all be excluded.',
    };
  }
  const found = distinctPaths(rule, events);
  if (found.includes('')) return { verdict: 'Not ready', reason: 'Audit events have no path, so they cannot be excluded.' };
  for (const path of found) {
    const location = userWritableLocation(path);
    if (location) {
      return { verdict: 'Not ready', reason: `Audit events come from a User-writable location (${location}), which is never excluded: ${path}` };
    }
  }
  const application = rule.excludes === 'target' ? unsafeApplication(events) : null;
  if (application) return { verdict: 'Not ready', reason: application };
  if (found.length > MAX_SUGGESTED_EXCLUSIONS) {
    return {
      verdict: 'Not ready',
      reason: `Audit events come from ${paths(found.length)}; at most ${MAX_SUGGESTED_EXCLUSIONS} can be excluded.`,
    };
  }
  return {
    verdict: 'Ready with exclusions',
    reason: `${auditFor}. All ${events.events} Audit events in the last ${OBSERVATION_WINDOW_DAYS} days come from ${paths(found.length)}, none User-writable.`,
    paths: found,
  };
}

function judge(rule: AsrRule, state: RuleState, coverage: VerdictCoverage | null, input: VerdictInput): Judgement {
  const mode = intuneAuditMode(state);
  if (!mode.inAudit) return { verdict: 'No evidence', reason: mode.reason };

  if (!coverage || coverage.auditDevices === 0) {
    return { verdict: 'No evidence', reason: `No device reports this rule in Audit mode.${mode.note}` };
  }
  if (!input.auditPeriods) {
    return {
      verdict: 'No evidence',
      reason: `How long this rule has been in Audit mode cannot be measured yet, so the Minimum audit period of ${MINIMUM_AUDIT_PERIOD_DAYS} days cannot be checked.${mode.note}`,
    };
  }
  // The Audit period must speak for every device Coverage counts in Audit mode.
  const period = input.auditPeriods[rule.guid];
  if (!period || period.devices === 0) {
    return { verdict: 'No evidence', reason: `The Audit period of this rule is not known.${mode.note}` };
  }
  if (period.devices < coverage.auditDevices) {
    return {
      verdict: 'No evidence',
      reason: `An Audit period is known for only ${period.devices} of the ${coverage.auditDevices} devices that report this rule in Audit mode.${mode.note}`,
    };
  }
  if (period.shortestDays < MINIMUM_AUDIT_PERIOD_DAYS) {
    return {
      verdict: 'No evidence',
      reason: `In Audit mode for only ${days(period.shortestDays)} on some devices; the Minimum audit period is ${MINIMUM_AUDIT_PERIOD_DAYS} days.${mode.note}`,
    };
  }
  const events = input.auditEvents.rules.find((entry) => entry.rule.guid === rule.guid);
  if (!events) {
    return { verdict: 'No evidence', reason: 'Advanced hunting records no Audit events for this rule, so its Audit mode says nothing.' };
  }
  const judgement = judgeEvents(rule, events, period);
  return { ...judgement, reason: `${judgement.reason}${mode.note}` };
}

/** Every catalogue rule with its Verdict, or Already blocking, and the Coverage it speaks for. */
export function verdictsFor(input: VerdictInput): RuleAssessment[] {
  return ASR_RULES.map((rule): RuleAssessment => {
    const state = input.modes.rules.find((entry) => entry.rule.guid === rule.guid)?.state ?? {
      kind: 'mode',
      mode: 'Not configured',
      policies: [],
    };
    const coverage = input.coverage
      ? { auditDevices: input.coverage.auditDevices[rule.guid] ?? 0, devices: input.coverage.devices }
      : null;
    if (state.kind === 'mode' && state.mode === 'Block') {
      return { kind: 'already-blocking', rule, reason: 'Intune already sets this rule to Block mode.', coverage: null };
    }
    const { verdict, reason, paths: found = [] } = judge(rule, state, coverage, input);
    return { kind: 'verdict', rule, verdict, reason, paths: found, coverage };
  });
}
