import { ruleByConfigurationKey } from './asrRules';
import { numberColumn, textColumn } from './huntingRows';
import type { Coverage } from './ruleOverview';

/**
 * Coverage from the rows of ASR_RULE_MODES_QUERY. Every reporting device has a value for every
 * rule, so the devices of one rule, summed over its Rule modes, are all reporting devices.
 */
export function coverageFromRows(rows: unknown[]): Coverage {
  const devicesPerRule = new Map<string, number>();
  const auditDevices: Record<string, number> = {};
  const unrecognisedRules = new Set<string>();

  for (const row of rows) {
    const key = textColumn(row, 'Rule');
    const mode = textColumn(row, 'Mode');
    const devices = numberColumn(row, 'Devices');
    devicesPerRule.set(key, (devicesPerRule.get(key) ?? 0) + devices);
    const rule = ruleByConfigurationKey(key);
    if (!rule) {
      unrecognisedRules.add(key);
      continue;
    }
    if (mode.toLowerCase() === 'audit') auditDevices[rule.guid] = (auditDevices[rule.guid] ?? 0) + devices;
  }

  return {
    devices: Math.max(0, ...devicesPerRule.values()),
    auditDevices,
    unrecognisedRules: [...unrecognisedRules],
  };
}
