import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from './errorMessage';

export type LoadState<T> = { status: 'loading' } | { status: 'loaded'; value: T } | { status: 'failed'; message: string };

/** Runs `load` once, and again on `reload`; a failure keeps its message for the UI. */
export function useLoad<T>(load: () => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    load().then(
      (value) => current && setState({ status: 'loaded', value }),
      (error: unknown) => current && setState({ status: 'failed', message: errorMessage(error) }),
    );
    return () => {
      current = false;
    };
  }, [load, attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, reload };
}
