import { ASR_RULES, INTUNE_ASR_SETTING, ruleByIntuneSetting, type AsrRule } from './asrRules';

/** How an ASR rule is configured (CONTEXT.md: Rule mode). */
export type RuleMode = 'Not configured' | 'Disabled' | 'Audit' | 'Warn' | 'Block';

/** An Intune settings catalog policy with its settings, as Graph returns them. */
export interface IntunePolicy {
  id: string;
  name: string;
  /** The `value` items of GET /deviceManagement/configurationPolicies/{id}/settings. */
  settings: unknown[];
  /** Whether the policy is assigned to any group or to all devices. */
  assigned: boolean;
}

export type RuleState =
  | { kind: 'mode'; mode: RuleMode; policies: string[] }
  /** Policies set different Rule modes; on a device that gets both, Intune applies neither. */
  | { kind: 'conflict'; policies: { policy: string; mode: RuleMode }[] };

export interface RuleModes {
  rules: { rule: AsrRule; state: RuleState }[];
  /** Policies with ASR rules that are assigned to nobody, so they configure nothing. */
  unassignedPolicies: string[];
  /** ASR settings this version does not know, so the Analysis can say what it left out. */
  unrecognisedSettings: { policy: string; setting: string }[];
}

const MODE_BY_SUFFIX: Record<string, RuleMode> = { off: 'Disabled', audit: 'Audit', warn: 'Warn', block: 'Block' };

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null;
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

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
 * Following Intune's merge behaviour, policies that agree give that Rule mode, and policies that
 * disagree give a conflict: where both apply to a device, Intune holds the rule back.
 */
export function ruleModesFromPolicies(policies: IntunePolicy[]): RuleModes {
  const found = new Map<string, { policy: string; mode: RuleMode }[]>();
  const unassignedPolicies: string[] = [];
  const unrecognisedSettings: RuleModes['unrecognisedSettings'] = [];

  for (const policy of policies) {
    const ruleSettings = asrRuleSettings(policy.settings);
    if (ruleSettings.length === 0) continue;
    if (!policy.assigned) {
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
      found.set(rule.guid, [...(found.get(rule.guid) ?? []), { policy: policy.name, mode }]);
    }
  }

  const rules = ASR_RULES.map((rule) => {
    const configured = found.get(rule.guid) ?? [];
    const modes = new Set(configured.map((entry) => entry.mode));
    const [only] = modes;
    const state: RuleState =
      configured.length === 0
        ? { kind: 'mode', mode: 'Not configured', policies: [] }
        : modes.size === 1 && only
          ? { kind: 'mode', mode: only, policies: configured.map((entry) => entry.policy) }
          : { kind: 'conflict', policies: configured };
    return { rule, state };
  });
  return { rules, unassignedPolicies, unrecognisedSettings };
}
