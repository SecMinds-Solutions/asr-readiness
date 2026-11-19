import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../errorMessage';
import type { Readiness, ReadinessCheck } from './readiness';

export type ReadinessState = { status: 'checking' } | Readiness;

/**
 * Runs the onboarding check once, and again on request (after a role was assigned), then with a new
 * Graph token. While `check` is null nothing is checked yet.
 */
export function useReadiness(check: ReadinessCheck | null) {
  const [state, setState] = useState<ReadinessState>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!check) return;
    let current = true;
    check({ freshToken: attempt > 0 }).then(
      (readiness) => current && setState(readiness),
      (error: unknown) => current && setState({ status: 'failed', message: errorMessage(error) }),
    );
    return () => {
      current = false;
    };
  }, [check, attempt]);

  const checkAgain = useCallback(() => {
    setState({ status: 'checking' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, checkAgain };
}
