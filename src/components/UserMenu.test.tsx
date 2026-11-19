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
  const button = screen.getByRole('button', { name: 'User menu' });
  return { button, onSignOut };
}

const menu = () => screen.getByRole('menu');
const items = () => within(menu()).getAllByRole('menuitem');

describe('UserMenu', () => {
  it('is a collapsed menu button until it is opened', () => {
    const { button } = renderMenu();
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens on click with the User name and email address, Settings, Privacy notice and Sign out', () => {
    const { button } = renderMenu();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', menu().id);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@contoso.com')).toBeInTheDocument();
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

  it('opens from the keyboard: Arrow Down on the first item, Arrow Up on the last', () => {
    const { button } = renderMenu();
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(items()[0]).toHaveFocus();
    fireEvent.keyDown(menu(), { key: 'Escape' });
    fireEvent.keyDown(button, { key: 'ArrowUp' });
    expect(items()[2]).toHaveFocus();
  });

  it('moves with the arrow keys, Home and End, and wraps around', () => {
    const { button } = renderMenu();
    fireEvent.click(button);
    const [settings, privacy, signOut] = items() as [HTMLElement, HTMLElement, HTMLElement];
    fireEvent.keyDown(settings, { key: 'ArrowDown' });
    expect(privacy).toHaveFocus();
    fireEvent.keyDown(privacy, { key: 'ArrowDown' });
    expect(signOut).toHaveFocus();
    fireEvent.keyDown(signOut, { key: 'ArrowDown' });
    expect(settings).toHaveFocus();
    fireEvent.keyDown(settings, { key: 'ArrowUp' });
    expect(signOut).toHaveFocus();
    fireEvent.keyDown(signOut, { key: 'Home' });
    expect(settings).toHaveFocus();
    fireEvent.keyDown(settings, { key: 'End' });
    expect(signOut).toHaveFocus();
  });

  it('closes on Escape and returns focus to the button', () => {
    const { button } = renderMenu();
    fireEvent.click(button);
    fireEvent.keyDown(items()[1] as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Tab from the button, so Tab moves on from there', () => {
    const { button } = renderMenu();
    fireEvent.click(button);
    fireEvent.keyDown(items()[0] as HTMLElement, { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('closes on a click outside, and on a second click on the button', () => {
    const { button } = renderMenu();
    fireEvent.click(button);
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('stays open on a click inside the menu header', () => {
    const { button } = renderMenu();
    fireEvent.click(button);
    fireEvent.mouseDown(screen.getByText('ada@contoso.com'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('signs out from the menu, also with Space or Enter on the item', () => {
    const { button, onSignOut } = renderMenu();
    fireEvent.click(button);
    fireEvent.click(within(menu()).getByRole('menuitem', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('follows a link item with Space', () => {
    const { button } = renderMenu();
    fireEvent.click(button);
    const settings = within(menu()).getByRole('menuitem', { name: 'Settings' });
    const followed = vi.fn((event: Event) => event.preventDefault());
    settings.addEventListener('click', followed);
    fireEvent.keyDown(settings, { key: ' ' });
    expect(followed).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
