import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { UserRecord } from '../user-record/client';
import { UserRecordCard } from './Privacy';

const record: UserRecord = {
  homeTenantId: '11111111-1111-1111-1111-111111111111',
  username: 'ada@contoso.com',
  firstName: 'Ada',
  lastName: '',
  email: 'ada@contoso.com',
  contactConsent: true,
  contactConsentDate: '2026-11-17T10:00:00.000Z',
};

const renderCard = (onDelete = vi.fn()) => {
  render(<UserRecordCard record={record} onChangeContactConsent={vi.fn()} onDelete={onDelete} />);
  const trigger = screen.getByRole('button', { name: 'Delete my User record' });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Delete your User record?' });
  return { trigger, dialog };
};

describe('UserRecordCard', () => {
  it('says when a name is not in the sign-in', () => {
    render(<UserRecordCard record={record} onChangeContactConsent={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Not in your sign-in')).toBeInTheDocument();
  });

  it('keeps Tab and Shift+Tab inside the delete confirmation', () => {
    const { dialog } = renderCard();
    const buttons = within(dialog).getAllByRole('button');
    const first = buttons[0] as HTMLElement;
    const last = buttons[buttons.length - 1] as HTMLElement;
    expect(dialog).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('returns focus to the delete button when the confirmation is cancelled, and deletes nothing', async () => {
    const onDelete = vi.fn();
    const { trigger, dialog } = renderCard(onDelete);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('returns focus to the delete button when the confirmation is closed with Escape', async () => {
    const { trigger } = renderCard();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
