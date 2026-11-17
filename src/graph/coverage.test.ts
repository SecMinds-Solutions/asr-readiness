import { ASR_RULES } from '../analysis/asrRules';
import { ruleModesResult } from '../analysis/fixtures/huntingResults';
import { ASR_RULE_MODES_QUERY } from '../analysis/queries';
import type { GraphClient } from './client';
import { fetchCoverage } from './coverage';
import { HUNTING_TIMEOUT_MS } from './hunting';

function fakeGraph(answer: unknown) {
  const graph: GraphClient = {
    get: async () => Promise.reject(new Error('not used')),
    getAll: async () => Promise.reject(new Error('not used')),
    post: async <T,>() => answer as T,
  };
  vi.spyOn(graph, 'post');
  return graph;
}

describe('fetchCoverage', () => {
  it('runs the Rule mode query through advanced hunting and returns Coverage', async () => {
    const graph = fakeGraph(ruleModesResult(...ASR_RULES.map((rule) => ({ Rule: rule.configurationKey, Mode: 'Audit', Devices: 4 }))));
    const coverage = await fetchCoverage(graph);
    expect(graph.post).toHaveBeenCalledWith('/security/runHuntingQuery', { Query: ASR_RULE_MODES_QUERY }, { timeoutMs: HUNTING_TIMEOUT_MS });
    expect(coverage).toMatchObject({ devices: 4, unrecognisedRules: [] });
    expect(Object.values(coverage?.auditDevices ?? {})).toEqual(ASR_RULES.map(() => 4));
  });

  it('has no Coverage when no device reports its ASR rules', async () => {
    await expect(fetchCoverage(fakeGraph(ruleModesResult()))).resolves.toBeNull();
  });
});
