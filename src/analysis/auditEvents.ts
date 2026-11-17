import { RULES_IN_ADVANCED_HUNTING, RULES_NOT_IN_ADVANCED_HUNTING, ruleByAuditActionType, type AsrRule } from './asrRules';
import { numberColumn, textColumn, unexpectedAnswer } from './huntingRows';

/** Audit events of one rule from one application on one path, in the Observation window. */
export interface AuditEventGroup {
  /** The file name of the process that triggered the rule; empty when advanced hunting has none. */
  application: string;
  /** The folder of that process, as advanced hunting records it; empty when it has none. */
  applicationFolder: string;
  /** The path of the file the rule acted on; empty when advanced hunting has none. */
  path: string;
  events: number;
  devices: number;
}

export interface RuleAuditEvents {
  rule: AsrRule;
  /** All Audit events of the rule in the Observation window. */
  events: number;
  /** The groups with the most Audit events, largest first. */
  groups: AuditEventGroup[];
  /** How many application and path groups the rule's Audit events fall into. */
  totalGroups: number;
  /**
   * False when `groups` does not hold every group or does not add up to `events`: the rule has more
   * groups than advanced hunting returns, or Audit events arrived while the queries ran.
   */
  complete: boolean;
}

export interface AuditEvents {
  /** Every catalogue rule that has an audit action type, in catalogue order. */
  rules: RuleAuditEvents[];
  /** Rules for which Microsoft documents no advanced hunting action type. */
  notInAdvancedHunting: AsrRule[];
}

const ruleOf = (row: unknown): AsrRule => {
  const rule = ruleByAuditActionType(textColumn(row, 'ActionType'));
  if (!rule) throw unexpectedAnswer();
  return rule;
};

/**
 * Audit events per rule from the totals and groups queries (queries.ts). The queries are separate
 * requests, so Audit events that arrive in between can make them differ; a rule whose groups do not
 * add up to its total is marked incomplete rather than trusted, and never shown with fewer events.
 */
export function auditEventsFromRows(totalRows: readonly unknown[], groupRows: readonly unknown[]): AuditEvents {
  const totals = new Map<string, { events: number; groups: number }>();
  for (const row of totalRows) {
    totals.set(ruleOf(row).guid, { events: numberColumn(row, 'Events'), groups: numberColumn(row, 'Groups') });
  }

  const groups = new Map<string, AuditEventGroup[]>();
  for (const row of groupRows) {
    const guid = ruleOf(row).guid;
    const group: AuditEventGroup = {
      application: textColumn(row, 'Application'),
      applicationFolder: textColumn(row, 'ApplicationFolder'),
      path: textColumn(row, 'Path'),
      events: numberColumn(row, 'Events'),
      devices: numberColumn(row, 'Devices'),
    };
    groups.set(guid, [...(groups.get(guid) ?? []), group]);
  }

  const rules = RULES_IN_ADVANCED_HUNTING.map((rule): RuleAuditEvents => {
    const ruleGroups = [...(groups.get(rule.guid) ?? [])].sort((a, b) => b.events - a.events);
    const shown = ruleGroups.reduce((sum, group) => sum + group.events, 0);
    const total = totals.get(rule.guid) ?? { events: 0, groups: 0 };
    return {
      rule,
      events: Math.max(total.events, shown),
      groups: ruleGroups,
      totalGroups: Math.max(total.groups, ruleGroups.length),
      complete: shown === total.events && ruleGroups.length === total.groups,
    };
  });

  return { rules, notInAdvancedHunting: [...RULES_NOT_IN_ADVANCED_HUNTING] };
}
