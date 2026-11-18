// The ASR rule catalogue: the one place that defines ASR rule GUIDs, names and Intune settings.
// GUIDs and names are Microsoft's ASR rules reference ("Microsoft Intune name"); Intune setting
// IDs are the settings catalog IDs of the endpoint security "Attack Surface Reduction Rules"
// profile. Audit action types are the reference's "Advanced hunting action type" for Audit mode.
// Configuration keys are the keys of AsrConfigurationStates in advanced hunting's
// DeviceTvmInfoGathering, which Microsoft does not document: they are taken from a Tenant's answer.
// Which side an exclusion names follows the reference's description of what each rule blocks.
// asrRules.test.ts pins every entry against those sources.

/** The settings catalog setting that holds all ASR rules of an Intune policy. */
export const INTUNE_ASR_SETTING = 'device_vendor_msft_policy_config_defender_attacksurfacereductionrules';

export interface AsrRule {
  guid: string;
  name: string;
  /** The rule's settings catalog setting ID; its value is this ID plus _off, _block, _audit or _warn. */
  intuneSetting: string;
  /** The DeviceEvents ActionType of the rule's Audit events; null when Microsoft lists none. */
  auditActionType: string | null;
  /** The rule's key in DeviceTvmInfoGathering's AdditionalFields.AsrConfigurationStates. */
  configurationKey: string;
  /**
   * Which file an exclusion names: what the rule blocks. For most rules that is the file the rule
   * acts on (`target`, an Audit event's path). The LSASS rule blocks the process that accesses LSASS
   * memory, not lsass.exe (Microsoft's ASR rules reference), so it excludes that process (`source`).
   */
  excludes: 'target' | 'source';
}

/** The rules whose exclusion names the process that triggered the rule. */
const EXCLUDES_SOURCE = new Set(['9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2']);

const rule = (
  guid: string,
  name: string,
  setting: string,
  auditActionType: string | null,
  configurationKey: string,
): AsrRule => ({
  guid,
  name,
  intuneSetting: `${INTUNE_ASR_SETTING}_${setting}`,
  auditActionType,
  configurationKey,
  excludes: EXCLUDES_SOURCE.has(guid) ? 'source' : 'target',
});

export const ASR_RULES: readonly AsrRule[] = [
  rule('56a863a9-875e-4185-98a7-b882c64b5ce5', 'Block abuse of exploited vulnerable signed drivers (Device)', 'blockabuseofexploitedvulnerablesigneddrivers', 'AsrVulnerableSignedDriverAudited', 'VulnerableSignedDriver'),
  rule('9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2', 'Block credential stealing from the Windows local security authority subsystem', 'blockcredentialstealingfromwindowslocalsecurityauthoritysubsystem', 'AsrLsassCredentialTheftAudited', 'LsassCredentialTheft'),
  rule('e6db77e5-3df2-4cf1-b95a-636979351e5b', 'Block persistence through WMI event subscription', 'blockpersistencethroughwmieventsubscription', 'AsrPersistenceThroughWmiAudited', 'PersistenceThroughWmi'),
  rule('7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c', 'Block Adobe Reader from creating child processes', 'blockadobereaderfromcreatingchildprocesses', 'AsrAdobeReaderChildProcessAudited', 'AdobeReaderChildProcess'),
  rule('d4f940ab-401b-4efc-aadc-ad5f3c50688a', 'Block all Office applications from creating child processes', 'blockallofficeapplicationsfromcreatingchildprocesses', 'AsrOfficeChildProcessAudited', 'OfficeChildProcess'),
  rule('be9ba2d9-53ea-4cdc-84e5-9b1eeee46550', 'Block executable content from email client and webmail', 'blockexecutablecontentfromemailclientandwebmail', 'AsrExecutableEmailContentAudited', 'ExecutableEmailContent'),
  rule('01443614-cd74-433a-b99e-2ecdc07bfc25', 'Block executable files from running unless they meet a prevalence, age, or trusted list criterion', 'blockexecutablefilesrunningunlesstheymeetprevalenceagetrustedlistcriterion', 'AsrUntrustedExecutableAudited', 'UntrustedExecutable'),
  rule('5beb7efe-fd9a-4556-801d-275e5ffc04cc', 'Block execution of potentially obfuscated scripts', 'blockexecutionofpotentiallyobfuscatedscripts', 'AsrObfuscatedScriptAudited', 'ObfuscatedScript'),
  rule('d3e037e1-3eb8-44c8-a917-57927947596d', 'Block JavaScript or VBScript from launching downloaded executable content', 'blockjavascriptorvbscriptfromlaunchingdownloadedexecutablecontent', 'AsrScriptExecutableDownloadAudited', 'ScriptExecutableDownload'),
  rule('3b576869-a4ec-4529-8536-b80a7769e899', 'Block Office applications from creating executable content', 'blockofficeapplicationsfromcreatingexecutablecontent', 'AsrExecutableOfficeContentAudited', 'ExecutableOfficeContent'),
  rule('75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84', 'Block Office applications from injecting code into other processes', 'blockofficeapplicationsfrominjectingcodeintootherprocesses', 'AsrOfficeProcessInjectionAudited', 'OfficeProcessInjection'),
  rule('26190899-1602-49e8-8b27-eb1d0a1ce869', 'Block Office communication application from creating child processes', 'blockofficecommunicationappfromcreatingchildprocesses', 'AsrOfficeCommAppChildProcessAudited', 'OfficeCommAppChildProcess'),
  rule('d1e49aac-8f56-4280-b9ba-993a6d77406c', 'Block process creations originating from PSExec and WMI commands', 'blockprocesscreationsfrompsexecandwmicommands', 'AsrPsexecWmiChildProcessAudited', 'PsexecWmiChildProcess'),
  rule('33ddedf1-c6e0-47cb-833e-de6133960387', 'Block rebooting machine in Safe Mode', 'blockrebootingmachineinsafemode', 'AsrSafeModeRebootedAudited', 'BlockSafeModeReboot'),
  rule('b2b3f03d-6a65-4f7b-a9c7-1c7ef74a9ba4', 'Block untrusted and unsigned processes that run from USB', 'blockuntrustedunsignedprocessesthatrunfromusb', 'AsrUntrustedUsbProcessAudited', 'UntrustedUsbProcess'),
  rule('c0033c00-d16d-4114-a5a0-dc9b3a7d2ceb', 'Block use of copied or impersonated system tools', 'blockuseofcopiedorimpersonatedsystemtools', 'AsrAbusedSystemToolAudited', 'BlockCopiedOrImpersonatedSystemTools'),
  rule('a8f5898e-1dc8-49a9-9878-85004b8a61e6', 'Block Webshell creation for Servers', 'blockwebshellcreationforservers', null, 'BlockWebshellCreation'),
  rule('92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b', 'Block Win32 API calls from Office macros', 'blockwin32apicallsfromofficemacros', 'AsrOfficeMacroWin32ApiCallsAudited', 'OfficeMacroWin32ApiCalls'),
  rule('c1db55ab-c21a-4637-bb3f-a12568109d35', 'Use advanced protection against ransomware', 'useadvancedprotectionagainstransomware', 'AsrRansomwareAudited', 'Ransomware'),
];

/** The settings catalog setting under a rule's Rule mode that holds the rule's own exclusions. */
export const intuneExclusionsSetting = (asrRule: AsrRule): string => `${asrRule.intuneSetting}_perruleexclusions`;

const bySetting = new Map(ASR_RULES.map((asrRule) => [asrRule.intuneSetting, asrRule]));

export const ruleByIntuneSetting = (settingId: string): AsrRule | undefined => bySetting.get(settingId);

/** A rule whose Audit events advanced hunting records, under its audit action type. */
export type HuntedAsrRule = AsrRule & { auditActionType: string };

const isHunted = (asrRule: AsrRule): asrRule is HuntedAsrRule => asrRule.auditActionType !== null;

/** The rules whose Audit events advanced hunting records, in catalogue order. */
export const RULES_IN_ADVANCED_HUNTING: readonly HuntedAsrRule[] = ASR_RULES.filter(isHunted);

/** The rules for which Microsoft documents no advanced hunting action type. */
export const RULES_NOT_IN_ADVANCED_HUNTING: readonly AsrRule[] = ASR_RULES.filter((asrRule) => !isHunted(asrRule));

const byAuditActionType = new Map(RULES_IN_ADVANCED_HUNTING.map((asrRule) => [asrRule.auditActionType, asrRule]));

export const ruleByAuditActionType = (actionType: string): AsrRule | undefined => byAuditActionType.get(actionType);

const byConfigurationKey = new Map(ASR_RULES.map((asrRule) => [asrRule.configurationKey, asrRule]));

export const ruleByConfigurationKey = (key: string): AsrRule | undefined => byConfigurationKey.get(key);
