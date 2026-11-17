import { auditPeriodsResult } from '../analysis/fixtures/huntingResults';
import { AUDIT_PERIOD_QUERY } from '../analysis/queries';
import { fetchAuditPeriods } from './auditPeriods';
import { GraphError, type GraphClient } from './client';
import { HUNTING_TIMEOUT_MS } from './hunting';

function fakeGraph(answer: unknown) {
  const graph: GraphClient = {
    get: async () => Promise.reject(new Error('not used')),
    getAll: async () => Promise.reject(new Error('not used')),
    post: async <T,>() => {
      if (answer instanceof Error) throw answer;
      return answer as T;
    },
  };
  vi.spyOn(graph, 'post');
  return graph;
}

describe('fetchAuditPeriods', () => {
  it('runs the Audit period query through advanced hunting and maps it per rule', async () => {
    const graph = fakeGraph(auditPeriodsResult({ Rule: 'Ransomware', Devices: 3, ShortestDays: 15 }));
    await expect(fetchAuditPeriods(graph)).resolves.toEqual({
      'c1db55ab-c21a-4637-bb3f-a12568109d35': { devices: 3, shortestDays: 15 },
    });
    expect(graph.post).toHaveBeenCalledWith('/security/runHuntingQuery', { Query: AUDIT_PERIOD_QUERY }, { timeoutMs: HUNTING_TIMEOUT_MS });
  });

  it('passes on a throttled advanced hunting as an error, not as no Audit periods', async () => {
    await expect(fetchAuditPeriods(fakeGraph(new GraphError(429, 'TooManyRequests', 'Slow down.')))).rejects.toThrow(/throttled/);
  });
});
