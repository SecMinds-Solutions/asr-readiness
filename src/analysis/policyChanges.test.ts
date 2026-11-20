import { assignmentChanged, policyPatched, scriptPatched } from './fixtures/intuneAuditEvents';
import { policyChangesFromAuditEvents } from './policyChanges';

const SINCE = '2026-10-21T12:00:00.000Z';

describe('policyChangesFromAuditEvents', () => {
  it('reads a change to a settings catalog policy as a change of that policy at its time', () => {
    expect(policyChangesFromAuditEvents([policyPatched('p1', '2026-11-17T20:04:29.3557495Z')], SINCE)).toEqual({
      since: SINCE,
      changes: [{ policyId: 'p1', at: '2026-11-17T20:04:29.3557495Z' }],
    });
  });

  it('reads a created or deleted assignment as a change of its policy', () => {
    const events = [assignmentChanged('Delete', 'p1', '2026-11-17T20:03:23Z'), assignmentChanged('Create', 'p2', '2026-11-01T08:00:00Z')];
    expect(policyChangesFromAuditEvents(events, SINCE).changes).toEqual([
      { policyId: 'p1', at: '2026-11-17T20:03:23Z' },
      { policyId: 'p2', at: '2026-11-01T08:00:00Z' },
    ]);
  });

  it('takes the policy from the assignment itself when the event does not name the policy', () => {
    const events = [assignmentChanged('Create', 'p1', '2026-11-01T08:00:00Z', { withPolicy: false })];
    expect(policyChangesFromAuditEvents(events, SINCE).changes).toEqual([{ policyId: 'p1', at: '2026-11-01T08:00:00Z' }]);
  });

  it('leaves out events about anything other than settings catalog policies', () => {
    expect(policyChangesFromAuditEvents([scriptPatched('2026-11-01T08:00:00Z')], SINCE).changes).toEqual([]);
  });

  it.each([
    ['an event that is not an object', ['text']],
    ['an event without resources', [{ ...policyPatched('p1', '2026-11-01T08:00:00Z'), resources: undefined }]],
    ['a policy change without a time', [{ ...policyPatched('p1', '2026-11-01T08:00:00Z'), activityDateTime: null }]],
    ['a policy change at a time that is not a date', [policyPatched('p1', 'soon')]],
    ['a policy change without a policy ID', [{ ...policyPatched('p1', '2026-11-01T08:00:00Z'), resources: [{ auditResourceType: 'DeviceManagementConfigurationPolicy' }] }]],
  ])('refuses %s, rather than missing a change', (_, events) => {
    expect(() => policyChangesFromAuditEvents(events, SINCE)).toThrow('Intune sent an unexpected audit log.');
  });
});
