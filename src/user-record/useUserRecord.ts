import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../errorMessage';
import type { UserRecord, UserRecordClient } from './client';

/** What a known User is changing in their record right now. */
export type UserRecordChange = 'contact-consent' | 'delete';

export type UserRecordState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'choice-needed'; saving: boolean; error?: string }
  | { status: 'known'; record: UserRecord; changing?: UserRecordChange; error?: string }
  /** The User deleted their record in this session; nothing is stored until they make a new choice. */
  | { status: 'deleted' };

/** The signed-in User's record, and the actions that store their choice, change it or delete the record. */
export function useUserRecord(client: UserRecordClient) {
  const [state, setState] = useState<UserRecordState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    client.userRecord().then(
      (record) => current && setState(record ? { status: 'known', record } : { status: 'choice-needed', saving: false }),
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

  /** A new User's first choice, made before anything else. */
  const saveContactConsent = useCallback(
    (contactConsent: boolean) => {
      setState({ status: 'choice-needed', saving: true });
      client.saveContactConsent(contactConsent).then(
        (record) => setState({ status: 'known', record }),
        (error: unknown) => setState({ status: 'choice-needed', saving: false, error: errorMessage(error) }),
      );
    },
    [client],
  );

  /** A known User gives or withdraws their Contact consent; the record keeps showing while it is stored. */
  const changeContactConsent = useCallback(
    (record: UserRecord, contactConsent: boolean) => {
      setState({ status: 'known', record, changing: 'contact-consent' });
      client.saveContactConsent(contactConsent).then(
        (saved) => setState({ status: 'known', record: saved }),
        (error: unknown) => setState({ status: 'known', record, error: `Your choice could not be saved. ${errorMessage(error)}` }),
      );
    },
    [client],
  );

  const deleteUserRecord = useCallback(
    (record: UserRecord) => {
      setState({ status: 'known', record, changing: 'delete' });
      client.deleteUserRecord().then(
        () => setState({ status: 'deleted' }),
        (error: unknown) => setState({ status: 'known', record, error: `Your User record could not be deleted. ${errorMessage(error)}` }),
      );
    },
    [client],
  );

  return { state, retry, saveContactConsent, changeContactConsent, deleteUserRecord };
}
