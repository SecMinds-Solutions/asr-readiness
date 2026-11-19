import { SecMinds } from '../design-system';
import { useNavigation } from '../navigation';

const { Menu } = SecMinds;

/** The accessible name of the user menu button: the User's name, as the button shows it, then what it is. */
export const userMenuLabel = (name: string) => `${name}, user menu`;

/**
 * The signed-in User's menu, on the design system's `Menu`: their name and email address, Settings,
 * Admin (for SecMinds admins only; the API still decides who may see the User records), the privacy
 * notice and Sign out. `Menu` handles the keyboard, focus and closing.
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
  return (
    <Menu
      avatar={user.name}
      label={user.name}
      ariaLabel={userMenuLabel(user.name)}
      header={
        <>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </>
      }
      items={[
        { label: 'Settings', icon: 'settings', href: href({ site: 'app', page: 'settings' }) },
        ...(admin ? [{ label: 'Admin', icon: 'users', href: href({ site: 'app', page: 'admin' }) }] : []),
        { label: 'Privacy notice', icon: 'lock', href: href({ site: 'website', page: 'privacy' }) },
        { divider: true as const },
        { label: 'Sign out', danger: true, onSelect: onSignOut },
      ]}
    />
  );
}
