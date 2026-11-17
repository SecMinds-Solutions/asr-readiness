import { ASR_RULES } from './asrRules';
import { asrSettings, choice, excludingGroup, otherSettings, toAllDevices, toAllUsers, toGroup } from './fixtures/intunePolicies';
import { assignmentTargets, ruleModesFromPolicies, type IntunePolicy } from './intuneRuleModes';

/** A policy assigned to all devices unless other assignments are given. */
const policy = (name: string, settings: { value: unknown[] }, assignments: unknown[] = [toAllDevices]): IntunePolicy => ({
  id: name,
  name,
  settings: settings.value,
  assignments,
});

const adobe = (mode: 'off' | 'block' | 'audit' | 'warn') => asrSettings(choice('blockadobereaderfromcreatingchildprocesses', mode));

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

  it('shows a Conflict, with each policy, its Rule mode and targets, when policies that disagree target the same group', () => {
    const { rules } = ruleModesFromPolicies([
      policy('Pilot', adobe('block'), [toGroup('g1')]),
      policy('Audit', adobe('audit'), [toGroup('g1')]),
    ]);
    expect(ruleRow(rules, ADOBE).state).toEqual({
      kind: 'conflict',
      policies: [
        { policy: 'Pilot', mode: 'Block', targets: [{ kind: 'group', groupId: 'g1' }] },
        { policy: 'Audit', mode: 'Audit', targets: [{ kind: 'group', groupId: 'g1' }] },
      ],
    });
  });

  it.each([
    ['All devices', toAllDevices],
    ['All users', toAllUsers],
  ])('shows a Conflict when one of the policies that disagree targets %s', (_name, everyone) => {
    const { rules } = ruleModesFromPolicies([
      policy('Pilot', adobe('block'), [toGroup('g1')]),
      policy('Everyone', adobe('audit'), [everyone]),
    ]);
    expect(ruleRow(rules, ADOBE).state.kind).toBe('conflict');
  });

  it('shows Differs by group, with each Rule mode and its groups, when policies that disagree target different groups', () => {
    const { rules } = ruleModesFromPolicies([
      policy('CIS-ASR-L1', adobe('block'), [toGroup('g-block'), excludingGroup('g-audit')]),
      policy('CIS-ASR-L1-AUDIT', adobe('audit'), [toGroup('g-audit'), toGroup('g-pilot')]),
    ]);
    expect(ruleRow(rules, ADOBE).state).toEqual({
      kind: 'differs-by-group',
      policies: [
        { policy: 'CIS-ASR-L1', mode: 'Block', targets: [{ kind: 'group', groupId: 'g-block' }] },
        {
          policy: 'CIS-ASR-L1-AUDIT',
          mode: 'Audit',
          targets: [
            { kind: 'group', groupId: 'g-audit' },
            { kind: 'group', groupId: 'g-pilot' },
          ],
        },
      ],
    });
  });

  it('keeps a shared target a Conflict even when one policy also excludes that group', () => {
    const { rules } = ruleModesFromPolicies([
      policy('Block', adobe('block'), [toGroup('g1'), excludingGroup('g1')]),
      policy('Audit', adobe('audit'), [toGroup('g1')]),
    ]);
    expect(ruleRow(rules, ADOBE).state.kind).toBe('conflict');
  });

  it('shows a Conflict when one policy targets a group and All users, and another that disagrees targets a different group', () => {
    const { rules } = ruleModesFromPolicies([
      policy('Block', adobe('block'), [toGroup('g1'), toAllUsers]),
      policy('Audit', adobe('audit'), [toGroup('g2')]),
    ]);
    expect(ruleRow(rules, ADOBE).state.kind).toBe('conflict');
  });

  it('does not evaluate assignment filters: the same group with different filters is still a Conflict', () => {
    const filtered = (filterId: string) => ({
      ...toGroup('g1'),
      target: { ...toGroup('g1').target, deviceAndAppManagementAssignmentFilterId: filterId, deviceAndAppManagementAssignmentFilterType: 'include' },
    });
    const { rules } = ruleModesFromPolicies([
      policy('Laptops', adobe('block'), [filtered('f-laptops')]),
      policy('Desktops', adobe('audit'), [filtered('f-desktops')]),
    ]);
    expect(ruleRow(rules, ADOBE).state.kind).toBe('conflict');
  });

  it('keeps agreeing policies a single Rule mode whatever their targets', () => {
    const { rules } = ruleModesFromPolicies([
      policy('Group', adobe('audit'), [toGroup('g1')]),
      policy('Everyone', adobe('audit'), [toAllDevices]),
    ]);
    expect(ruleRow(rules, ADOBE).state).toEqual({ kind: 'mode', mode: 'Audit', policies: ['Group', 'Everyone'] });
  });

  it('decides across three policies: a Conflict as soon as two that disagree share a target', () => {
    const shared = ruleModesFromPolicies([
      policy('Block', adobe('block'), [toGroup('g1')]),
      policy('Audit A', adobe('audit'), [toGroup('g2')]),
      policy('Audit B', adobe('audit'), [toGroup('g1')]),
    ]);
    expect(ruleRow(shared.rules, ADOBE).state.kind).toBe('conflict');

    const separate = ruleModesFromPolicies([
      policy('Block', adobe('block'), [toGroup('g1')]),
      policy('Audit A', adobe('audit'), [toGroup('g2')]),
      policy('Audit B', adobe('audit'), [toGroup('g2'), toGroup('g3')]),
    ]);
    expect(ruleRow(separate.rules, ADOBE).state.kind).toBe('differs-by-group');
  });

  it('treats an assignment target it does not know as shared, so it never hides a Conflict', () => {
    const { rules } = ruleModesFromPolicies([
      policy('Block', adobe('block'), [{ target: { '@odata.type': '#microsoft.graph.configurationManagerCollectionAssignmentTarget', collectionId: 'c1' } }]),
      policy('Audit', adobe('audit'), [toGroup('g2')]),
    ]);
    expect(ruleRow(rules, ADOBE).state.kind).toBe('conflict');
  });

  it('ignores policies that are not assigned, and says which', () => {
    const result = ruleModesFromPolicies([policy('Draft', adobe('block'), [])]);
    expect(ruleRow(result.rules, ADOBE).state).toMatchObject({ kind: 'mode', mode: 'Not configured' });
    expect(result.unassignedPolicies).toEqual(['Draft']);
  });

  it('counts a policy assigned only to excluded groups as not assigned', () => {
    const result = ruleModesFromPolicies([
      policy('Excluded only', adobe('block'), [excludingGroup('g1')]),
      policy('Audit', adobe('audit'), [toGroup('g2')]),
    ]);
    expect(ruleRow(result.rules, ADOBE).state).toEqual({ kind: 'mode', mode: 'Audit', policies: ['Audit'] });
    expect(result.unassignedPolicies).toEqual(['Excluded only']);
  });

  it('reads include targets from Graph assignments and leaves out exclusions', () => {
    expect(assignmentTargets([toGroup('g1'), excludingGroup('g2'), toAllDevices, toAllUsers, { target: {} }, null])).toEqual([
      { kind: 'group', groupId: 'g1' },
      { kind: 'all-devices' },
      { kind: 'all-users' },
      { kind: 'other', type: 'unknown' },
    ]);
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
