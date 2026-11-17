import { ASR_RULES } from './asrRules';
import { asrSettings, choice, otherSettings } from './fixtures/intunePolicies';
import { ruleModesFromPolicies, type IntunePolicy } from './intuneRuleModes';

const policy = (name: string, settings: { value: unknown[] }, assigned = true): IntunePolicy => ({
  id: name,
  name,
  settings: settings.value,
  assigned,
});

const ruleRow = (rows: ReturnType<typeof ruleModesFromPolicies>['rules'], guid: string) => {
  const row = rows.find((r) => r.rule.guid === guid);
  if (!row) throw new Error(`no row for ${guid}`);
  return row;
};

const ADOBE = '7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c';
const LSASS = '9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2';
const WIN32 = '92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b';
const OFFICE_CHILD = 'd4f940ab-401b-4efc-aadc-ad5f3c50688a';

describe('ruleModesFromPolicies', () => {
  it('lists every ASR rule in the catalogue, Not configured when no policy sets it', () => {
    const { rules } = ruleModesFromPolicies([]);
    expect(rules.map((row) => row.rule.guid)).toEqual(ASR_RULES.map((rule) => rule.guid));
    expect(rules.every((row) => row.state.kind === 'mode' && row.state.mode === 'Not configured')).toBe(true);
  });

  it('reads Audit, Block, Warn and Disabled from an ASR rules policy, with the policy as source', () => {
    const { rules } = ruleModesFromPolicies([
      policy(
        'ASR baseline',
        asrSettings(
          choice('blockadobereaderfromcreatingchildprocesses', 'audit', ['C:\\Tools\\reader.exe']),
          choice('blockwin32apicallsfromofficemacros', 'block'),
          choice('blockallofficeapplicationsfromcreatingchildprocesses', 'warn'),
          choice('blockcredentialstealingfromwindowslocalsecurityauthoritysubsystem', 'off'),
        ),
      ),
    ]);
    expect(ruleRow(rules, ADOBE).state).toEqual({ kind: 'mode', mode: 'Audit', policies: ['ASR baseline'] });
    expect(ruleRow(rules, WIN32).state).toEqual({ kind: 'mode', mode: 'Block', policies: ['ASR baseline'] });
    expect(ruleRow(rules, OFFICE_CHILD).state).toEqual({ kind: 'mode', mode: 'Warn', policies: ['ASR baseline'] });
    expect(ruleRow(rules, LSASS).state).toEqual({ kind: 'mode', mode: 'Disabled', policies: ['ASR baseline'] });
  });

  it('keeps the same Rule mode when several policies agree', () => {
    const { rules } = ruleModesFromPolicies([
      policy('Pilot', asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'audit'))),
      policy('All devices', asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'audit'))),
    ]);
    expect(ruleRow(rules, ADOBE).state).toEqual({ kind: 'mode', mode: 'Audit', policies: ['Pilot', 'All devices'] });
  });

  it('shows a conflict, with each policy and its Rule mode, when policies disagree', () => {
    const { rules } = ruleModesFromPolicies([
      policy('Pilot', asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'block'))),
      policy('All devices', asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'audit'))),
    ]);
    expect(ruleRow(rules, ADOBE).state).toEqual({
      kind: 'conflict',
      policies: [
        { policy: 'Pilot', mode: 'Block' },
        { policy: 'All devices', mode: 'Audit' },
      ],
    });
  });

  it('ignores policies that are not assigned, and says which', () => {
    const result = ruleModesFromPolicies([
      policy('Draft', asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'block')), false),
    ]);
    expect(ruleRow(result.rules, ADOBE).state).toMatchObject({ kind: 'mode', mode: 'Not configured' });
    expect(result.unassignedPolicies).toEqual(['Draft']);
  });

  it('ignores policies without ASR rules', () => {
    const result = ruleModesFromPolicies([policy('Antivirus', otherSettings)]);
    expect(result.rules.every((row) => row.state.kind === 'mode' && row.state.mode === 'Not configured')).toBe(true);
    expect(result.unassignedPolicies).toEqual([]);
    expect(result.unrecognisedSettings).toEqual([]);
  });

  it('reports an ASR setting it does not know instead of dropping it silently', () => {
    const { unrecognisedSettings } = ruleModesFromPolicies([
      policy('Future', asrSettings(choice('blocksomethingnew', 'audit'))),
    ]);
    expect(unrecognisedSettings).toEqual([
      { policy: 'Future', setting: 'device_vendor_msft_policy_config_defender_attacksurfacereductionrules_blocksomethingnew' },
    ]);
  });

  it('reports a rule value it does not know as unrecognised', () => {
    const odd = choice('blockadobereaderfromcreatingchildprocesses', 'audit');
    odd.choiceSettingValue.value = 'device_vendor_msft_policy_config_defender_attacksurfacereductionrules_blockadobereaderfromcreatingchildprocesses_9';
    const { rules, unrecognisedSettings } = ruleModesFromPolicies([policy('Odd', asrSettings(odd))]);
    expect(ruleRow(rules, ADOBE).state).toMatchObject({ mode: 'Not configured' });
    expect(unrecognisedSettings).toHaveLength(1);
  });
});
