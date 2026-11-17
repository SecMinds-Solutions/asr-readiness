// The ASR rule catalogue: the one place that defines ASR rule GUIDs, names and Intune settings.
// GUIDs and names are Microsoft's ASR rules reference ("Microsoft Intune name"); Intune setting
// IDs are the settings catalog IDs of the endpoint security "Attack Surface Reduction Rules"
// profile. asrRules.test.ts pins every entry against those sources.

/** The settings catalog setting that holds all ASR rules of an Intune policy. */
export const INTUNE_ASR_SETTING = 'device_vendor_msft_policy_config_defender_attacksurfacereductionrules';

export interface AsrRule {
  guid: string;
  name: string;
  /** The rule's settings catalog setting ID; its value is this ID plus _off, _block, _audit or _warn. */
  intuneSetting: string;
}

const rule = (guid: string, name: string, setting: string): AsrRule => ({
  guid,
  name,
  intuneSetting: `${INTUNE_ASR_SETTING}_${setting}`,
});

export const ASR_RULES: readonly AsrRule[] = [
  rule('56a863a9-875e-4185-98a7-b882c64b5ce5', 'Block abuse of exploited vulnerable signed drivers (Device)', 'blockabuseofexploitedvulnerablesigneddrivers'),
  rule('9e6c4e1f-7d60-472f-ba1a-a39ef669e4b2', 'Block credential stealing from the Windows local security authority subsystem', 'blockcredentialstealingfromwindowslocalsecurityauthoritysubsystem'),
  rule('e6db77e5-3df2-4cf1-b95a-636979351e5b', 'Block persistence through WMI event subscription', 'blockpersistencethroughwmieventsubscription'),
  rule('7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c', 'Block Adobe Reader from creating child processes', 'blockadobereaderfromcreatingchildprocesses'),
  rule('d4f940ab-401b-4efc-aadc-ad5f3c50688a', 'Block all Office applications from creating child processes', 'blockallofficeapplicationsfromcreatingchildprocesses'),
  rule('be9ba2d9-53ea-4cdc-84e5-9b1eeee46550', 'Block executable content from email client and webmail', 'blockexecutablecontentfromemailclientandwebmail'),
  rule('01443614-cd74-433a-b99e-2ecdc07bfc25', 'Block executable files from running unless they meet a prevalence, age, or trusted list criterion', 'blockexecutablefilesrunningunlesstheymeetprevalenceagetrustedlistcriterion'),
  rule('5beb7efe-fd9a-4556-801d-275e5ffc04cc', 'Block execution of potentially obfuscated scripts', 'blockexecutionofpotentiallyobfuscatedscripts'),
  rule('d3e037e1-3eb8-44c8-a917-57927947596d', 'Block JavaScript or VBScript from launching downloaded executable content', 'blockjavascriptorvbscriptfromlaunchingdownloadedexecutablecontent'),
  rule('3b576869-a4ec-4529-8536-b80a7769e899', 'Block Office applications from creating executable content', 'blockofficeapplicationsfromcreatingexecutablecontent'),
  rule('75668c1f-73b5-4cf0-bb93-3ecf5cb7cc84', 'Block Office applications from injecting code into other processes', 'blockofficeapplicationsfrominjectingcodeintootherprocesses'),
  rule('26190899-1602-49e8-8b27-eb1d0a1ce869', 'Block Office communication application from creating child processes', 'blockofficecommunicationappfromcreatingchildprocesses'),
  rule('d1e49aac-8f56-4280-b9ba-993a6d77406c', 'Block process creations originating from PSExec and WMI commands', 'blockprocesscreationsfrompsexecandwmicommands'),
  rule('33ddedf1-c6e0-47cb-833e-de6133960387', 'Block rebooting machine in Safe Mode', 'blockrebootingmachineinsafemode'),
  rule('b2b3f03d-6a65-4f7b-a9c7-1c7ef74a9ba4', 'Block untrusted and unsigned processes that run from USB', 'blockuntrustedunsignedprocessesthatrunfromusb'),
  rule('c0033c00-d16d-4114-a5a0-dc9b3a7d2ceb', 'Block use of copied or impersonated system tools', 'blockuseofcopiedorimpersonatedsystemtools'),
  rule('a8f5898e-1dc8-49a9-9878-85004b8a61e6', 'Block Webshell creation for Servers', 'blockwebshellcreationforservers'),
  rule('92e97fa1-2edf-4476-bdd6-9dd0b4dddc7b', 'Block Win32 API calls from Office macros', 'blockwin32apicallsfromofficemacros'),
  rule('c1db55ab-c21a-4637-bb3f-a12568109d35', 'Use advanced protection against ransomware', 'useadvancedprotectionagainstransomware'),
];

const bySetting = new Map(ASR_RULES.map((asrRule) => [asrRule.intuneSetting, asrRule]));

export const ruleByIntuneSetting = (settingId: string): AsrRule | undefined => bySetting.get(settingId);
