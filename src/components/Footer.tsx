import { SecMinds } from '../design-system';
import { useNavigation } from '../navigation';

const { TextLink } = SecMinds;

/** The public repository the community can read the source code in. */
export const SOURCE_CODE_URL = 'https://github.com/SecMinds-Solutions/asr-readiness';
const LICENCE_URL = `${SOURCE_CODE_URL}/blob/main/LICENSE`;

/** The footer of the website and the app: privacy notice, source code, copyright and licence. */
export function Footer() {
  const { href } = useNavigation();
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <nav aria-label="Footer">
          <ul className="app-footer-links">
            <li>
              <TextLink href={href({ site: 'website', page: 'privacy' })}>Privacy notice</TextLink>
            </li>
            <li>
              <TextLink href={SOURCE_CODE_URL}>Source code on GitHub</TextLink>
            </li>
          </ul>
        </nav>
        <p className="body-sm app-footer-text">
          © {new Date().getFullYear()} SecMinds Solutions. The source code is licensed under the{' '}
          <TextLink href={LICENCE_URL}>MIT licence</TextLink>; SecMinds logos and brand assets are not covered by it.
        </p>
      </div>
    </footer>
  );
}
