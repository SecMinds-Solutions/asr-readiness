import { ASR_RULES, INTUNE_ASR_SETTING, ruleByAuditActionType, ruleByConfigurationKey, ruleByIntuneSetting } from './asrRules';

// Checked on 2026-11-17 against Microsoft's ASR rules reference (rule name as "Microsoft Intune
// name", and its GUID) and the Intune settings catalog IDs Microsoft365DSC generates from Graph.
const expected: [string, string, string][] = [
  ['56a863a9-875e-4185-98a7-b882c64b5ce5', 'Block abuse of exploited vulnerable signed drivers (Device)', 'blockabuseofexploitedvulnerablesigneddrivers'],
  ['9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2', 'Block credential stealing from the Windows local security authority subsystem', 'blockcredentialstealingfromwindowslocalsecurityauthoritysubsystem'],
  ['e6db77e5-3df2-4cf1-b95a-636979351e5b', 'Block persistence through WMI event subscription', 'blockpersistencethroughwmieventsubscription'],
  ['7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c', 'Block Adobe Reader from creating child processes', 'blockadobereaderfromcreatingchildprocesses'],
  ['d4f940ab-401b-4efc-aadc-ad5f3c50688a', 'Block all Office applications from creating child processes', 'blockallofficeapplicationsfromcreatingchildprocesses'],
  ['be9ba2d9-53ea-4cdc-84e5-9b1eeee46550', 'Block executable content from email client and webmail', 'blockexecutablecontentfromemailclientandwebmail'],
  ['01443614-cd74-433a-b99e-2ecdc07bfc25', 'Block executable files from running unless they meet a prevalence, age, or trusted list criterion', 'blockexecutablefilesrunningunlesstheymeetprevalenceagetrustedlistcriterion'],
  ['5beb7efe-fd9a-4556-801d-275e5ffc04cc', 'Block execution of potentially obfuscated scripts', 'blockexecutionofpotentiallyobfuscatedscripts'],
  ['d3e037e1-3eb8-44c8-a917-57927947596d', 'Block JavaScript or VBScript from launching downloaded executable content', 'blockjavascriptorvbscriptfromlaunchingdownloadedexecutablecontent'],
  ['3b576869-a4ec-4529-8536-b80a7769e899', 'Block Office applications from creating executable content', 'blockofficeapplicationsfromcreatingexecutablecontent'],
  ['75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84', 'Block Office applications from injecting code into other processes', 'blockofficeapplicationsfrominjectingcodeintootherprocesses'],
  ['26190899-1602-49e8-8b27-eb1d0a1ce869', 'Block Office communication application from creating child processes', 'blockofficecommunicationappfromcreatingchildprocesses'],
  ['d1e49aac-8f56-4280-b9ba-993a6d77406c', 'Block process creations originating from PSExec and WMI commands', 'blockprocesscreationsfrompsexecandwmicommands'],
  ['33ddedf1-c6e0-47cb-833e-de6133960387', 'Block rebooting machine in Safe Mode', 'blockrebootingmachineinsafemode'],
  ['b2b3f03d-6a65-4f7b-a9c7-1c7ef74a9ba4', 'Block untrusted and unsigned processes that run from USB', 'blockuntrustedunsignedprocessesthatrunfromusb'],
  ['c0033c00-d16d-4114-a5a0-dc9b3a7d2ceb', 'Block use of copied or impersonated system tools', 'blockuseofcopiedorimpersonatedsystemtools'],
  ['a8f5898e-1dc8-49a9-9878-85004b8a61e6', 'Block Webshell creation for Servers', 'blockwebshellcreationforservers'],
  ['92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b', 'Block Win32 API calls from Office macros', 'blockwin32apicallsfromofficemacros'],
  ['c1db55ab-c21a-4637-bb3f-a12568109d35', 'Use advanced protection against ransomware', 'useadvancedprotectionagainstransomware'],
];

// Each rule's "Advanced hunting action type" for Audit mode, from the same reference, checked on
// 2026-11-17. Block Webshell creation for Servers has none ("n/a"). Note Safe Mode's "Rebooted".
const auditActionTypes: Record<string, string | null> = {
  '56a863a9-875e-4185-98a7-b882c64b5ce5': 'AsrVulnerableSignedDriverAudited',
  '9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2': 'AsrLsassCredentialTheftAudited',
  'e6db77e5-3df2-4cf1-b95a-636979351e5b': 'AsrPersistenceThroughWmiAudited',
  '7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c': 'AsrAdobeReaderChildProcessAudited',
  'd4f940ab-401b-4efc-aadc-ad5f3c50688a': 'AsrOfficeChildProcessAudited',
  'be9ba2d9-53ea-4cdc-84e5-9b1eeee46550': 'AsrExecutableEmailContentAudited',
  '01443614-cd74-433a-b99e-2ecdc07bfc25': 'AsrUntrustedExecutableAudited',
  '5beb7efe-fd9a-4556-801d-275e5ffc04cc': 'AsrObfuscatedScriptAudited',
  'd3e037e1-3eb8-44c8-a917-57927947596d': 'AsrScriptExecutableDownloadAudited',
  '3b576869-a4ec-4529-8536-b80a7769e899': 'AsrExecutableOfficeContentAudited',
  '75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84': 'AsrOfficeProcessInjectionAudited',
  '26190899-1602-49e8-8b27-eb1d0a1ce869': 'AsrOfficeCommAppChildProcessAudited',
  'd1e49aac-8f56-4280-b9ba-993a6d77406c': 'AsrPsexecWmiChildProcessAudited',
  '33ddedf1-c6e0-47cb-833e-de6133960387': 'AsrSafeModeRebootedAudited',
  'b2b3f03d-6a65-4f7b-a9c7-1c7ef74a9ba4': 'AsrUntrustedUsbProcessAudited',
  'c0033c00-d16d-4114-a5a0-dc9b3a7d2ceb': 'AsrAbusedSystemToolAudited',
  'a8f5898e-1dc8-49a9-9878-85004b8a61e6': null,
  '92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b': 'AsrOfficeMacroWin32ApiCallsAudited',
  'c1db55ab-c21a-4637-bb3f-a12568109d35': 'AsrRansomwareAudited',
};

describe('ASR_RULES', () => {
  it("lists exactly Microsoft's ASR rules with their GUIDs, names and Intune settings", () => {
    expect(ASR_RULES.map((rule) => [rule.guid, rule.name, rule.intuneSetting])).toEqual(
      expected.map(([guid, name, setting]) => [guid, name, `${INTUNE_ASR_SETTING}_${setting}`]),
    );
  });

  it('has no duplicate GUID, name or Intune setting', () => {
    for (const key of ['guid', 'name', 'intuneSetting'] as const) {
      expect(new Set(ASR_RULES.map((rule) => rule[key])).size).toBe(ASR_RULES.length);
    }
  });

  it("has each rule's advanced hunting action type for Audit mode", () => {
    expect(Object.fromEntries(ASR_RULES.map((rule) => [rule.guid, rule.auditActionType]))).toEqual(auditActionTypes);
  });

  it('finds a rule by its audit action type', () => {
    expect(ruleByAuditActionType('AsrSafeModeRebootedAudited')?.guid).toBe('33ddedf1-c6e0-47cb-833e-de6133960387');
    expect(ruleByAuditActionType('AsrSafeModeRebootBlocked')).toBeUndefined();
  });

  it('finds a rule by its Intune setting', () => {
    expect(ruleByIntuneSetting(`${INTUNE_ASR_SETTING}_blockrebootingmachineinsafemode`)?.guid).toBe('33ddedf1-c6e0-47cb-833e-de6133960387');
    expect(ruleByIntuneSetting(`${INTUNE_ASR_SETTING}_somethingelse`)).toBeUndefined();
  });

  // The keys of AdditionalFields.AsrConfigurationStates in advanced hunting's DeviceTvmInfoGathering,
  // as a Tenant reported them on 2026-11-17 (all 19, one per rule).
  it('knows the AsrConfigurationStates key of every ASR rule', () => {
    expect(Object.fromEntries(ASR_RULES.map((rule) => [rule.configurationKey, rule.guid]))).toEqual({
      VulnerableSignedDriver: '56a863a9-875e-4185-98a7-b882c64b5ce5',
      LsassCredentialTheft: '9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2',
      PersistenceThroughWmi: 'e6db77e5-3df2-4cf1-b95a-636979351e5b',
      AdobeReaderChildProcess: '7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c',
      OfficeChildProcess: 'd4f940ab-401b-4efc-aadc-ad5f3c50688a',
      ExecutableEmailContent: 'be9ba2d9-53ea-4cdc-84e5-9b1eeee46550',
      UntrustedExecutable: '01443614-cd74-433a-b99e-2ecdc07bfc25',
      ObfuscatedScript: '5beb7efe-fd9a-4556-801d-275e5ffc04cc',
      ScriptExecutableDownload: 'd3e037e1-3eb8-44c8-a917-57927947596d',
      ExecutableOfficeContent: '3b576869-a4ec-4529-8536-b80a7769e899',
      OfficeProcessInjection: '75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84',
      OfficeCommAppChildProcess: '26190899-1602-49e8-8b27-eb1d0a1ce869',
      PsexecWmiChildProcess: 'd1e49aac-8f56-4280-b9ba-993a6d77406c',
      BlockSafeModeReboot: '33ddedf1-c6e0-47cb-833e-de6133960387',
      UntrustedUsbProcess: 'b2b3f03d-6a65-4f7b-a9c7-1c7ef74a9ba4',
      BlockCopiedOrImpersonatedSystemTools: 'c0033c00-d16d-4114-a5a0-dc9b3a7d2ceb',
      BlockWebshellCreation: 'a8f5898e-1dc8-49a9-9878-85004b8a61e6',
      OfficeMacroWin32ApiCalls: '92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b',
      Ransomware: 'c1db55ab-c21a-4637-bb3f-a12568109d35',
    });
  });

  it('finds a rule by its AsrConfigurationStates key', () => {
    expect(ruleByConfigurationKey('Ransomware')?.guid).toBe('c1db55ab-c21a-4637-bb3f-a12568109d35');
    expect(ruleByConfigurationKey('SomethingNew')).toBeUndefined();
  });
});
