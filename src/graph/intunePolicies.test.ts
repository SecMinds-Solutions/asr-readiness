import { asrSettings, choice, groupAssignment, noAssignments, otherSettings } from '../analysis/fixtures/intunePolicies';
import type { GraphClient } from './client';
import { fetchIntunePolicies } from './intunePolicies';

function fakeGraph(pages: Record<string, unknown[]>) {
  const graph: GraphClient = {
    get: async () => Promise.reject(new Error('not used')),
    post: async () => Promise.reject(new Error('not used')),
    getAll: async <T,>(path: string) => {
      const page = pages[path];
      if (!page) throw new Error(`unexpected ${path}`);
      return page as T[];
    },
  };
  vi.spyOn(graph, 'getAll');
  return graph;
}

describe('fetchIntunePolicies', () => {
  it('reads the settings of every Windows policy and the assignments of those with ASR rules', async () => {
    const graph = fakeGraph({
      '/deviceManagement/configurationPolicies?$select=id,name,platforms': [
        { id: 'p1', name: 'ASR rules', platforms: 'windows10' },
        { id: 'p2', name: 'Antivirus', platforms: 'windows10' },
        { id: 'p3', name: 'macOS', platforms: 'macOS' },
      ],
      '/deviceManagement/configurationPolicies/p1/settings': asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'audit')).value,
      '/deviceManagement/configurationPolicies/p1/assignments': groupAssignment.value,
      '/deviceManagement/configurationPolicies/p2/settings': otherSettings.value,
    });
    const policies = await fetchIntunePolicies(graph);
    expect(policies.map(({ id, name, assigned }) => ({ id, name, assigned }))).toEqual([
      { id: 'p1', name: 'ASR rules', assigned: true },
      { id: 'p2', name: 'Antivirus', assigned: false },
    ]);
    expect(policies[0]?.settings).toHaveLength(1);
    for (const [, options] of vi.mocked(graph.getAll).mock.calls) expect(options).toEqual({ version: 'beta' });
    expect(vi.mocked(graph.getAll).mock.calls.map(([path]) => path)).not.toContain('/deviceManagement/configurationPolicies/p2/assignments');
  });

  it('counts a policy assigned only to excluded groups as not assigned', async () => {
    const graph = fakeGraph({
      '/deviceManagement/configurationPolicies?$select=id,name,platforms': [{ id: 'p1', name: 'Excluded', platforms: 'windows10' }],
      '/deviceManagement/configurationPolicies/p1/settings': asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'block')).value,
      '/deviceManagement/configurationPolicies/p1/assignments': [
        { id: 'a', target: { '@odata.type': '#microsoft.graph.exclusionGroupAssignmentTarget', groupId: 'g' } },
      ],
    });
    await expect(fetchIntunePolicies(graph)).resolves.toMatchObject([{ assigned: false }]);
  });

  it('counts an unassigned policy as not assigned', async () => {
    const graph = fakeGraph({
      '/deviceManagement/configurationPolicies?$select=id,name,platforms': [{ id: 'p1', name: 'Draft', platforms: 'windows10' }],
      '/deviceManagement/configurationPolicies/p1/settings': asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'block')).value,
      '/deviceManagement/configurationPolicies/p1/assignments': noAssignments.value,
    });
    await expect(fetchIntunePolicies(graph)).resolves.toMatchObject([{ assigned: false }]);
  });

  it('escapes the policy ID in the path', async () => {
    const graph = fakeGraph({
      '/deviceManagement/configurationPolicies?$select=id,name,platforms': [{ id: 'a/b', name: 'Odd', platforms: 'windows10' }],
      '/deviceManagement/configurationPolicies/a%2Fb/settings': [],
    });
    await expect(fetchIntunePolicies(graph)).resolves.toHaveLength(1);
  });

  it('passes on a failed Graph call', async () => {
    const graph = fakeGraph({});
    await expect(fetchIntunePolicies(graph)).rejects.toThrow();
  });
});
