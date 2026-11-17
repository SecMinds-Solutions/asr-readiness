import { createGraphClient, GraphError, type GraphClient } from '../graph/client';
import { HUNTING_CHECK_QUERY } from '../analysis/queries';
import { checkReadiness, createReadinessCheck } from './readiness';

type Answer<T> = T | GraphError | Error;

function fakeGraph({ hunting, intune }: { hunting: Answer<unknown>; intune: Answer<unknown> }) {
  const answer = async (value: Answer<unknown>) => {
    if (value instanceof Error) throw value;
    return value;
  };
  // The fake answers whatever the caller expects; checkReadiness validates the shape itself.
  const graph: GraphClient = {
    get: async <T,>() => (await answer(intune)) as T,
    post: async <T,>() => (await answer(hunting)) as T,
  };
  vi.spyOn(graph, 'get');
  vi.spyOn(graph, 'post');
  return graph;
}

const devices = (count: number) => ({ schema: [{ Name: 'Devices', Type: 'Int64' }], results: [{ Devices: count }] });
const policies = { value: [{ id: 'p1' }] };
const forbidden = (message: string) => new GraphError(403, 'Forbidden', message);

describe('checkReadiness', () => {
  it('reads a small aggregate from advanced hunting and one Intune policy, nothing more', async () => {
    const graph = fakeGraph({ hunting: devices(12), intune: policies });
    await checkReadiness(graph);
    expect(graph.post).toHaveBeenCalledWith('/security/runHuntingQuery', { Query: HUNTING_CHECK_QUERY });
    expect(HUNTING_CHECK_QUERY).toBe('DeviceInfo | where OnboardingStatus == "Onboarded" | summarize Devices = dcount(DeviceId)');
    expect(graph.get).toHaveBeenCalledWith('/deviceManagement/configurationPolicies?$top=1&$select=id', { version: 'beta' });
  });

  it('is ready when advanced hunting has Defender for Endpoint devices and Intune policies can be read', async () => {
    await expect(checkReadiness(fakeGraph({ hunting: devices(12), intune: policies }))).resolves.toEqual({
      status: 'ready',
      devices: 12,
    });
  });

  it('is ready with an empty Intune policy list', async () => {
    await expect(checkReadiness(fakeGraph({ hunting: devices(3), intune: { value: [] } }))).resolves.toMatchObject({
      status: 'ready',
    });
  });

  it('reads the device count whatever the casing of the column', async () => {
    const result = { schema: [], results: [{ devices: 7 }] };
    await expect(checkReadiness(fakeGraph({ hunting: result, intune: policies }))).resolves.toEqual({ status: 'ready', devices: 7 });
  });

  it('says there is nothing to analyse yet when advanced hunting has no onboarded devices', async () => {
    await expect(checkReadiness(fakeGraph({ hunting: devices(0), intune: policies }))).resolves.toEqual({ status: 'no-devices' });
    await expect(checkReadiness(fakeGraph({ hunting: { results: [] }, intune: policies }))).resolves.toEqual({
      status: 'no-devices',
    });
  });

  it('is not supported when advanced hunting has no Defender for Endpoint tables', async () => {
    const noTable = new GraphError(400, 'BadRequest', "Failed to resolve table expression named 'DeviceInfo'.");
    await expect(checkReadiness(fakeGraph({ hunting: noTable, intune: policies }))).resolves.toEqual({
      status: 'not-supported',
      details: "Failed to resolve table expression named 'DeviceInfo'.",
    });
  });

  it('needs access when advanced hunting is refused, which can be a missing role or a missing licence', async () => {
    await expect(
      checkReadiness(fakeGraph({ hunting: forbidden('Missing permission or license.'), intune: policies })),
    ).resolves.toEqual({
      status: 'access-needed',
      advancedHunting: 'refused',
      intune: 'allowed',
      details: ['Advanced hunting: Missing permission or license.'],
    });
  });

  it('needs access when reading Intune policies is refused', async () => {
    await expect(checkReadiness(fakeGraph({ hunting: devices(5), intune: forbidden('No Intune role.') }))).resolves.toEqual({
      status: 'access-needed',
      advancedHunting: 'allowed',
      intune: 'refused',
      details: ['Intune: No Intune role.'],
    });
  });

  it('needs access when Intune wraps its refusal in another HTTP status', async () => {
    const wrapped = JSON.stringify({ ErrorCode: 'Forbidden', Message: JSON.stringify({ Message: 'An error has occurred.' }) });
    const fetchFn: typeof fetch = async (input) =>
      String(input).includes('runHuntingQuery')
        ? new Response(JSON.stringify(devices(5)))
        : new Response(JSON.stringify({ error: { code: 'UnknownError', message: wrapped } }), { status: 401 });
    const graph = createGraphClient(async () => 'graph-token', { fetchFn, sleep: async () => {} });
    await expect(checkReadiness(graph)).resolves.toEqual({
      status: 'access-needed',
      advancedHunting: 'allowed',
      intune: 'refused',
      details: ['Intune: An error has occurred.'],
    });
  });

  it('reports a rejected Intune token as failed, not as a missing role', async () => {
    await expect(
      checkReadiness(
        fakeGraph({ hunting: devices(5), intune: new GraphError(401, 'InvalidAuthenticationToken', 'Access token has expired.') }),
      ),
    ).resolves.toEqual({ status: 'failed', message: 'Intune: Access token has expired.' });
  });

  it('names both when both are refused', async () => {
    await expect(
      checkReadiness(fakeGraph({ hunting: forbidden('No hunting.'), intune: forbidden('No Intune.') })),
    ).resolves.toMatchObject({ status: 'access-needed', advancedHunting: 'refused', intune: 'refused' });
  });

  it('reports a rejected token as failed, not as a missing role', async () => {
    await expect(
      checkReadiness(fakeGraph({ hunting: new GraphError(401, 'InvalidAuthenticationToken', 'Token expired.'), intune: policies })),
    ).resolves.toEqual({ status: 'failed', message: 'Advanced hunting: Token expired.' });
  });

  it('reports another rejected query as failed, not as an unsupported Tenant', async () => {
    await expect(
      checkReadiness(fakeGraph({ hunting: new GraphError(400, 'BadRequest', 'Query exceeded the allowed limits.'), intune: policies })),
    ).resolves.toEqual({ status: 'failed', message: 'Advanced hunting: Query exceeded the allowed limits.' });
  });

  it('reports other failures as failed, not as a missing role or missing data', async () => {
    await expect(
      checkReadiness(fakeGraph({ hunting: new GraphError(503, '', 'Service unavailable.'), intune: policies })),
    ).resolves.toEqual({ status: 'failed', message: 'Advanced hunting: Service unavailable.' });
    await expect(checkReadiness(fakeGraph({ hunting: devices(2), intune: new TypeError('Failed to fetch') }))).resolves.toEqual({
      status: 'failed',
      message: 'Intune: Failed to fetch',
    });
  });

  it.each([[{ results: [{ Devices: 'many' }] }], [{ schema: [] }], [{ results: 'none' }], [null]])(
    'reports the advanced hunting answer %j, which it cannot read, as failed',
    async (answer) => {
      await expect(checkReadiness(fakeGraph({ hunting: answer, intune: policies }))).resolves.toEqual({
        status: 'failed',
        message: 'Advanced hunting: Advanced hunting sent an unexpected answer.',
      });
    },
  );
});

describe('createReadinessCheck', () => {
  it('uses the cached Graph token for the first check', async () => {
    const refresh = vi.fn(async () => {});
    const check = createReadinessCheck(fakeGraph({ hunting: devices(2), intune: policies }), refresh);
    await expect(check({ freshToken: false })).resolves.toEqual({ status: 'ready', devices: 2 });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('gets a new Graph token before checking again, so newly assigned roles count', async () => {
    const order: string[] = [];
    const graph = fakeGraph({ hunting: devices(2), intune: policies });
    vi.mocked(graph.post).mockImplementation(async <T,>() => {
      order.push('graph');
      return devices(2) as T;
    });
    const check = createReadinessCheck(graph, async () => {
      order.push('refresh');
    });
    await check({ freshToken: true });
    expect(order).toEqual(['refresh', 'graph']);
  });

  it('reports a failed token refresh as an error of the check', async () => {
    const check = createReadinessCheck(fakeGraph({ hunting: devices(2), intune: policies }), async () => {
      throw new Error('network');
    });
    await expect(check({ freshToken: true })).rejects.toThrow('network');
  });
});
