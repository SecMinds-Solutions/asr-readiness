import { ASR_RULES, type AsrRule } from './asrRules';
import { ruleModesFromPolicies } from './intuneRuleModes';
import { toAllDevices } from './fixtures/intunePolicies';
import { suggestedPolicy } from './suggestedPolicy';
import type { RuleAssessment, Verdict } from './verdicts';

const ruleOf = (guid: string): AsrRule => {
  const found = ASR_RULES.find((entry) => entry.guid === guid);
  if (!found) throw new Error(`No rule ${guid}`);
  return found;
};

const ADOBE = ruleOf('7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c');
const LSASS = ruleOf('9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2');
const WMI = ruleOf('e6db77e5-3df2-4cf1-b95a-636979351e5b');
const OFFICE = ruleOf('d4f940ab-401b-4efc-aadc-ad5f3c50688a');
const USB = ruleOf('b2b3f03d-6a65-4f7b-a9c7-1c7ef74a9ba4');
const DRIVERS = ruleOf('56a863a9-875e-4185-98a7-b882c64b5ce5');

const coverage = { auditDevices: 40, devices: 50 };

const verdict = (rule: AsrRule, value: Verdict, paths: string[] = []): RuleAssessment => ({
  kind: 'verdict',
  rule,
  verdict: value,
  reason: 'reason',
  paths,
  coverage,
});

/** A fixture Analysis with every outcome: two ready rules, one with exclusions, and three that are not. */
const analysis: RuleAssessment[] = [
  verdict(WMI, 'Ready to block'),
  verdict(LSASS, 'Ready with exclusions', ['C:\\Program Files\\Contoso\\agent.exe']),
  verdict(ADOBE, 'Ready with exclusions', ['C:\\Program Files\\Contoso\\viewer.exe', 'C:\\Windows\\System32\\cmd.exe']),
  verdict(OFFICE, 'Not ready'),
  verdict(USB, 'No evidence'),
  { kind: 'already-blocking', rule: DRIVERS, reason: 'reason', coverage: null },
];

const created = new Date(2026, 10, 18, 10, 15);
const PREFIX = 'device_vendor_msft_policy_config_defender_attacksurfacereductionrules';

describe('suggestedPolicy', () => {
  it('pins the settings catalog policy for a fixture Analysis', () => {
    expect(suggestedPolicy(analysis, created)?.policy).toEqual({
      name: 'ASR Compas suggested policy 2026-11-18',
      description:
        'Suggested by ASR Compas on 2026-11-18. Sets the ASR rules that were Ready to block or Ready with exclusions to Block, with their Suggested exclusions. Rules that were not ready are not in this policy.',
      platforms: 'windows10',
      technologies: 'mdm',
      roleScopeTagIds: ['0'],
      templateReference: { templateId: '', templateFamily: 'none', templateDisplayName: null, templateDisplayVersion: null },
      settings: [
        {
          '@odata.type': '#microsoft.graph.deviceManagementConfigurationSetting',
          settingInstance: {
            '@odata.type': '#microsoft.graph.deviceManagementConfigurationGroupSettingCollectionInstance',
            settingDefinitionId: PREFIX,
            settingInstanceTemplateReference: null,
            groupSettingCollectionValue: [
              {
                settingValueTemplateReference: null,
                children: [
                  {
                    '@odata.type': '#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance',
                    settingDefinitionId: `${PREFIX}_blockcredentialstealingfromwindowslocalsecurityauthoritysubsystem`,
                    settingInstanceTemplateReference: null,
                    choiceSettingValue: {
                      settingValueTemplateReference: null,
                      value: `${PREFIX}_blockcredentialstealingfromwindowslocalsecurityauthoritysubsystem_block`,
                      children: [
                        {
                          '@odata.type': '#microsoft.graph.deviceManagementConfigurationSimpleSettingCollectionInstance',
                          settingDefinitionId: `${PREFIX}_blockcredentialstealingfromwindowslocalsecurityauthoritysubsystem_perruleexclusions`,
                          settingInstanceTemplateReference: null,
                          simpleSettingCollectionValue: [
                            {
                              '@odata.type': '#microsoft.graph.deviceManagementConfigurationStringSettingValue',
                              settingValueTemplateReference: null,
                              value: 'C:\\Program Files\\Contoso\\agent.exe',
                            },
                          ],
                        },
                      ],
                    },
                  },
                  {
                    '@odata.type': '#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance',
                    settingDefinitionId: `${PREFIX}_blockpersistencethroughwmieventsubscription`,
                    settingInstanceTemplateReference: null,
                    choiceSettingValue: {
                      settingValueTemplateReference: null,
                      value: `${PREFIX}_blockpersistencethroughwmieventsubscription_block`,
                      children: [],
                    },
                  },
                  {
                    '@odata.type': '#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance',
                    settingDefinitionId: `${PREFIX}_blockadobereaderfromcreatingchildprocesses`,
                    settingInstanceTemplateReference: null,
                    choiceSettingValue: {
                      settingValueTemplateReference: null,
                      value: `${PREFIX}_blockadobereaderfromcreatingchildprocesses_block`,
                      children: [
                        {
                          '@odata.type': '#microsoft.graph.deviceManagementConfigurationSimpleSettingCollectionInstance',
                          settingDefinitionId: `${PREFIX}_blockadobereaderfromcreatingchildprocesses_perruleexclusions`,
                          settingInstanceTemplateReference: null,
                          simpleSettingCollectionValue: [
                            {
                              '@odata.type': '#microsoft.graph.deviceManagementConfigurationStringSettingValue',
                              settingValueTemplateReference: null,
                              value: 'C:\\Program Files\\Contoso\\viewer.exe',
                            },
                            {
                              '@odata.type': '#microsoft.graph.deviceManagementConfigurationStringSettingValue',
                              settingValueTemplateReference: null,
                              value: 'C:\\Windows\\System32\\cmd.exe',
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    });
  });

  it('lists the rules it sets to Block with their Suggested exclusions, in catalogue order', () => {
    expect(suggestedPolicy(analysis, created)?.rules).toEqual([
      { rule: LSASS, verdict: 'Ready with exclusions', exclusions: ['C:\\Program Files\\Contoso\\agent.exe'], coverage },
      { rule: WMI, verdict: 'Ready to block', exclusions: [], coverage },
      {
        rule: ADOBE,
        verdict: 'Ready with exclusions',
        exclusions: ['C:\\Program Files\\Contoso\\viewer.exe', 'C:\\Windows\\System32\\cmd.exe'],
        coverage,
      },
    ]);
  });

  it('leaves out Not ready, No evidence and Already blocking rules, so it leaves them unchanged', () => {
    const json = JSON.stringify(suggestedPolicy(analysis, created)?.policy);
    for (const rule of [OFFICE, USB, DRIVERS]) expect(json).not.toContain(rule.intuneSetting);
  });

  it('reads back as Block for exactly the ready rules, as the Tenant\'s own policies are read', () => {
    const settings = suggestedPolicy(analysis, created)?.policy.settings ?? [];
    const modes = ruleModesFromPolicies([{ id: 'p', name: 'Suggested', settings, assignments: [toAllDevices] }]);
    const blocked = modes.rules.filter((entry) => entry.state.kind === 'mode' && entry.state.mode === 'Block').map((entry) => entry.rule);
    expect(blocked).toEqual([LSASS, WMI, ADOBE]);
    expect(modes.unrecognisedSettings).toEqual([]);
  });

  it('gives no Suggested policy when no rule is ready', () => {
    expect(suggestedPolicy([verdict(OFFICE, 'Not ready'), verdict(USB, 'No evidence')], created)).toBeNull();
  });

  it('refuses a Suggested exclusion in a User-writable location', () => {
    const unsafe = [verdict(ADOBE, 'Ready with exclusions', ['C:\\Users\\alex\\Downloads\\viewer.exe'])];
    expect(() => suggestedPolicy(unsafe, created)).toThrow(/User-writable/);
  });

  it('refuses a Ready with exclusions rule without Suggested exclusions', () => {
    expect(() => suggestedPolicy([verdict(ADOBE, 'Ready with exclusions')], created)).toThrow(/no Suggested exclusions/);
  });

  it('names the policy after the local date it was made', () => {
    const lateEvening = new Date(2026, 10, 18, 23, 30);
    expect(suggestedPolicy([verdict(WMI, 'Ready to block')], lateEvening)?.policy.name).toBe('ASR Compas suggested policy 2026-11-18');
  });
});
