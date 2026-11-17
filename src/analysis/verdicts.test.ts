import { auditEventsFromRows } from './auditEvents';
import type { AuditPeriods } from './auditPeriods';
import { asrSettings, choice, toGroup } from './fixtures/intunePolicies';
import { groupsResult, totalsResult } from './fixtures/huntingResults';
import { ruleModesFromPolicies, type IntunePolicy } from './intuneRuleModes';
import { verdictsFor, type RuleAssessment, type VerdictInput } from './verdicts';

const ADOBE = '7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c';
const LSASS = '9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2';
const WEBSHELL = 'a8f5898e-1dc8-49a9-9878-85004b8a61e6';

type Mode = 'off' | 'block' | 'audit' | 'warn';
const setting = { [ADOBE]: 'blockadobereaderfromcreatingchildprocesses', [LSASS]: 'blockcredentialstealingfromwindowslocalsecurityauthoritysubsystem', [WEBSHELL]: 'blockwebshellcreationforservers' };
const actionType = { [ADOBE]: 'AsrAdobeReaderChildProcessAudited', [LSASS]: 'AsrLsassCredentialTheftAudited' };

const policy = (name: string, rules: Record<string, Mode>, groups = ['g-all']): IntunePolicy => ({
  id: name,
  name,
  settings: asrSettings(...Object.entries(rules).map(([guid, mode]) => choice(setting[guid as keyof typeof setting], mode))).value,
  assignments: groups.map(toGroup),
});

type Group = { application?: string; folder?: string; path: string; events: number };

function input({
  policies = [policy('ASR', { [ADOBE]: 'audit' })],
  periods = { [ADOBE]: { devices: 40, shortestDays: 20 } },
  auditDevices = 40,
  groups = [],
  guid = ADOBE,
  groupsTotal,
}: {
  policies?: IntunePolicy[];
  periods?: AuditPeriods;
  groups?: Group[];
  guid?: string;
  groupsTotal?: { events: number; groups: number };
  auditDevices?: number;
} = {}): VerdictInput {
  const type = actionType[guid as keyof typeof actionType];
  const events = groups.reduce((sum, group) => sum + group.events, 0);
  return {
    modes: ruleModesFromPolicies(policies),
    coverage: { devices: 50, auditDevices: { [ADOBE]: auditDevices, [LSASS]: auditDevices, [WEBSHELL]: auditDevices }, unrecognisedRules: [] },
    auditPeriods: periods,
    auditEvents: auditEventsFromRows(
      groups.length || groupsTotal ? totalsResult({ ActionType: type, Events: groupsTotal?.events ?? events, Groups: groupsTotal?.groups ?? groups.length }).results : [],
      groupsResult(
        ...groups.map((group) => ({
          ActionType: type,
          Application: group.application ?? 'tool.exe',
          ApplicationFolder: group.folder ?? 'C:\\Program Files\\Contoso\\tool.exe',
          Path: group.path,
          Events: group.events,
          Devices: 1,
        })),
      ).results,
    ),
  };
}

const assessmentOf = (value: VerdictInput, guid = ADOBE): RuleAssessment => {
  const found = verdictsFor(value).find((entry) => entry.rule.guid === guid);
  if (!found) throw new Error(`no assessment for ${guid}`);
  return found;
};
const verdictOf = (value: VerdictInput, guid = ADOBE) => {
  const found = assessmentOf(value, guid);
  return found.kind === 'verdict' ? found.verdict : 'Already blocking';
};
const safe = (n: number) => `C:\\Program Files\\Contoso\\app${n}.exe`;

describe('verdictsFor', () => {
  it('gives every catalogue rule an assessment, with its Coverage', () => {
    const all = verdictsFor(input());
    expect(all).toHaveLength(19);
    expect(assessmentOf(input())).toMatchObject({ coverage: { auditDevices: 40, devices: 50 } });
  });

  it('shows a rule in Block mode as Already blocking, not as a Verdict, with a reason and without Coverage', () => {
    expect(assessmentOf(input({ policies: [policy('ASR', { [ADOBE]: 'block' })] }))).toEqual({
      kind: 'already-blocking',
      rule: expect.objectContaining({ guid: ADOBE }),
      reason: 'Intune already sets this rule to Block mode.',
      coverage: null,
    });
  });

  describe('No evidence', () => {
    it.each([
      ['Not configured', [], /not in Audit mode/i],
      ['Disabled', [policy('ASR', { [ADOBE]: 'off' })], /Intune sets it to Disabled/],
      ['Warn', [policy('ASR', { [ADOBE]: 'warn' })], /Intune sets it to Warn/],
    ])('when Intune sets the rule to %s', (_mode, policies, reason) => {
      const found = assessmentOf(input({ policies }));
      expect(found).toMatchObject({ kind: 'verdict', verdict: 'No evidence' });
      expect(found.kind === 'verdict' && found.reason).toMatch(reason);
    });

    it('when Intune policies conflict on the rule', () => {
      const found = assessmentOf(input({ policies: [policy('A', { [ADOBE]: 'audit' }, ['g1']), policy('B', { [ADOBE]: 'block' }, ['g1'])] }));
      expect(found).toMatchObject({ verdict: 'No evidence', reason: expect.stringMatching(/conflict/i) });
    });

    it('when no device reports the rule in Audit mode', () => {
      expect(verdictOf(input({ periods: {} }))).toBe('No evidence');
    });

    it('when the Audit period covers fewer devices than Coverage counts in Audit mode', () => {
      const found = assessmentOf(input({ periods: { [ADOBE]: { devices: 39, shortestDays: 20 } }, auditDevices: 40 }));
      expect(found).toMatchObject({ verdict: 'No evidence', reason: expect.stringContaining('39 of the 40 devices') });
    });

    it('when Coverage counts no device in Audit mode, even if an Audit period was found', () => {
      expect(assessmentOf(input({ auditDevices: 0 }))).toMatchObject({ verdict: 'No evidence', reason: expect.stringContaining('No device reports') });
    });

    it.each([0, 1, 13])('when the shortest Audit period is %i days, below the Minimum audit period of 14', (days) => {
      const found = assessmentOf(input({ periods: { [ADOBE]: { devices: 40, shortestDays: days } } }));
      expect(found).toMatchObject({ verdict: 'No evidence', reason: expect.stringContaining(`for only ${days} day`) });
    });

    it('when advanced hunting records no Audit events for the rule', () => {
      const value = input({ guid: WEBSHELL, policies: [policy('ASR', { [WEBSHELL]: 'audit' })], periods: { [WEBSHELL]: { devices: 3, shortestDays: 20 } }, auditDevices: 3 });
      expect(assessmentOf(value, WEBSHELL)).toMatchObject({ verdict: 'No evidence', reason: expect.stringMatching(/records no Audit events/) });
    });
  });

  describe('Ready to block', () => {
    it.each([14, 15, 30])('in Audit mode for %i days on every device and no Audit events in the Observation window', (days) => {
      const found = assessmentOf(input({ periods: { [ADOBE]: { devices: 40, shortestDays: days } } }));
      expect(found).toMatchObject({ verdict: 'Ready to block', reason: expect.stringContaining('no Audit events in the last 30 days') });
    });

    it('also when only some groups are in Audit mode, and says which', () => {
      const found = assessmentOf(input({ policies: [policy('Pilot', { [ADOBE]: 'audit' }, ['g1']), policy('Rest', { [ADOBE]: 'block' }, ['g2'])] }));
      expect(found).toMatchObject({ verdict: 'Ready to block', reason: expect.stringContaining('Only the groups of Pilot are in Audit mode') });
    });
  });

  describe('Ready with exclusions', () => {
    it.each([1, 4, 5])('when all Audit events come from %i paths, none User-writable', (count) => {
      const groups = Array.from({ length: count }, (_, n) => ({ path: safe(n), events: 3 }));
      const found = assessmentOf(input({ groups }));
      expect(found).toMatchObject({ verdict: 'Ready with exclusions', paths: groups.map((group) => group.path) });
    });

    it('counts one path once, whatever its case or slashes, and across applications', () => {
      const groups = [
        { application: 'a.exe', path: safe(1), events: 2 },
        { application: 'b.exe', path: safe(1).toLowerCase(), events: 1 },
        { application: 'c.exe', path: safe(1).replace(/\\/g, '/'), events: 1 },
      ];
      expect(assessmentOf(input({ groups }))).toMatchObject({ verdict: 'Ready with exclusions', paths: [safe(1)] });
    });

    it('names the process that accesses LSASS for the LSASS rule, not lsass.exe', () => {
      const value = input({
        guid: LSASS,
        policies: [policy('ASR', { [LSASS]: 'audit' })],
        periods: { [LSASS]: { devices: 40, shortestDays: 20 } },
        groups: [
          { application: 'agent.exe', folder: 'C:\\Program Files\\Vendor\\agent.exe', path: 'C:\\Windows\\System32\\lsass.exe', events: 9 },
          { application: 'updater.exe', folder: 'C:\\Program Files\\Vendor', path: 'C:\\Windows\\System32\\lsass.exe', events: 1 },
        ],
      });
      expect(assessmentOf(value, LSASS)).toMatchObject({
        verdict: 'Ready with exclusions',
        paths: ['C:\\Program Files\\Vendor\\agent.exe', 'C:\\Program Files\\Vendor\\updater.exe'],
      });
    });
  });

  describe('Not ready', () => {
    it('when Audit events come from 6 paths, one more than can be excluded', () => {
      const groups = Array.from({ length: 6 }, (_, n) => ({ path: safe(n), events: 1 }));
      expect(assessmentOf(input({ groups }))).toMatchObject({ verdict: 'Not ready', reason: expect.stringContaining('6 paths') });
    });

    it('when any Audit event comes from a User-writable location, even one of few', () => {
      const groups = [
        { path: safe(1), events: 50 },
        { path: 'C:\\Users\\ada\\Downloads\\setup.exe', events: 1 },
      ];
      const found = assessmentOf(input({ groups }));
      expect(found).toMatchObject({ verdict: 'Not ready', reason: expect.stringContaining('User-writable location') });
      expect(found.kind === 'verdict' && found.paths).toEqual([]);
    });

    it('names the kind of User-writable location an Audit event comes from', () => {
      const found = assessmentOf(input({ groups: [{ path: 'C:\\Users\\ada\\Downloads\\setup.exe', events: 1 }] }));
      expect(found).toMatchObject({
        verdict: 'Not ready',
        reason: 'Audit events come from a User-writable location (the Downloads folder), which is never excluded: C:\\Users\\ada\\Downloads\\setup.exe',
      });
    });

    it('when the application that triggered an Audit event runs from a User-writable location, for a rule that excludes the file it acts on', () => {
      const groups = [{ application: 'tool.exe', folder: 'C:\\Users\\ada\\AppData\\Local\\Temp\\tool.exe', path: safe(1), events: 2 }];
      expect(assessmentOf(input({ groups }))).toMatchObject({
        verdict: 'Not ready',
        reason: expect.stringContaining('triggered by an application in a User-writable location (the temp folder)'),
      });
    });

    it('when advanced hunting does not record the folder of the application, for a rule that excludes the file it acts on', () => {
      const groups = [{ application: 'tool.exe', folder: '', path: safe(1), events: 2 }];
      expect(assessmentOf(input({ groups }))).toMatchObject({ verdict: 'Not ready', reason: expect.stringContaining('does not record') });
    });

    it('still allows an application from Program Files for a rule that excludes the file it acts on', () => {
      const groups = [{ application: 'AcroRd32.exe', folder: 'C:\\Program Files\\Adobe\\Acrobat', path: safe(1), events: 2 }];
      expect(verdictOf(input({ groups }))).toBe('Ready with exclusions');
    });

    it('when an Audit event has no path, so nothing can be excluded', () => {
      expect(assessmentOf(input({ groups: [{ path: safe(1), events: 3 }, { path: '', events: 1 }] }))).toMatchObject({
        verdict: 'Not ready',
        reason: 'Audit events have no path, so they cannot be excluded.',
      });
    });

    it('when not every application and path was returned', () => {
      const found = assessmentOf(input({ groups: [{ path: safe(1), events: 3 }], groupsTotal: { events: 9, groups: 2 } }));
      expect(found).toMatchObject({ verdict: 'Not ready', reason: expect.stringMatching(/not every application and path/i) });
    });
  });
});
