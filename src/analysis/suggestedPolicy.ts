// The Suggested policy (CONTEXT.md): an Intune settings catalog policy, in the JSON the Intune admin
// center imports, that sets the rules an Analysis found ready to Block with their Suggested
// exclusions. It holds only those rules, so every other rule stays as the Tenant's own policies set
// it (ADR-0008). Pure: no network, storage or React.
import { ASR_RULES, INTUNE_ASR_SETTING, intuneExclusionsSetting, type AsrRule } from './asrRules';
import { localDate } from '../localDate';
import { userWritableLocation } from './userWritable';
import type { RuleAssessment, VerdictCoverage } from './verdicts';

/** A rule the Suggested policy sets to Block, with its Suggested exclusions. */
export interface SuggestedRule {
  rule: AsrRule;
  verdict: 'Ready to block' | 'Ready with exclusions';
  exclusions: string[];
  /** The devices the rule's Verdict speaks for. */
  coverage: VerdictCoverage | null;
}

/** A settings catalog policy as the Intune admin center's "Import policy" reads it. */
export interface SettingsCatalogPolicy {
  name: string;
  description: string;
  platforms: 'windows10';
  technologies: 'mdm';
  roleScopeTagIds: string[];
  templateReference: { templateId: ''; templateFamily: 'none'; templateDisplayName: null; templateDisplayVersion: null };
  settings: unknown[];
}

export interface SuggestedPolicy {
  rules: SuggestedRule[];
  policy: SettingsCatalogPolicy;
  /** The name to save the policy under. */
  fileName: string;
}

function readyRule(assessment: RuleAssessment): SuggestedRule | null {
  if (assessment.kind !== 'verdict') return null;
  const { rule, verdict, paths, coverage } = assessment;
  if (verdict === 'Ready to block') return { rule, verdict, exclusions: [], coverage };
  if (verdict !== 'Ready with exclusions') return null;
  // The Verdicts already guarantee both; the policy is advice to block, so it checks again rather than trusts.
  if (paths.length === 0) throw new Error(`${rule.name} is Ready with exclusions but has no Suggested exclusions.`);
  for (const path of paths) {
    const location = userWritableLocation(path);
    if (location) throw new Error(`${rule.name} has a Suggested exclusion in a User-writable location (${location}): ${path}`);
  }
  return { rule, verdict, exclusions: paths, coverage };
}

const stringValue = (value: string) => ({
  '@odata.type': '#microsoft.graph.deviceManagementConfigurationStringSettingValue',
  settingValueTemplateReference: null,
  value,
});

/** One rule's setting: its Rule mode set to Block, and its exclusions under it when it has any. */
const blockSetting = ({ rule, exclusions }: SuggestedRule) => ({
  '@odata.type': '#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance',
  settingDefinitionId: rule.intuneSetting,
  settingInstanceTemplateReference: null,
  choiceSettingValue: {
    settingValueTemplateReference: null,
    value: `${rule.intuneSetting}_block`,
    children:
      exclusions.length === 0
        ? []
        : [
            {
              '@odata.type': '#microsoft.graph.deviceManagementConfigurationSimpleSettingCollectionInstance',
              settingDefinitionId: intuneExclusionsSetting(rule),
              settingInstanceTemplateReference: null,
              simpleSettingCollectionValue: exclusions.map(stringValue),
            },
          ],
  },
});

/**
 * The Suggested policy for an Analysis: the Ready to block and Ready with exclusions rules set to
 * Block, in catalogue order, with their Suggested exclusions. Null when no rule is ready. Throws when
 * a Ready with exclusions rule has no Suggested exclusions or one in a User-writable location.
 */
export function suggestedPolicy(assessments: readonly RuleAssessment[], created: Date): SuggestedPolicy | null {
  const ready = new Map<string, SuggestedRule>();
  for (const assessment of assessments) {
    const rule = readyRule(assessment);
    if (rule) ready.set(rule.rule.guid, rule);
  }
  const rules = ASR_RULES.flatMap((rule) => ready.get(rule.guid) ?? []);
  if (rules.length === 0) return null;

  const date = localDate(created);
  return {
    rules,
    fileName: `asr-readiness-suggested-policy-${date}.json`,
    policy: {
      name: `ASR Readiness suggested policy ${date}`,
      description: `Suggested by ASR Readiness on ${date}. Sets the ASR rules that were Ready to block or Ready with exclusions to Block, with their Suggested exclusions. Rules that were not ready are not in this policy.`,
      platforms: 'windows10',
      technologies: 'mdm',
      roleScopeTagIds: ['0'],
      templateReference: { templateId: '', templateFamily: 'none', templateDisplayName: null, templateDisplayVersion: null },
      settings: [
        {
          '@odata.type': '#microsoft.graph.deviceManagementConfigurationSetting',
          settingInstance: {
            '@odata.type': '#microsoft.graph.deviceManagementConfigurationGroupSettingCollectionInstance',
            settingDefinitionId: INTUNE_ASR_SETTING,
            settingInstanceTemplateReference: null,
            groupSettingCollectionValue: [{ settingValueTemplateReference: null, children: rules.map(blockSetting) }],
          },
        },
      ],
    },
  };
}
