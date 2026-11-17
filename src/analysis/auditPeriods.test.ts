import { auditPeriodsFromRows } from './auditPeriods';
import { auditPeriodsResult } from './fixtures/huntingResults';

const ADOBE = '7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c';

describe('auditPeriodsFromRows', () => {
  it('gives each rule the devices now in Audit mode and the shortest Audit period among them', () => {
    const periods = auditPeriodsFromRows(
      auditPeriodsResult({ Rule: 'AdobeReaderChildProcess', Devices: 12, ShortestDays: 9 }).results,
    );
    expect(periods).toEqual({ [ADOBE]: { devices: 12, shortestDays: 9 } });
  });

  it('leaves out keys the catalogue does not know; Coverage already lists them', () => {
    expect(auditPeriodsFromRows(auditPeriodsResult({ Rule: 'SomethingNew', Devices: 1, ShortestDays: 1 }).results)).toEqual({});
  });

  it('refuses an unexpected answer', () => {
    expect(() => auditPeriodsFromRows([{ Rule: 'AdobeReaderChildProcess', Devices: '1' }])).toThrow('Advanced hunting sent an unexpected answer.');
  });
});
