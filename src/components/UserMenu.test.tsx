import { fireEvent, render, screen, within } from '@testing-library/react';
import { UserMenu } from './UserMenu';

const ada = { name: 'Ada Lovelace', email: 'ada@contoso.com' };

function renderMenu(admin = false) {
  const onSignOut = vi.fn();
  render(
    <>
      <UserMenu user={ada} admin={admin} onSignOut={onSignOut} />
      <button type="button">Outside</button>
    </>,
  );
  const button = screen.getByRole('button', { name: 'Ada Lovelace, user menu' });
  return { button, onSignOut };
}

const menu = () => screen.getByRole('menu');
const items = () => within(menu()).getAllByRole('menuitem');

describe('UserMenu', () => {
  it('is a collapsed menu button with the User name until it is opened', () => {
    const { button } = renderMenu();
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveTextContent('Ada Lovelace');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens with the User name and email address, Settings, Privacy notice and Sign out', () => {
    const { button } = renderMenu();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', menu().id);
    expect(menu()).toHaveAccessibleDescription(/ada@contoso\.com/);
    expect(items().map((item) => item.textContent)).toEqual(['Settings', 'Privacy notice', 'Sign out']);
    expect(within(menu()).getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('href', 'https://app.asrcompass.cloud/settings');
    expect(within(menu()).getByRole('menuitem', { name: 'Privacy notice' })).toHaveAttribute('href', 'https://asrcompass.cloud/privacy');
    expect(items()[0]).toHaveFocus();
  });

  it('shows Admin only to an admin', () => {
    const { button } = renderMenu(true);
    fireEvent.click(button);
    expect(items().map((item) => item.textContent)).toEqual(['Settings', 'Admin', 'Privacy notice', 'Sign out']);
    expect(within(menu()).getByRole('menuitem', { name: 'Admin' })).toHaveAttribute('href', 'https://app.asrcompass.cloud/admin');
  });

  it('opens from the keyboard and moves with the arrow keys', () => {
    const { button } = renderMenu();
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    const [settings, privacy] = items() as [HTMLElement, HTMLElement, HTMLElement];
    expect(settings).toHaveFocus();
    fireEvent.keyDown(settings, { key: 'ArrowDown' });
    expect(privacy).toHaveFocus();
  });

  it('closes on Escape and returns focus to the button', () => {
    const { button } = renderMenu();
    fireEvent.click(button);
    fireEvent.keyDown(items()[1] as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('closes on a click outside', () => {
    const { button } = renderMenu();
    fireEvent.click(button);
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('signs out from the menu', () => {
    const { button, onSignOut } = renderMenu();
    fireEvent.click(button);
    fireEvent.click(within(menu()).getByRole('menuitem', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
