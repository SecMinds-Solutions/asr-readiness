import { SecMinds } from '../design-system';
import { useNavigation } from '../navigation';

const { Menu } = SecMinds;

/**
 * The signed-in User's menu: their name and email address, Settings, Admin (for admins only; the API
 * still decides who may see the User records), the privacy notice and Sign out.
 *
 * Built on the design system's `Menu`, which follows the WAI-ARIA menu button pattern for the keyboard
 * and closes on Escape, Tab and a click outside.
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
      icon="user"
      ariaLabel="User menu"
      header={
        <>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </>
      }
      items={[
        { label: 'Settings', href: href({ site: 'app', page: 'settings' }) },
        ...(admin ? [{ label: 'Admin', href: href({ site: 'app', page: 'admin' }) }] : []),
        { label: 'Privacy notice', href: href({ site: 'website', page: 'privacy' }) },
        { divider: true },
        { label: 'Sign out', danger: true, onSelect: onSignOut },
      ]}
    />
  );
}
