import { groupsResult, totalsResult } from '../analysis/fixtures/huntingResults';
import { AUDIT_EVENT_GROUPS_QUERY, AUDIT_EVENT_TOTALS_QUERY } from '../analysis/queries';
import { fetchAuditEvents } from './auditEvents';
import { createGraphClient, GraphError, type GraphClient } from './client';
import { HUNTING_TIMEOUT_MS } from './hunting';

function fakeGraph(answer: (query: string) => unknown) {
  const graph: GraphClient = {
    get: async () => Promise.reject(new Error('not used')),
    getAll: async () => Promise.reject(new Error('not used')),
    post: async <T,>(_path: string, body: unknown) => {
      const result = answer((body as { Query: string }).Query);
      if (result instanceof Error || result instanceof DOMException) throw result;
      return result as T;
    },
  };
  vi.spyOn(graph, 'post');
  return graph;
}

const answers = (query: string) =>
  query === AUDIT_EVENT_TOTALS_QUERY
    ? totalsResult({ ActionType: 'AsrRansomwareAudited', Events: 3, Groups: 1 })
    : groupsResult({ ActionType: 'AsrRansomwareAudited', Application: 'tool.exe', Path: 'D:\\Tools\\tool.exe', Events: 3, Devices: 2 });

describe('fetchAuditEvents', () => {
  it('runs the totals and groups queries through advanced hunting and maps the answers', async () => {
    const graph = fakeGraph(answers);
    const events = await fetchAuditEvents(graph);
    expect(vi.mocked(graph.post).mock.calls).toEqual([
      ['/security/runHuntingQuery', { Query: AUDIT_EVENT_TOTALS_QUERY }, { timeoutMs: HUNTING_TIMEOUT_MS }],
      ['/security/runHuntingQuery', { Query: AUDIT_EVENT_GROUPS_QUERY }, { timeoutMs: HUNTING_TIMEOUT_MS }],
    ]);
    const ransomware = events.rules.find((entry) => entry.rule.auditActionType === 'AsrRansomwareAudited');
    expect(ransomware).toMatchObject({ events: 3, complete: true, groups: [{ application: 'tool.exe', path: 'D:\\Tools\\tool.exe', devices: 2 }] });
  });

  it('says advanced hunting is throttled when Graph still answers 429 after its retries', async () => {
    const graph = fakeGraph(() => new GraphError(429, 'TooManyRequests', 'Too many requests.'));
    await expect(fetchAuditEvents(graph)).rejects.toThrow(/Advanced hunting is throttled/);
  });

  it('retries a throttled query a bounded number of times before reporting it', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'TooManyRequests', message: 'Slow down.' } }), { status: 429 }));
    const graph = createGraphClient(async () => 'token', { fetchFn, sleep: async () => undefined });
    await expect(fetchAuditEvents(graph)).rejects.toThrow(/Advanced hunting is throttled/);
    expect(fetchFn).toHaveBeenCalledTimes(2 * 4);
  });

  it('says advanced hunting did not answer in time when a query times out', async () => {
    const timeout = new DOMException('The operation timed out.', 'TimeoutError');
    await expect(fetchAuditEvents(fakeGraph(() => timeout))).rejects.toThrow('Advanced hunting did not answer within 5 minutes. Try again later.');
  });

  it('passes other failures on with their message', async () => {
    const graph = fakeGraph(() => new GraphError(400, 'BadRequest', 'Query exceeded the allowed resources.'));
    await expect(fetchAuditEvents(graph)).rejects.toThrow('Query exceeded the allowed resources.');
  });

  it('refuses an answer it cannot read instead of showing no events', async () => {
    await expect(fetchAuditEvents(fakeGraph(() => ({ value: [] })))).rejects.toThrow('Advanced hunting sent an unexpected answer.');
  });
});
