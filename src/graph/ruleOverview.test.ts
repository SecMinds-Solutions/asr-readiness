import { ASR_RULES } from '../analysis/asrRules';
import { ruleModesResult } from '../analysis/fixtures/huntingResults';
import { asrSettings, choice, groupAssignment } from '../analysis/fixtures/intunePolicies';
import type { GraphClient } from './client';
import { fetchRuleOverview } from './ruleOverview';

const ADOBE = '7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c';

const intunePages: Record<string, unknown[]> = {
  '/deviceManagement/configurationPolicies?$select=id,name,platforms': [{ id: 'p1', name: 'ASR pilot', platforms: 'windows10' }],
  '/deviceManagement/configurationPolicies/p1/settings': asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'audit')).value,
  '/deviceManagement/configurationPolicies/p1/assignments': groupAssignment.value,
};

function fakeGraph({ hunting, intune = intunePages }: { hunting: () => unknown; intune?: Record<string, unknown[]> }): GraphClient {
  return {
    get: async () => Promise.reject(new Error('not used')),
    getAll: async <T,>(path: string) => {
      const page = intune[path];
      if (!page) throw new Error('Intune is unavailable.');
      return page as T[];
    },
    post: async <T,>() => hunting() as T,
  };
}

const adobeMode = (overview: Awaited<ReturnType<typeof fetchRuleOverview>>) =>
  overview.modes.rules.find((row) => row.rule.guid === ADOBE)?.state;

describe('fetchRuleOverview', () => {
  it('reads the Rule modes from Intune and the Coverage from advanced hunting', async () => {
    const overview = await fetchRuleOverview(
      fakeGraph({
        hunting: () => ruleModesResult(...ASR_RULES.map((rule) => ({ Rule: rule.configurationKey, Mode: 'Audit', Devices: 4 }))),
      }),
    );
    expect(adobeMode(overview)).toMatchObject({ kind: 'mode', mode: 'Audit' });
    expect(overview.coverage).toMatchObject({ devices: 4 });
  });

  it('still gives the Rule modes when only Coverage cannot be read, with the reason', async () => {
    const overview = await fetchRuleOverview(
      fakeGraph({
        hunting: () => {
          throw new Error('Missing user permissions.');
        },
      }),
    );
    expect(adobeMode(overview)).toMatchObject({ kind: 'mode', mode: 'Audit' });
    expect(overview.coverage).toEqual({ failed: 'Missing user permissions.' });
  });

  it('fails when the Intune policies cannot be read', async () => {
    await expect(fetchRuleOverview(fakeGraph({ hunting: () => ruleModesResult(), intune: {} }))).rejects.toThrow(
      'Intune is unavailable.',
    );
  });
});
