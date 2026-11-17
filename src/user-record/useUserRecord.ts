import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../errorMessage';
import type { ContactConsent, UserRecordClient } from './client';

export type UserRecordState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'choice-needed'; saving: boolean; error?: string }
  | { status: 'known'; consent: ContactConsent };

/** Whether the signed-in User has a User record yet, and the action that stores their choice. */
export function useUserRecord(client: UserRecordClient) {
  const [state, setState] = useState<UserRecordState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    client.contactConsent().then(
      (consent) => current && setState(consent ? { status: 'known', consent } : { status: 'choice-needed', saving: false }),
      (error: unknown) => current && setState({ status: 'failed', message: errorMessage(error) }),
    );
    return () => {
      current = false;
    };
  }, [client, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  const saveContactConsent = useCallback(
    (contactConsent: boolean) => {
      setState({ status: 'choice-needed', saving: true });
      client.saveContactConsent(contactConsent).then(
        (consent) => setState({ status: 'known', consent }),
        (error: unknown) => setState({ status: 'choice-needed', saving: false, error: errorMessage(error) }),
      );
    },
    [client],
  );

  return { state, retry, saveContactConsent };
}
