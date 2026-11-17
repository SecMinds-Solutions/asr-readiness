import { huntingRows } from '../analysis/huntingRows';
import { GraphError, type GraphClient } from './client';

/**
 * Advanced hunting can take minutes for a query over the Observation window; Graph stops a query
 * after 10 minutes itself. The app waits at most this long.
 */
export const HUNTING_TIMEOUT_MS = 5 * 60_000;

const THROTTLED =
  'Advanced hunting is throttled: the Tenant has used its advanced hunting quota for now. Wait a few minutes and try again.';
const TIMED_OUT = `Advanced hunting did not answer within ${HUNTING_TIMEOUT_MS / 60_000} minutes. Try again later.`;

/** AbortSignal.timeout() rejects with a DOMException, which is not always an Error instance. */
const isTimeout = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'TimeoutError';

/** Runs one advanced hunting query and returns its result rows. */
export async function runHuntingQuery(graph: GraphClient, query: string): Promise<unknown[]> {
  let result: unknown;
  try {
    result = await graph.post<unknown>('/security/runHuntingQuery', { Query: query }, { timeoutMs: HUNTING_TIMEOUT_MS });
  } catch (error) {
    // The Graph client has already waited and retried; a 429 now means the quota is used up.
    if (error instanceof GraphError && error.status === 429) throw new Error(THROTTLED, { cause: error });
    if (isTimeout(error)) throw new Error(TIMED_OUT, { cause: error });
    throw error;
  }
  return huntingRows(result);
}
