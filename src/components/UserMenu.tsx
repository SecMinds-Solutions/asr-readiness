import { SecMinds } from '../design-system';
import { useNavigation } from '../navigation';

const { Menu } = SecMinds;

/** The accessible name of the user menu button: the User's name, as the button shows it, then what it is. */
export const userMenuLabel = (name: string) => `${name}, user menu`;

/**
 * The signed-in User's menu, on the design system's `Menu`: their name and email address, Settings,
 * the privacy notice, for SecMinds admins the admin pages (Admin overview and User records), and Sign
 * out. It is the only place Settings and the admin pages are linked from. `Menu` handles the keyboard, focus and closing.
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
        { label: 'Privacy notice', icon: 'lock', href: href({ site: 'website', page: 'privacy' }) },
        // The API decides who may see the User records; the admin claim only decides what is shown.
        ...(admin
          ? [
              { divider: true as const },
              { heading: 'SecMinds admin' },
              { label: 'Admin overview', icon: 'bar-chart-3', href: href({ site: 'app', page: 'admin' }) },
              { label: 'User records', icon: 'users', href: href({ site: 'app', page: 'admin-users' }) },
            ]
          : []),
        { divider: true as const },
        { label: 'Sign out', danger: true, onSelect: onSignOut },
      ]}
    />
  );
}
