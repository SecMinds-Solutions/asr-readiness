import { fireEvent, render, screen, within } from '@testing-library/react';
import type { UserRecord, UserRecordClient } from '../user-record/client';
import { AdminPage } from './Admin';

const tenantA = '11111111-1111-1111-1111-111111111111';
const tenantB = '22222222-2222-2222-2222-222222222222';

const user = (username: string, homeTenantId: string, contactConsent: boolean): UserRecord => ({
  homeTenantId,
  username,
  firstName: 'First',
  lastName: 'Last',
  email: username,
  contactConsent,
  contactConsentDate: '2026-11-17T10:00:00.000Z',
});

const users = [user('ada@a.com', tenantA, true), user('grace@b.com', tenantB, false), user('alan@a.com', tenantA, false)];

function client(records: UserRecord[]): UserRecordClient {
  return {
    userRecord: vi.fn(),
    saveContactConsent: vi.fn(),
    deleteUserRecord: vi.fn(),
    listUserRecords: vi.fn(async () => ({ status: 'allowed' as const, users: records })),
  };
}

const statValue = (label: string) =>
  screen.getByText(label, { selector: '.sm-stat span' }).parentElement?.querySelector('strong')?.textContent;

describe('AdminPage: filter and counts', () => {
  it('shows the total, the Users with Contact consent and the number of Home tenants', async () => {
    render(<AdminPage client={client(users)} />);
    await screen.findByRole('table', { name: 'Every stored User record' });
    expect(statValue('Users')).toBe('3');
    expect(statValue('With Contact consent')).toBe('1');
    expect(statValue('Home tenants')).toBe('2');
  });

  it('lists the number of Users per Home tenant, most first', async () => {
    render(<AdminPage client={client(users)} />);
    const perTenant = await screen.findByRole('table', { name: 'Users per Home tenant' });
    const rows = within(perTenant).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([`${tenantA}2`, `${tenantB}1`]);
  });

  it('narrows the table to Users with Contact consent, and shows all again when turned off', async () => {
    render(<AdminPage client={client(users)} />);
    const table = await screen.findByRole('table', { name: 'Every stored User record' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);

    const filter = screen.getByRole('checkbox', { name: 'Only Users with Contact consent' });
    fireEvent.click(filter);
    const filtered = screen.getByRole('table', { name: 'Every stored User record' });
    expect(within(filtered).getAllByRole('row')).toHaveLength(2);
    expect(within(filtered).getAllByText('ada@a.com').length).toBeGreaterThan(0);
    expect(within(filtered).queryByText('grace@b.com')).toBeNull();
    expect(statValue('Users')).toBe('3');

    fireEvent.click(filter);
    expect(within(screen.getByRole('table', { name: 'Every stored User record' })).getAllByRole('row')).toHaveLength(4);
  });

  it('says so when no User gave Contact consent and the filter is on', async () => {
    render(<AdminPage client={client([user('grace@b.com', tenantB, false)])} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Only Users with Contact consent' }));
    expect(screen.getByText('No Users with Contact consent')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Every stored User record' })).toBeNull();
  });

  it('shows zero counts and the empty state without records', async () => {
    render(<AdminPage client={client([])} />);
    expect(await screen.findByText('No User records yet')).toBeInTheDocument();
    expect(statValue('Users')).toBe('0');
    expect(statValue('With Contact consent')).toBe('0');
    expect(statValue('Home tenants')).toBe('0');
    expect(screen.queryByRole('table', { name: 'Users per Home tenant' })).toBeNull();
  });
});
