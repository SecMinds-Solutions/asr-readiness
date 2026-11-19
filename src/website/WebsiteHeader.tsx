import { SecMinds } from '../design-system';
import { useNavigation } from '../navigation';
import { Brand } from '../components/Brand';
import { ButtonLink } from '../components/ButtonLink';
import { ThemeToggle } from '../components/ThemeToggle';
import { FAQ_ID, HOW_IT_WORKS_ID } from './Landing';

const { Navbar } = SecMinds;

/** The website's header: brand, links to two sections of the home page and the privacy notice, theme and Open app. */
export function WebsiteHeader() {
  const { place, href } = useNavigation();
  const home = href({ site: 'website', page: 'home' });
  return (
    <header className="app-header website-header">
      <Navbar
        brand={<Brand href={home} />}
        links={[
          { label: 'How it works', href: `${home}#${HOW_IT_WORKS_ID}` },
          { label: 'FAQ', href: `${home}#${FAQ_ID}` },
          { label: 'Privacy', href: href({ site: 'website', page: 'privacy' }), active: place.page === 'privacy' },
        ]}
        actions={
          <>
            <ThemeToggle />
            <ButtonLink size="sm" href={href({ site: 'app', page: 'home' })}>
              Open app
            </ButtonLink>
          </>
        }
      />
    </header>
  );
}
