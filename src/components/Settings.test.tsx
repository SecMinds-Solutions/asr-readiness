import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SIGN_IN_SCOPES } from '../auth/msalAuthClient';
import { createThemeController, THEME_STORAGE_KEY, type ThemeStorage } from '../theme';
import type { UserRecord } from '../user-record/client';
import type { UserRecordChange } from '../user-record/useUserRecord';
import { PERMISSION_PURPOSES, REQUESTED_PERMISSIONS } from './Permissions';
import { SettingsView } from './Settings';
import { ThemeContext } from './ThemeToggle';

const record: UserRecord = {
  homeTenantId: '11111111-1111-1111-1111-111111111111',
  username: 'ada@contoso.com',
  firstName: 'Ada',
  lastName: '',
  email: 'ada@contoso.com',
  contactConsent: true,
  contactConsentDate: '2026-11-17T10:00:00.000Z',
};

function renderSettings(props: { changing?: UserRecordChange; error?: string; record?: UserRecord } = {}) {
  const onChangeContactConsent = vi.fn();
  const onDelete = vi.fn();
  const view = (next: typeof props) => (
    <SettingsView
      record={next.record ?? record}
      changing={next.changing}
      error={next.error}
      onChangeContactConsent={onChangeContactConsent}
      onDelete={onDelete}
    />
  );
  const { rerender } = render(view(props));
  return { onChangeContactConsent, onDelete, rerender: (next: typeof props) => rerender(view(next)) };
}

const section = (name: string) => screen.getByRole('region', { name });

const openDeleteConfirmation = () => {
  const trigger = screen.getByRole('button', { name: 'Delete my User record' });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Delete your User record?' });
  return { trigger, dialog };
};

describe('SettingsView', () => {
  it('shows the sections in order: Profile, Contact consent, Appearance, Permissions, Delete your data', () => {
    renderSettings();
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Profile',
      'Contact consent',
      'Appearance',
      'Permissions',
      'Delete your data',
    ]);
  });

  it('shows the Profile from the User record, and says when a name is not in the sign-in', () => {
    renderSettings();
    const profile = section('Profile');
    expect(within(profile).getByText('Ada')).toBeInTheDocument();
    expect(within(profile).getByText('Not in your sign-in')).toBeInTheDocument();
    expect(within(profile).getByText(record.homeTenantId)).toBeInTheDocument();
  });

  it('saves a change of Contact consent at once from the switch, and says when it is saved', () => {
    const { onChangeContactConsent, rerender } = renderSettings();
    const consent = within(section('Contact consent')).getByRole('switch', { name: 'SecMinds may email me about its other products' });
    expect(consent).toBeChecked();
    fireEvent.click(consent);
    expect(onChangeContactConsent).toHaveBeenCalledWith(false);

    rerender({ changing: 'contact-consent' });
    expect(within(section('Contact consent')).getByRole('status')).toHaveTextContent('Saving…');
    expect(consent).toBeDisabled();
    rerender({ record: { ...record, contactConsent: false } });
    expect(within(section('Contact consent')).getByRole('status')).toHaveTextContent('Saved');
    expect(consent).not.toBeChecked();
    expect(section('Contact consent')).toHaveTextContent('Not given as of');
  });

  it('shows the stored choice again when saving fails, says why and tries again', () => {
    const { onChangeContactConsent, rerender } = renderSettings();
    fireEvent.click(screen.getByRole('switch'));
    rerender({ changing: 'contact-consent' });
    rerender({ error: 'Your choice could not be saved. HTTP 500.' });
    const consent = within(section('Contact consent'));
    expect(consent.getByRole('switch')).toBeChecked();
    expect(consent.getByRole('status')).toHaveTextContent('');
    expect(consent.getByText(/HTTP 500/)).toBeInTheDocument();
    fireEvent.click(consent.getByRole('button', { name: 'Try again' }));
    expect(onChangeContactConsent).toHaveBeenLastCalledWith(false);
  });

  it('lists exactly the permissions ASR Compass requests, each with what it does', () => {
    renderSettings();
    expect([...REQUESTED_PERMISSIONS].sort()).toEqual(Object.keys(PERMISSION_PURPOSES).sort());
    expect(REQUESTED_PERMISSIONS).toEqual(expect.arrayContaining([...SIGN_IN_SCOPES]));
    const table = within(section('Permissions')).getByRole('table', { name: 'Permissions ASR Compass requests' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual([...REQUESTED_PERMISSIONS]);
    expect(within(table).getAllByText('Delegated, read-only').length).toBeGreaterThan(0);
    expect(section('Permissions')).toHaveTextContent(/An admin withdraws that consent by removing ASR Compass under Enterprise applications/);
  });

  it('shows a delete error in the delete section, not under Contact consent', () => {
    const { rerender } = renderSettings();
    openDeleteConfirmation();
    rerender({ error: 'Your User record could not be deleted. HTTP 503.' });
    expect(within(section('Delete your data')).getByText(/could not be deleted/)).toBeInTheDocument();
    expect(within(section('Contact consent')).queryByText(/could not be deleted/)).toBeNull();
  });

  it('keeps Tab and Shift+Tab inside the delete confirmation', () => {
    renderSettings();
    const { dialog } = openDeleteConfirmation();
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
    const { onDelete } = renderSettings();
    const { trigger, dialog } = openDeleteConfirmation();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('returns focus to the delete button when the confirmation is closed with Escape', async () => {
    renderSettings();
    const { trigger } = openDeleteConfirmation();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

describe('SettingsView: Appearance', () => {
  function renderWithTheme(stored: Record<string, string> = {}) {
    const values = { ...stored };
    const storage: ThemeStorage = {
      getItem: (key) => values[key] ?? null,
      setItem: (key, value) => void (values[key] = value),
      removeItem: (key) => void Reflect.deleteProperty(values, key),
    };
    const root = document.createElement('html');
    const query = { matches: true, addEventListener: () => {}, removeEventListener: () => {} };
    const controller = createThemeController(root, query, () => storage);
    render(
      <ThemeContext.Provider value={controller}>
        <SettingsView record={record} onChangeContactConsent={vi.fn()} onDelete={vi.fn()} />
      </ThemeContext.Provider>,
    );
    return { root, values, controller };
  }

  it('offers Light, Dark and System, with System chosen until the User chooses', () => {
    renderWithTheme();
    const appearance = within(section('Appearance'));
    expect(appearance.getByRole('radio', { name: /System/ })).toBeChecked();
    expect(appearance.getByRole('radio', { name: 'Light' })).not.toBeChecked();
  });

  it('applies a choice at once and remembers it, and System follows the device again', () => {
    const { root, values } = renderWithTheme();
    const appearance = within(section('Appearance'));
    fireEvent.click(appearance.getByRole('radio', { name: 'Light' }));
    expect(root.dataset.theme).toBe('light');
    expect(values[THEME_STORAGE_KEY]).toBe('light');
    fireEvent.click(appearance.getByRole('radio', { name: /System/ }));
    expect(root.dataset.theme).toBe('dark');
    expect(values[THEME_STORAGE_KEY]).toBeUndefined();
  });

  it('stays in step with the theme button in the header', () => {
    const { controller } = renderWithTheme({ [THEME_STORAGE_KEY]: 'dark' });
    expect(within(section('Appearance')).getByRole('radio', { name: 'Dark' })).toBeChecked();
    act(() => controller.choose('light'));
    expect(within(section('Appearance')).getByRole('radio', { name: 'Light' })).toBeChecked();
  });
});
