import { RULES_IN_ADVANCED_HUNTING } from './asrRules';
import { ASR_RULE_MODES_QUERY, AUDIT_EVENT_GROUPS_PER_RULE, AUDIT_EVENT_GROUPS_QUERY, AUDIT_EVENT_TOTALS_QUERY, auditEventFilter } from './queries';

const auditActionTypes = RULES_IN_ADVANCED_HUNTING.map((rule) => rule.auditActionType);
const byGroup =
  'by ActionType, Application = InitiatingProcessFileName, ApplicationFolder = InitiatingProcessFolderPath, Path = FolderPath';

describe('Audit event queries', () => {
  it('read the Audit events of every catalogue rule in the Observation window, and nothing else', () => {
    const filter = auditEventFilter(auditActionTypes);
    expect(filter).toBe(
      `DeviceEvents | where Timestamp > ago(30d) | where ActionType in (${auditActionTypes.map((type) => `"${type}"`).join(', ')})`,
    );
    expect(AUDIT_EVENT_TOTALS_QUERY.startsWith(`${filter} | `)).toBe(true);
    expect(AUDIT_EVENT_GROUPS_QUERY.startsWith(`${filter} | `)).toBe(true);
    expect(auditActionTypes).toHaveLength(18);
  });

  it('aggregate per rule, application and path in KQL instead of returning events', () => {
    expect(AUDIT_EVENT_GROUPS_QUERY).toContain(`| summarize Events = count(), Devices = dcount(DeviceId) ${byGroup} |`);
    expect(AUDIT_EVENT_TOTALS_QUERY).toMatch(
      new RegExp(`\\| summarize Events = count\\(\\) ${byGroup} \\| summarize Events = sum\\(Events\\), Groups = count\\(\\) by ActionType$`),
    );
  });

  it('return the largest groups of each rule, so a noisy rule cannot push out the groups of another', () => {
    expect(AUDIT_EVENT_GROUPS_QUERY).toMatch(
      new RegExp(
        `\\| order by ActionType asc, Events desc \\| extend Rank = row_number\\(1, prev\\(ActionType\\) != ActionType\\) \\| where Rank <= ${AUDIT_EVENT_GROUPS_PER_RULE} \\| project-away Rank$`,
      ),
    );
  });

  it("return at most the groups of every rule together, below advanced hunting's 100,000 rows", () => {
    expect(AUDIT_EVENT_GROUPS_PER_RULE * RULES_IN_ADVANCED_HUNTING.length).toBeLessThan(100_000);
  });

  it('refuse an action type that is not a plain ASR audit action type', () => {
    expect(() => auditEventFilter(['AsrOfficeChildProcessAudited") or true or ("'])).toThrow(/not an ASR audit action type/);
    expect(() => auditEventFilter(['AsrOfficeChildProcessBlocked'])).toThrow(/not an ASR audit action type/);
    expect(() => auditEventFilter([])).toThrow(/No ASR audit action types/);
  });
});

describe('ASR_RULE_MODES_QUERY', () => {
  it('counts devices per ASR rule and Rule mode from the latest report of each device, aggregated in KQL', () => {
    expect(ASR_RULE_MODES_QUERY).toBe(
      'DeviceTvmInfoGathering' +
        ' | where Timestamp > ago(7d)' +
        ' | summarize arg_max(Timestamp, AdditionalFields) by DeviceId' +
        ' | extend States = parse_json(tostring(AdditionalFields.AsrConfigurationStates))' +
        ' | where gettype(States) == "dictionary"' +
        ' | mv-expand kind=array State = States' +
        ' | summarize Devices = count() by Rule = tostring(State[0]), Mode = tostring(State[1])',
    );
  });
});
