import { ASR_RULES, INTUNE_ASR_SETTING, ruleByIntuneSetting, type AsrRule } from './asrRules';

/** How an ASR rule is configured (CONTEXT.md: Rule mode). */
export type RuleMode = 'Not configured' | 'Disabled' | 'Audit' | 'Warn' | 'Block';

/** An Intune settings catalog policy with its settings, as Graph returns them. */
export interface IntunePolicy {
  id: string;
  name: string;
  /** The `value` items of GET /deviceManagement/configurationPolicies/{id}/settings. */
  settings: unknown[];
  /** The `value` items of GET /deviceManagement/configurationPolicies/{id}/assignments. */
  assignments: unknown[];
  /** When the policy was created and last changed, as Graph returns them; assignment changes do not count. */
  createdDateTime?: unknown;
  lastModifiedDateTime?: unknown;
}

/** A policy that holds ASR rules: which rules it sets, in any Rule mode, and when Intune last changed it. */
export interface AsrPolicy {
  id: string;
  /** ASR rule GUIDs the policy sets, whether it is assigned or not. */
  rules: string[];
  /** The later of its creation and last change, as an ISO date; null when Graph did not give both. */
  changedAt: string | null;
}

/**
 * Who a policy is assigned to. Exclusions are left out: a policy that only excludes groups is
 * unassigned. A target type this version does not know is kept as `other`, and counts as shared.
 */
export type AssignmentTarget =
  | { kind: 'all-devices' }
  | { kind: 'all-users' }
  | { kind: 'group'; groupId: string }
  | { kind: 'other'; type: string };

/** One policy's Rule mode for a rule, with the targets it is assigned to. */
export interface PolicyRuleMode {
  policy: string;
  mode: RuleMode;
  targets: AssignmentTarget[];
}

export type RuleState =
  | { kind: 'mode'; mode: RuleMode; policies: string[] }
  /** Policies that disagree share a target, so some devices get both and Intune applies neither (CONTEXT.md: Conflict). */
  | { kind: 'conflict'; policies: PolicyRuleMode[] }
  /** Policies that disagree target different groups (CONTEXT.md: Differs by group). */
  | { kind: 'differs-by-group'; policies: PolicyRuleMode[] };

export interface RuleModes {
  rules: { rule: AsrRule; state: RuleState }[];
  /** Every policy that holds ASR rules, for the Audit period. */
  policies: AsrPolicy[];
  /** Policies with ASR rules that are assigned to nobody, so they configure nothing. */
  unassignedPolicies: string[];
  /** ASR settings this version does not know, so the Analysis can say what it left out. */
  unrecognisedSettings: { policy: string; setting: string }[];
}

/** The later of a policy's creation and last change, or null when either is missing or not a date. */
function changedAt(policy: IntunePolicy): string | null {
  const times = [policy.createdDateTime, policy.lastModifiedDateTime].map((value) => (typeof value === 'string' ? Date.parse(value) : NaN));
  if (times.some(Number.isNaN)) return null;
  return new Date(Math.max(...times)).toISOString();
}

const MODE_BY_SUFFIX: Record<string, RuleMode> = { off: 'Disabled', audit: 'Audit', warn: 'Warn', block: 'Block' };

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null;
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const TARGET_TYPES: Record<string, AssignmentTarget['kind']> = {
  '#microsoft.graph.allDevicesAssignmentTarget': 'all-devices',
  '#microsoft.graph.allLicensedUsersAssignmentTarget': 'all-users',
  '#microsoft.graph.groupAssignmentTarget': 'group',
};
const EXCLUSION_TYPE = '#microsoft.graph.exclusionGroupAssignmentTarget';

/** The include targets of a policy's assignments, as Graph returns them. */
export function assignmentTargets(assignments: unknown[]): AssignmentTarget[] {
  return assignments.flatMap((assignment): AssignmentTarget[] => {
    const target = isObject(assignment) ? assignment['target'] : undefined;
    if (!isObject(target)) return [];
    const type = typeof target['@odata.type'] === 'string' ? target['@odata.type'] : 'unknown';
    if (type === EXCLUSION_TYPE) return [];
    const kind = TARGET_TYPES[type];
    if (kind === 'group' && typeof target['groupId'] === 'string') return [{ kind, groupId: target['groupId'] }];
    if (kind === 'all-devices' || kind === 'all-users') return [{ kind }];
    return [{ kind: 'other', type }];
  });
}

/**
 * Whether two policies may reach the same devices: they target the same group, or one targets All
 * devices, All users or a target type this version does not know. Exclusions and assignment filters
 * are not taken into account. Different groups may still share devices; without reading group
 * members the app cannot tell (ADR-0002).
 */
function shareTarget(a: AssignmentTarget[], b: AssignmentTarget[]): boolean {
  const notOnlyGroups = (targets: AssignmentTarget[]) => targets.some((target) => target.kind !== 'group');
  if (notOnlyGroups(a) || notOnlyGroups(b)) return true;
  const groups = new Set(a.flatMap((target) => (target.kind === 'group' ? [target.groupId] : [])));
  return b.some((target) => target.kind === 'group' && groups.has(target.groupId));
}

/** Policies that agree give their Rule mode; policies that disagree are a Conflict where they share a target. */
function ruleState(configured: PolicyRuleMode[]): RuleState {
  const [first] = configured;
  if (!first) return { kind: 'mode', mode: 'Not configured', policies: [] };
  if (configured.every((entry) => entry.mode === first.mode)) {
    return { kind: 'mode', mode: first.mode, policies: configured.map((entry) => entry.policy) };
  }
  const conflict = configured.some((a, i) =>
    configured.slice(i + 1).some((b) => a.mode !== b.mode && shareTarget(a.targets, b.targets)),
  );
  return { kind: conflict ? 'conflict' : 'differs-by-group', policies: configured };
}

/** Whether a policy's settings hold the "Attack Surface Reduction Rules" group setting. */
export const hasAsrRules = (settings: unknown[]): boolean => asrRuleSettings(settings).length > 0;

/** The per-rule choice settings inside a policy's "Attack Surface Reduction Rules" group setting. */
function asrRuleSettings(settings: unknown[]): Json[] {
  return settings.flatMap((setting) => {
    const instance = isObject(setting) ? setting['settingInstance'] : undefined;
    if (!isObject(instance) || instance['settingDefinitionId'] !== INTUNE_ASR_SETTING) return [];
    return asArray(instance['groupSettingCollectionValue']).flatMap((group) =>
      asArray(isObject(group) ? group['children'] : undefined).filter(isObject),
    );
  });
}

/**
 * The Rule mode of every ASR rule in the catalogue, from the Tenant's assigned Intune policies.
 * Following Intune's merge behaviour, policies that agree give that Rule mode. Policies that
 * disagree are a Conflict where they share an assignment target: where both apply to a device,
 * Intune holds the rule back. Policies that disagree on separate groups differ by group.
 */
export function ruleModesFromPolicies(policies: IntunePolicy[]): RuleModes {
  const found = new Map<string, PolicyRuleMode[]>();
  const asrPolicies: AsrPolicy[] = [];
  const unassignedPolicies: string[] = [];
  const unrecognisedSettings: RuleModes['unrecognisedSettings'] = [];

  for (const policy of policies) {
    const ruleSettings = asrRuleSettings(policy.settings);
    if (ruleSettings.length === 0) continue;
    asrPolicies.push({
      id: policy.id,
      rules: ruleSettings.flatMap((setting) => ruleByIntuneSetting(String(setting['settingDefinitionId'] ?? ''))?.guid ?? []),
      changedAt: changedAt(policy),
    });
    const targets = assignmentTargets(policy.assignments);
    if (targets.length === 0) {
      unassignedPolicies.push(policy.name);
      continue;
    }
    for (const setting of ruleSettings) {
      const settingId = String(setting['settingDefinitionId'] ?? '');
      const rule = ruleByIntuneSetting(settingId);
      const choice = setting['choiceSettingValue'];
      const value = isObject(choice) ? String(choice['value'] ?? '') : '';
      const mode = rule && value.startsWith(`${settingId}_`) ? MODE_BY_SUFFIX[value.slice(settingId.length + 1)] : undefined;
      if (!rule || !mode) {
        unrecognisedSettings.push({ policy: policy.name, setting: settingId });
        continue;
      }
      found.set(rule.guid, [...(found.get(rule.guid) ?? []), { policy: policy.name, mode, targets }]);
    }
  }

  const rules = ASR_RULES.map((rule) => ({ rule, state: ruleState(found.get(rule.guid) ?? []) }));
  return { rules, policies: asrPolicies, unassignedPolicies, unrecognisedSettings };
}
