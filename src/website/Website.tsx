import { Footer } from '../components/Footer';
import { PrivacyNotice } from '../components/Privacy';
import { useNavigation } from '../navigation';
import { MAIN_ID } from '../places';
import { Landing } from './Landing';
import { WebsiteHeader } from './WebsiteHeader';
import '../app.css';

/** The public website: what ASR Compass is, and the privacy notice. No sign-in, cookies or tracking. */
export function Website({ adminConsentUrl }: { adminConsentUrl: string | null }) {
  const { place } = useNavigation();
  return (
    <div className="sm-root app">
      <WebsiteHeader />
      <main className="website-main" id={MAIN_ID} tabIndex={-1}>
        {place.page === 'privacy' ? (
          <div className="app-main">
            <PrivacyNotice />
          </div>
        ) : (
          <Landing adminConsentUrl={adminConsentUrl} />
        )}
      </main>
      <Footer />
    </div>
  );
}
