import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../errorMessage';
import type { Readiness, ReadinessCheck } from './readiness';

export type ReadinessState = { status: 'checking' } | Readiness;

/**
 * Runs the onboarding check once, and again on request (after a role was assigned), then with a new
 * Graph token.
 */
export function useReadiness(check: ReadinessCheck) {
  const [state, setState] = useState<ReadinessState>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
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
