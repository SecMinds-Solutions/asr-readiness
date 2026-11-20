import { assignmentChanged, scriptPatched } from '../analysis/fixtures/intuneAuditEvents';
import { GraphError, type GraphClient } from './client';
import { fetchPolicyChanges } from './policyChanges';

const NOW = new Date('2026-11-20T12:00:00.000Z');
const SINCE = '2026-10-21T12:00:00.000Z';
const PATH = `/deviceManagement/auditEvents?$filter=${encodeURIComponent(`activityDateTime gt ${SINCE} and category eq 'DeviceConfiguration'`)}`;

function fakeGraph(answer: unknown[] | Error) {
  const graph: GraphClient = {
    get: async () => Promise.reject(new Error('not used')),
    post: async () => Promise.reject(new Error('not used')),
    getAll: async <T,>() => {
      if (answer instanceof Error) throw answer;
      return answer as T[];
    },
  };
  vi.spyOn(graph, 'getAll');
  return graph;
}

describe('fetchPolicyChanges', () => {
  it('reads the device configuration audit log of the Observation window and keeps the policy changes', async () => {
    const graph = fakeGraph([assignmentChanged('Delete', 'p1', '2026-11-17T20:03:23Z'), scriptPatched('2026-11-01T08:00:00Z')]);
    await expect(fetchPolicyChanges(graph, NOW)).resolves.toEqual({ since: SINCE, changes: [{ policyId: 'p1', at: '2026-11-17T20:03:23Z' }] });
    expect(graph.getAll).toHaveBeenCalledWith(PATH, { version: 'v1.0' });
  });

  it('says which role and permission are missing when Intune refuses the audit log', async () => {
    const graph = fakeGraph(new GraphError(403, 'Forbidden', 'Application is not authorized to perform this operation.'));
    await expect(fetchPolicyChanges(graph, NOW)).rejects.toThrow(/Intune refused its audit log.*Audit data.*Read/);
  });

  it('passes on a throttled or failed read as an error, not as no changes', async () => {
    await expect(fetchPolicyChanges(fakeGraph(new GraphError(429, 'TooManyRequests', 'Slow down.')), NOW)).rejects.toThrow('Slow down.');
  });
});
