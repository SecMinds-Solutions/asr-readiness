import { ASR_RULES } from './asrRules';
import { coverageFromRows } from './coverage';
import { ruleModesResult } from './fixtures/huntingResults';

const ADOBE = '7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c';
const SAFE_MODE = '33ddedf1-c6e0-47cb-833e-de6133960387';
const WEBSHELL = 'a8f5898e-1dc8-49a9-9878-85004b8a61e6';

/** The rows a Tenant's answer gives when every one of `devices` devices reports `mode` for every rule. */
const everyRule = (mode: string, devices: number) => ASR_RULES.map((rule) => ({ Rule: rule.configurationKey, Mode: mode, Devices: devices }));

describe('coverageFromRows', () => {
  it('counts, per rule, the devices on which it is in Audit mode, out of the devices that report', () => {
    const rows = [
      ...everyRule('Off', 3).filter((row) => row.Rule !== 'BlockSafeModeReboot' && row.Rule !== 'AdobeReaderChildProcess'),
      { Rule: 'BlockSafeModeReboot', Mode: 'Audit', Devices: 3 },
      { Rule: 'AdobeReaderChildProcess', Mode: 'Audit', Devices: 1 },
      { Rule: 'AdobeReaderChildProcess', Mode: 'Block', Devices: 2 },
    ];
    const coverage = coverageFromRows(ruleModesResult(...rows).results);
    expect(coverage.devices).toBe(3);
    expect(coverage.auditDevices[SAFE_MODE]).toBe(3);
    expect(coverage.auditDevices[ADOBE]).toBe(1);
    expect(Object.keys(coverage.auditDevices).sort()).toEqual([ADOBE, SAFE_MODE].sort());
  });

  it('counts devices whose value for a rule is empty (null) as reporting, but not in Audit', () => {
    const rows = [
      ...everyRule('Off', 3).filter((row) => row.Rule !== 'BlockWebshellCreation'),
      { Rule: 'BlockWebshellCreation', Mode: '', Devices: 3 },
    ];
    const coverage = coverageFromRows(ruleModesResult(...rows).results);
    expect(coverage.devices).toBe(3);
    expect(coverage.auditDevices[WEBSHELL]).toBeUndefined();
  });

  it('reads the Rule mode whatever its casing', () => {
    const coverage = coverageFromRows(ruleModesResult({ Rule: 'Ransomware', Mode: 'AUDIT', Devices: 2 }).results);
    expect(coverage.auditDevices['c1db55ab-c21a-4637-bb3f-a12568109d35']).toBe(2);
  });

  it('reports keys it does not know instead of dropping them silently', () => {
    const coverage = coverageFromRows(
      ruleModesResult({ Rule: 'Ransomware', Mode: 'Off', Devices: 2 }, { Rule: 'SomethingNew', Mode: 'Audit', Devices: 2 }).results,
    );
    expect(coverage.unrecognisedRules).toEqual(['SomethingNew']);
    expect(coverage.devices).toBe(2);
  });

  it('has no devices when no device reports its ASR rules', () => {
    expect(coverageFromRows([])).toEqual({ devices: 0, auditDevices: {}, unrecognisedRules: [] });
  });

  it('refuses rows it cannot read', () => {
    expect(() => coverageFromRows([{ Rule: 'Ransomware', Mode: 'Audit', Devices: 'many' }])).toThrow(/unexpected answer/);
  });
});
