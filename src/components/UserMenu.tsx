import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { SecMinds } from '../design-system';
import { useNavigation } from '../navigation';

const { IconButton } = SecMinds;

/**
 * The signed-in User's menu: their name and email address, Settings, Admin (for admins only; the API
 * still decides who may see the User records), the privacy notice and Sign out.
 *
 * The design system has no menu, so this is the WAI-ARIA menu button pattern on its `IconButton`:
 * Enter, Space or Arrow Down open it on the first item and Arrow Up on the last; the arrow keys,
 * Home and End move between items; Escape closes it and returns focus to the button; Tab and a click
 * outside close it.
 */
export function UserMenu({
  user,
  admin,
  onSignOut,
}: {
  user: { name: string; email: string };
  admin: boolean;
  onSignOut: () => void;
}) {
  const { href } = useNavigation();
  const [open, setOpen] = useState<false | 'first' | 'last'>(false);
  const container = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const menuId = useId();

  // The design system's IconButton does not forward a ref, so the button is found in its wrapper.
  const button = () => container.current?.querySelector<HTMLButtonElement>('button[aria-haspopup]') ?? null;
  const menuItems = () => [...(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (!open) return;
    const all = menuItems();
    (open === 'first' ? all[0] : all[all.length - 1])?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
    // Focus moves only when the menu opens, not on every render while it is open.
  }, [open]);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button()?.focus();
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(event.key === 'ArrowDown' ? 'first' : 'last');
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const all = menuItems();
    const index = all.indexOf(document.activeElement as HTMLElement);
    const focus = (next: number) => {
      event.preventDefault();
      all[(next + all.length) % all.length]?.focus();
    };
    switch (event.key) {
      case 'ArrowDown':
        return focus(index + 1);
      case 'ArrowUp':
        return focus(index - 1);
      case 'Home':
        return focus(0);
      case 'End':
        return focus(all.length - 1);
      case 'Escape':
        event.preventDefault();
        return close(true);
      case 'Tab':
        // Focus goes back to the button before the menu closes, so Tab moves on from there instead
        // of from the top of the page.
        return close(true);
      case ' ':
        // Space activates a menu item; links only react to Enter by themselves.
        if (event.target instanceof HTMLAnchorElement) {
          event.preventDefault();
          event.target.click();
        }
        return;
    }
  };

  const links = [
    { label: 'Settings', href: href({ site: 'app', page: 'settings' }) },
    ...(admin ? [{ label: 'Admin', href: href({ site: 'app', page: 'admin' }) }] : []),
    { label: 'Privacy notice', href: href({ site: 'website', page: 'privacy' }) },
  ];

  return (
    <div className="app-menu" ref={container}>
      <IconButton
        icon="user"
        label="User menu"
        aria-haspopup="menu"
        aria-expanded={open !== false}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(open ? false : 'first')}
        onKeyDown={onButtonKeyDown}
      />
      {open && (
        <div className="app-menu-popup">
          <div className="app-menu-head">
            <span className="app-menu-name">{user.name}</span>
            <span className="app-menu-email">{user.email}</span>
          </div>
          <ul role="menu" id={menuId} aria-label={`User menu for ${user.name}`} ref={list} onKeyDown={onMenuKeyDown}>
            {links.map((link) => (
              <li role="none" key={link.label}>
                <a role="menuitem" tabIndex={-1} href={link.href} className="app-menu-item" onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
            <li role="none">
              <button
                role="menuitem"
                type="button"
                tabIndex={-1}
                className="app-menu-item"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
              >
                Sign out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
