import { SecMinds } from '../design-system';
import { useNavigation } from '../navigation';

const { TextLink } = SecMinds;

/**
 * The privacy notice page on the website: what ASR Compass stores about a User, why, where, and how
 * they see, change or delete it. `PRIVACY.md` holds the same text.
 */
export function PrivacyNotice() {
  const { href } = useNavigation();
  return (
    <article className="app-prose">
      <h1 className="h1 app-title">Privacy notice</h1>
      <p className="body-lg app-lead">
        This is the privacy notice of ASR Compass, a free community tool by SecMinds Solutions.
      </p>

      <h2 className="h3">This website</h2>
      <p className="app-text">
        This website does not sign you in and sets no cookies. It uses no analytics, trackers or third-party scripts, and loads
        nothing from Microsoft&apos;s sign-in service. Only the app, at its own address, signs you in. Your light or dark mode
        choice is kept in your browser&apos;s local storage, on this website and in the app.
      </p>

      <h2 className="h3">What is stored about you</h2>
      <p className="app-text">
        When you sign in for the first time, ASR Compass stores a User record with exactly these fields, and nothing else:
      </p>
      <ul className="app-list">
        <li>your Home tenant ID: the ID of the Entra tenant your account belongs to;</li>
        <li>your username, first name, last name and email address;</li>
        <li>your Contact consent: whether SecMinds may email you about its other products, with the date of that choice.</li>
      </ul>
      <p className="app-text">
        Everything except the Contact consent comes from your Microsoft sign-in, not from anything you type. You make the
        Contact consent choice after your first sign-in, with the box unticked.
      </p>

      <h2 className="h3">What is never stored</h2>
      <p className="app-text">
        An Analysis runs in your browser. Your Tenant&apos;s security data, such as Audit events, paths, device names, policies
        and Verdicts, is never sent to SecMinds and never stored, and neither is which Tenants you analyse. Your sign-in tokens
        stay in your browser tab and are gone when you close it. ASR Compass uses no analytics or trackers.
      </p>

      <h2 className="h3">Why</h2>
      <ul className="app-list">
        <li>To know who uses ASR Compass, and to email you about ASR Compass itself.</li>
        <li>Only with your Contact consent: to email you about SecMinds&apos; other products.</li>
      </ul>

      <h2 className="h3">Who can see it</h2>
      <p className="app-text">
        A small number of SecMinds admins can see every User record, list only the Users who gave Contact consent, and export the records as a file, for example to email Users who gave Contact consent. They cannot change or delete your record. Nobody else at SecMinds has access through
        the app.
      </p>

      <h2 className="h3">Where and for how long</h2>
      <p className="app-text">
        The User record is stored in Azure Table Storage in Microsoft&apos;s West Europe region, in the European Union. It is kept
        until you delete it.
      </p>

      <h2 className="h3">Your rights</h2>
      <p className="app-text">
        Sign in to the app and open <strong>Settings</strong> in the user menu to:
      </p>
      <ul className="app-list">
        <li>see your stored User record;</li>
        <li>withdraw your Contact consent, or give it later; your new choice is stored with its date;</li>
        <li>delete your User record; it is removed from storage at once, and nothing about you remains.</li>
      </ul>
      <TextLink href={href({ site: 'app', page: 'settings' })}>Open Settings in the app</TextLink>
    </article>
  );
}
