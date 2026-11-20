import { auditPeriodsFrom, type PolicyChanges } from './auditPeriods';
import { asrSettings, choice, toGroup } from './fixtures/intunePolicies';
import { ruleModesFromPolicies, type IntunePolicy } from './intuneRuleModes';

const ADOBE = '7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c';
const LSASS = '9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2';
const setting = { [ADOBE]: 'blockadobereaderfromcreatingchildprocesses', [LSASS]: 'blockcredentialstealingfromwindowslocalsecurityauthoritysubsystem' };

const NOW = new Date('2026-11-20T12:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

function policy(
  id: string,
  rules: Record<string, 'off' | 'block' | 'audit' | 'warn'>,
  { created = daysAgo(100), modified = daysAgo(100), groups = ['g-all'] }: { created?: string; modified?: string; groups?: string[] } = {},
): IntunePolicy {
  return {
    id,
    name: `Policy ${id}`,
    createdDateTime: created,
    lastModifiedDateTime: modified,
    settings: asrSettings(...Object.entries(rules).map(([guid, mode]) => choice(setting[guid as keyof typeof setting], mode))).value,
    assignments: groups.map(toGroup),
  };
}

/** The Intune audit log of the Observation window: 30 days before NOW. */
const log = (...changes: { policyId: string; days: number }[]): PolicyChanges => ({
  since: daysAgo(30),
  changes: changes.map((change) => ({ policyId: change.policyId, at: daysAgo(change.days) })),
});

const periodsOf = (policies: IntunePolicy[], changes = log()) => auditPeriodsFrom(ruleModesFromPolicies(policies), changes, NOW);

describe('auditPeriodsFrom', () => {
  it('counts the Audit period from the last change to the policy that sets the rule', () => {
    expect(periodsOf([policy('p1', { [ADOBE]: 'audit' }, { modified: daysAgo(20) })])[ADOBE]).toEqual({ days: 20, atLeast: false });
  });

  it('counts from an assignment change in the Intune audit log when that is later than the policy change', () => {
    const periods = periodsOf([policy('p1', { [ADOBE]: 'audit' }, { modified: daysAgo(60) })], log({ policyId: 'p1', days: 3 }));
    expect(periods[ADOBE]).toEqual({ days: 3, atLeast: false });
  });

  it('gives at least the 30 days of the audit log when neither the policy nor its assignments changed in them', () => {
    expect(periodsOf([policy('p1', { [ADOBE]: 'audit' }, { modified: daysAgo(60) })])[ADOBE]).toEqual({ days: 30, atLeast: true });
  });

  it('counts from the creation of a policy that was never changed after it', () => {
    expect(periodsOf([policy('p1', { [ADOBE]: 'audit' }, { created: daysAgo(10), modified: daysAgo(10) })])[ADOBE]).toEqual({ days: 10, atLeast: false });
  });

  it.each([
    [daysAgo(14), 14],
    [new Date(NOW.getTime() - 14 * 86_400_000 + 3_600_000).toISOString(), 13],
  ])('counts whole days only: a change at %s is %i days ago', (modified, days) => {
    expect(periodsOf([policy('p1', { [ADOBE]: 'audit' }, { modified })])[ADOBE]).toEqual({ days, atLeast: false });
  });

  it('takes the latest change of every policy that sets the rule, also one that sets it to Block or is unassigned', () => {
    const policies = [
      policy('audit', { [ADOBE]: 'audit' }, { modified: daysAgo(40) }),
      policy('block', { [ADOBE]: 'block' }, { modified: daysAgo(50), groups: ['g-pilot'] }),
      policy('unassigned', { [ADOBE]: 'off' }, { modified: daysAgo(60), groups: [] }),
    ];
    expect(periodsOf(policies, log({ policyId: 'unassigned', days: 5 }))[ADOBE]).toEqual({ days: 5, atLeast: false });
    expect(periodsOf(policies, log({ policyId: 'block', days: 8 }))[ADOBE]).toEqual({ days: 8, atLeast: false });
  });

  it('ignores changes to policies that do not set the rule', () => {
    const policies = [policy('adobe', { [ADOBE]: 'audit' }, { modified: daysAgo(40) }), policy('lsass', { [LSASS]: 'audit' }, { modified: daysAgo(2) })];
    const periods = periodsOf(policies, log({ policyId: 'lsass', days: 1 }, { policyId: 'other', days: 1 }));
    expect(periods[ADOBE]).toEqual({ days: 30, atLeast: true });
    expect(periods[LSASS]).toEqual({ days: 1, atLeast: false });
  });

  it.each([
    ['no creation date', { createdDateTime: undefined }],
    ['no last change date', { lastModifiedDateTime: null }],
    ['a last change date that is not a date', { lastModifiedDateTime: 'yesterday' }],
  ])('gives no Audit period when a policy that sets the rule has %s', (_, dates) => {
    const broken = { ...policy('broken', { [ADOBE]: 'block' }, { groups: ['g-pilot'] }), ...dates };
    expect(periodsOf([policy('p1', { [ADOBE]: 'audit' }), broken])).not.toHaveProperty(ADOBE);
  });

  it('gives no Audit period at all when the start of the audit log is not a date', () => {
    expect(periodsOf([policy('p1', { [ADOBE]: 'audit' })], { since: 'soon', changes: [] })).toEqual({});
  });

  it('gives no Audit period for a rule that no policy sets', () => {
    expect(periodsOf([policy('p1', { [ADOBE]: 'audit' })])).not.toHaveProperty(LSASS);
  });
});
