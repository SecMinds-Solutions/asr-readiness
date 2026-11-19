import type { ReactNode } from 'react';
import { SecMinds } from '../design-system';
import { useNavigation } from '../navigation';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';

const { Navbar } = SecMinds;

/**
 * The app's header: the brand on the left; the theme button and `account` (the user menu, or Sign in)
 * on the right. Everything about the User is in the user menu, so there are no text links.
 */
export function AppHeader({ account }: { account?: ReactNode }) {
  const { href } = useNavigation();
  return (
    <header className="app-header">
      <Navbar
      brand={<Brand href={href({ site: 'app', page: 'home' })} />}
      links={[]}
      actions={
        <>
          <ThemeToggle />
          {account}
        </>
      }
      />
    </header>
  );
}
