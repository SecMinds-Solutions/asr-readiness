import { useCallback, useEffect, useState } from 'react';
import { isConsentError } from './consent';
import type { AuthClient } from './msalAuthClient';
import type { SignedInUser } from './user';

export type AuthState =
  | { status: 'starting' }
  | { status: 'signed-out' }
  | { status: 'redirecting' }
  | { status: 'signed-in'; user: SignedInUser }
  | { status: 'consent-required' }
  | { status: 'failed'; message: string };

function problemFrom(error: unknown): AuthState {
  if (isConsentError(error)) return { status: 'consent-required' };
  return { status: 'failed', message: error instanceof Error ? error.message : 'Unknown error.' };
}

/** Sign-in state for the UI, and the actions that change it. */
export function useAuth(client: AuthClient) {
  const [state, setState] = useState<AuthState>({ status: 'starting' });

  useEffect(() => {
    let current = true;
    client.start().then(
      (user) => current && setState(user ? { status: 'signed-in', user } : { status: 'signed-out' }),
      (error: unknown) => current && setState(problemFrom(error)),
    );
    return () => {
      current = false;
    };
  }, [client]);

  // Both navigate away from the app; a promise that rejects means the redirect did not start.
  const redirect = useCallback(
    (navigate: () => Promise<void>) => {
      setState({ status: 'redirecting' });
      navigate().catch((error: unknown) => setState(problemFrom(error)));
    },
    [],
  );
  const signIn = useCallback(() => redirect(() => client.signIn()), [client, redirect]);
  const signOut = useCallback(() => redirect(() => client.signOut()), [client, redirect]);

  return { state, signIn, signOut };
}
