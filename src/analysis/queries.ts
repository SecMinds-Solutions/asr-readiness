// Advanced hunting queries. Each aggregates in KQL. The only values in them come from the ASR rule
// catalogue and the thresholds, and are checked before they are used, so nothing else ends up in a query.
import { RULES_IN_ADVANCED_HUNTING } from './asrRules';
import { OBSERVATION_WINDOW_DAYS } from './thresholds';

/**
 * How many devices are onboarded to Defender for Endpoint. Device discovery also lists devices
 * that are not onboarded, which send no audit events, so they are left out.
 */
export const HUNTING_CHECK_QUERY = 'DeviceInfo | where OnboardingStatus == "Onboarded" | summarize Devices = dcount(DeviceId)';

/**
 * Per rule, at most this many application and path groups are returned: the ones with the most
 * Audit events. Advanced hunting returns at most 100,000 rows; the totals query tells which rules
 * have more groups than were returned.
 */
export const AUDIT_EVENT_GROUPS_PER_RULE = 500;

const AUDIT_ACTION_TYPE = /^Asr[A-Za-z0-9]+Audited$/;

/** The Audit events of the given action types in the Observation window. */
export function auditEventFilter(actionTypes: readonly string[]): string {
  if (actionTypes.length === 0) throw new Error('No ASR audit action types to query.');
  for (const type of actionTypes) {
    if (!AUDIT_ACTION_TYPE.test(type)) throw new Error(`${type} is not an ASR audit action type.`);
  }
  const list = actionTypes.map((type) => `"${type}"`).join(', ');
  return `DeviceEvents | where Timestamp > ago(${OBSERVATION_WINDOW_DAYS}d) | where ActionType in (${list})`;
}

const auditEvents = auditEventFilter(RULES_IN_ADVANCED_HUNTING.map((rule) => rule.auditActionType));
/** The application that triggered the rule (file name and folder), and the path of the file the rule acted on. */
const byGroup =
  'by ActionType, Application = InitiatingProcessFileName, ApplicationFolder = InitiatingProcessFolderPath, Path = FolderPath';

/** Per rule: its Audit events and how many application and path groups they fall into. */
export const AUDIT_EVENT_TOTALS_QUERY = `${auditEvents} | summarize Events = count() ${byGroup} | summarize Events = sum(Events), Groups = count() by ActionType`;

/** Per rule, application and path: Audit events and devices, the largest groups of each rule first. */
export const AUDIT_EVENT_GROUPS_QUERY =
  `${auditEvents} | summarize Events = count(), Devices = dcount(DeviceId) ${byGroup}` +
  ' | order by ActionType asc, Events desc | extend Rank = row_number(1, prev(ActionType) != ActionType)' +
  ` | where Rank <= ${AUDIT_EVENT_GROUPS_PER_RULE} | project-away Rank`;

/** The ASR rule states of a DeviceTvmInfoGathering report, one row per rule. */
const asrStates =
  ' | extend States = parse_json(tostring(AdditionalFields.AsrConfigurationStates))' +
  ' | where gettype(States) == "dictionary"' +
  ' | mv-expand kind=array State = States';

/** Devices that have not reported in this many days, such as offboarded ones, are not counted. */
export const RULE_MODE_REPORT_DAYS = 7;

/**
 * Per ASR rule and Rule mode: how many devices report it, from the latest report of each device.
 * AdditionalFields.AsrConfigurationStates holds one key per rule (the catalogue's configurationKey)
 * with its Rule mode on the device, such as Off, Audit or Block, or null. After arg_max there is
 * one row per device and rule, so count() is exact; devices without the field are left out.
 */
export const ASR_RULE_MODES_QUERY =
  'DeviceTvmInfoGathering' +
  ` | where Timestamp > ago(${RULE_MODE_REPORT_DAYS}d)` +
  ' | summarize arg_max(Timestamp, AdditionalFields) by DeviceId' +
  asrStates +
  ' | summarize Devices = count() by Rule = tostring(State[0]), Mode = tostring(State[1])';

/**
 * A device that sends no report for more than this many days, such as a laptop that was off over a
 * weekend, may have changed Rule mode unseen: its Audit period starts again after the gap.
 */
export const REPORT_GAP_DAYS = 3;

/**
 * Per ASR rule: for each device whose latest report (within RULE_MODE_REPORT_DAYS) has the rule in
 * Audit mode, since when it has reported Audit without a break, within the Observation window. A
 * day counts as Audit only when every report that day says Audit; a day that is not, or more than
 * REPORT_GAP_DAYS between one day's last report and the next day's first, breaks the run, which
 * starts at its first report. The period runs to the device's last report, not to now, so time
 * without reports never counts as Audit. A
 * device that switched to Audit during its latest day is counted with 0 days, so that it keeps the
 * rule below the Minimum audit period. Only the number of such devices and the shortest Audit
 * period in whole days come back.
 */
export const AUDIT_PERIOD_QUERY =
  'DeviceTvmInfoGathering' +
  ` | where Timestamp > ago(${OBSERVATION_WINDOW_DAYS}d)` +
  asrStates +
  ' | extend Rule = tostring(State[0]), IsAudit = iff(tostring(State[1]) =~ "Audit", 1, 0)' +
  ' | summarize InAudit = min(IsAudit), FirstReport = min(Timestamp), LastReport = max(Timestamp),' +
  ' LastNotAudit = maxif(Timestamp, IsAudit == 0) by DeviceId, Rule, Day = startofday(Timestamp)' +
  ' | extend EndsInAudit = isnull(LastNotAudit) or LastNotAudit < LastReport' +
  ' | order by DeviceId asc, Rule asc, Day asc' +
  ` | extend StartsRun = InAudit == 1 and (prev(DeviceId) != DeviceId or prev(Rule) != Rule or prev(InAudit) == 0 or FirstReport - prev(LastReport) > ${REPORT_GAP_DAYS}d)` +
  ' | summarize arg_max(Day, InAudit, EndsInAudit, LastReport), AuditSince = maxif(FirstReport, StartsRun) by DeviceId, Rule' +
  // Compared like ASR_RULE_MODES_QUERY does, by report time, so both count the same devices.
  ` | where EndsInAudit and LastReport > ago(${RULE_MODE_REPORT_DAYS}d)` +
  ' | extend Days = iff(InAudit == 1, toint((LastReport - AuditSince) / 1d), 0)' +
  ' | summarize Devices = count(), ShortestDays = min(Days) by Rule';
