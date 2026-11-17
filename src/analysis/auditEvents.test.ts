import { ASR_RULES, RULES_IN_ADVANCED_HUNTING } from './asrRules';
import { auditEventsFromRows, type AuditEvents } from './auditEvents';
import { FOLDER, groupsResult, totalsResult } from './fixtures/huntingResults';

const OFFICE_CHILD = 'd4f940ab-401b-4efc-aadc-ad5f3c50688a';
const LSASS = '9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2';
const WEBSHELL = 'a8f5898e-1dc8-49a9-9878-85004b8a61e6';

const ruleOf = (events: AuditEvents, guid: string) => events.rules.find((entry) => entry.rule.guid === guid);

const officeTotals = totalsResult({ ActionType: 'AsrOfficeChildProcessAudited', Events: 42, Groups: 2 });
const officeGroups = groupsResult(
  { ActionType: 'AsrOfficeChildProcessAudited', Application: 'WINWORD.EXE', Path: 'C:\\Program Files\\Contoso\\addin.exe', Events: 40, Devices: 9 },
  { ActionType: 'AsrOfficeChildProcessAudited', Application: 'EXCEL.EXE', Path: 'C:\\Windows\\System32\\cmd.exe', Events: 2, Devices: 1 },
);

describe('auditEventsFromRows', () => {
  it('gives every catalogue rule with an audit action type its Audit events per application and path', () => {
    const events = auditEventsFromRows(officeTotals.results, officeGroups.results);
    expect(events.rules).toHaveLength(18);
    expect(ruleOf(events, OFFICE_CHILD)).toEqual({
      rule: ASR_RULES.find((rule) => rule.guid === OFFICE_CHILD),
      events: 42,
      totalGroups: 2,
      complete: true,
      groups: [
        { application: 'WINWORD.EXE', applicationFolder: FOLDER, path: 'C:\\Program Files\\Contoso\\addin.exe', events: 40, devices: 9 },
        { application: 'EXCEL.EXE', applicationFolder: FOLDER, path: 'C:\\Windows\\System32\\cmd.exe', events: 2, devices: 1 },
      ],
    });
  });

  it('gives a rule without Audit events zero events and no groups, as complete', () => {
    expect(ruleOf(auditEventsFromRows([], []), LSASS)).toMatchObject({ events: 0, groups: [], totalGroups: 0, complete: true });
  });

  it('lists the rules advanced hunting has no audit action type for separately', () => {
    const events = auditEventsFromRows([], []);
    expect(events.notInAdvancedHunting.map((rule) => rule.guid)).toEqual([WEBSHELL]);
    expect(ruleOf(events, WEBSHELL)).toBeUndefined();
  });

  it('keeps catalogue order and puts the largest groups first', () => {
    const events = auditEventsFromRows(
      totalsResult({ ActionType: 'AsrOfficeChildProcessAudited', Events: 3, Groups: 2 }).results,
      groupsResult(
        { ActionType: 'AsrOfficeChildProcessAudited', Application: 'a.exe', Path: 'C:\\a.exe', Events: 1, Devices: 1 },
        { ActionType: 'AsrOfficeChildProcessAudited', Application: 'b.exe', Path: 'C:\\b.exe', Events: 2, Devices: 1 },
      ).results,
    );
    expect(events.rules.map((entry) => entry.rule.guid)).toEqual(RULES_IN_ADVANCED_HUNTING.map((rule) => rule.guid));
    expect(ruleOf(events, OFFICE_CHILD)?.groups.map((group) => group.application)).toEqual(['b.exe', 'a.exe']);
  });

  it('marks a rule incomplete when the group limit cut off some of its groups', () => {
    const events = auditEventsFromRows(
      totalsResult({ ActionType: 'AsrOfficeChildProcessAudited', Events: 50, Groups: 3 }).results,
      officeGroups.results,
    );
    expect(ruleOf(events, OFFICE_CHILD)).toMatchObject({ events: 50, totalGroups: 3, complete: false });
    expect(ruleOf(events, OFFICE_CHILD)?.groups).toHaveLength(2);
  });

  it('marks a rule incomplete, with the larger count, when Audit events arrived between the two queries', () => {
    const events = auditEventsFromRows(
      totalsResult({ ActionType: 'AsrOfficeChildProcessAudited', Events: 41, Groups: 2 }).results,
      officeGroups.results,
    );
    expect(ruleOf(events, OFFICE_CHILD)).toMatchObject({ events: 42, totalGroups: 2, complete: false });
  });

  it('marks a rule incomplete, never empty, when its groups arrived without a total', () => {
    const events = auditEventsFromRows([], officeGroups.results);
    expect(ruleOf(events, OFFICE_CHILD)).toMatchObject({ events: 42, totalGroups: 2, complete: false });
  });

  it('keeps an empty application, folder or path as an empty string', () => {
    const events = auditEventsFromRows(
      totalsResult({ ActionType: 'AsrLsassCredentialTheftAudited', Events: 1, Groups: 1 }).results,
      groupsResult({ ActionType: 'AsrLsassCredentialTheftAudited', Application: '', ApplicationFolder: '', Path: '', Events: 1, Devices: 1 }).results,
    );
    expect(ruleOf(events, LSASS)?.groups).toEqual([{ application: '', applicationFolder: '', path: '', events: 1, devices: 1 }]);
  });

  it('matches column names regardless of case', () => {
    const events = auditEventsFromRows(
      [{ actiontype: 'AsrOfficeChildProcessAudited', events: 2, groups: 1 }],
      [{ actionType: 'AsrOfficeChildProcessAudited', application: 'x.exe', applicationfolder: 'C:\\x', path: 'C:\\x.exe', events: 2, devices: 1 }],
    );
    expect(ruleOf(events, OFFICE_CHILD)).toMatchObject({ events: 2, complete: true });
  });

  it.each([
    ['an unknown action type', [{ ActionType: 'AsrSomethingNewAudited', Events: 1, Groups: 1 }], []],
    ['a count that is not a number', [{ ActionType: 'AsrOfficeChildProcessAudited', Events: '1', Groups: 1 }], []],
    ['a row that is not an object', [null], []],
    ['a path that is not text', [], [{ ActionType: 'AsrOfficeChildProcessAudited', Application: 'x.exe', ApplicationFolder: 'C:\\x', Path: 7, Events: 1, Devices: 1 }]],
    ['a group without an application folder', [], [{ ActionType: 'AsrOfficeChildProcessAudited', Application: 'x.exe', Path: 'C:\\x.exe', Events: 1, Devices: 1 }]],
  ])('refuses an unexpected answer: %s', (_case, totals, groups) => {
    expect(() => auditEventsFromRows(totals as unknown[], groups as unknown[])).toThrow('Advanced hunting sent an unexpected answer.');
  });
});
