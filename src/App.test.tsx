import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App, type SignInSetup } from './App';
import type { AuthClient } from './auth/msalAuthClient';
import type { SignedInUser } from './auth/user';
import type { Readiness, ReadinessCheck } from './onboarding/readiness';
import type { ContactConsent, UserRecordClient } from './user-record/client';

const ada: SignedInUser = {
  name: 'Ada Lovelace',
  username: 'ada@contoso.com',
  homeTenantId: '11111111-1111-1111-1111-111111111111',
};
const consentUrl = 'https://login.microsoftonline.com/organizations/v2.0/adminconsent?client_id=abc';

function fakeClient(start: () => Promise<SignedInUser | null>): AuthClient {
  return {
    start: vi.fn(start),
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    userRecordToken: vi.fn(async () => 'api-token'),
    graphToken: vi.fn(async () => 'graph-token'),
    refreshGraphToken: vi.fn(async () => {}),
  };
}

const storedConsent: ContactConsent = { contactConsent: false, contactConsentDate: '2026-11-01T09:00:00.000Z' };

function fakeUserRecord(stored: ContactConsent | null = storedConsent): UserRecordClient {
  return {
    contactConsent: vi.fn(async () => stored),
    saveContactConsent: vi.fn(async (contactConsent: boolean) => ({ contactConsent, contactConsentDate: '2026-11-17T10:00:00.000Z' })),
  };
}

function setup(
  client: AuthClient,
  userRecord: UserRecordClient = fakeUserRecord(),
  checkReadiness: ReadinessCheck = async () => ({ status: 'ready', devices: 12 }),
): SignInSetup {
  return { client, adminConsentUrl: consentUrl, userRecord, checkReadiness: vi.fn(checkReadiness) };
}

const findNavbarSignIn = async () => within(screen.getByRole('navigation')).findByRole('button', { name: 'Sign in' });

const consentError = Object.assign(new Error('AADSTS65004: User declined to consent.'), {
  errorCode: 'access_denied',
  errorMessage: 'AADSTS65004: User declined to consent.',
});

describe('App', () => {
  it('shows the product name, the SecMinds logo and the trust promise', async () => {
    render(<App signIn={setup(fakeClient(async () => null))} adminConsentResult={null} />);
    expect(screen.getByRole('heading', { level: 1, name: 'ASR Readiness' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'SecMinds Solutions' })).toBeInTheDocument();
    expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument();
    await screen.findAllByRole('button', { name: 'Sign in' });
  });

  it('renders inside the design system root', () => {
    const { container } = render(<App signIn={null} adminConsentResult={null} />);
    expect(container.firstElementChild).toHaveClass('sm-root');
  });

  it('says it is checking sign-in while MSAL starts', () => {
    render(<App signIn={setup(fakeClient(() => new Promise(() => {})))} adminConsentResult={null} />);
    expect(screen.getByText('Checking sign-in…')).toBeInTheDocument();
  });

  it('signs a signed-out User in when they choose Sign in', async () => {
    const client = fakeClient(async () => null);
    render(<App signIn={setup(client)} adminConsentResult={null} />);
    fireEvent.click(await findNavbarSignIn());
    expect(client.signIn).toHaveBeenCalledOnce();
  });

  it('offers admins the admin consent flow before signing in', async () => {
    render(<App signIn={setup(fakeClient(async () => null))} adminConsentResult={null} />);
    expect(await screen.findByRole('link', { name: /grant admin consent/i })).toHaveAttribute('href', consentUrl);
  });

  it('shows the signed-in User and their Home tenant, and signs them out', async () => {
    const client = fakeClient(async () => ada);
    render(<App signIn={setup(client)} adminConsentResult={null} />);
    const card = (await screen.findByRole('heading', { name: 'Signed in' })).closest('.sm-card') as HTMLElement;
    expect(within(card).getByText('Ada Lovelace')).toBeInTheDocument();
    expect(within(card).getByText('ada@contoso.com')).toBeInTheDocument();
    expect(within(card).getByText(ada.homeTenantId)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(client.signOut).toHaveBeenCalledOnce();
  });

  it('guides a User without consent to the admin consent flow', async () => {
    render(<App signIn={setup(fakeClient(async () => Promise.reject(consentError)))} adminConsentResult={null} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/admin of your tenant/i);
    expect(within(alert).getByRole('link', { name: /grant admin consent/i })).toHaveAttribute('href', consentUrl);
  });

  it('guides the User to admin consent when starting the sign-in itself fails for lack of consent', async () => {
    const client = fakeClient(async () => null);
    vi.mocked(client.signIn).mockRejectedValue(consentError);
    render(<App signIn={setup(client)} adminConsentResult={null} />);
    fireEvent.click(await findNavbarSignIn());
    expect(await screen.findByRole('alert')).toHaveTextContent(/admin of your tenant/i);
  });

  it('shows why sign-in failed and lets the User try again', async () => {
    const client = fakeClient(async () => Promise.reject(new Error('AADSTS50011: The redirect URI does not match.')));
    render(<App signIn={setup(client)} adminConsentResult={null} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Sign-in failed');
    expect(alert).toHaveTextContent('AADSTS50011: The redirect URI does not match.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(client.signIn).toHaveBeenCalledOnce();
  });

  it('says so when sign-in is not configured in this build', () => {
    render(<App signIn={null} adminConsentResult={null} />);
    expect(screen.getByText(/sign-in is not configured/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('confirms a granted admin consent', async () => {
    render(<App signIn={setup(fakeClient(async () => null))} adminConsentResult={{ outcome: 'granted' }} />);
    expect(screen.getByText(/admin consent granted/i)).toBeInTheDocument();
    await screen.findAllByRole('button', { name: 'Sign in' });
  });

  it('shows why admin consent was not granted', async () => {
    render(
      <App
        signIn={setup(fakeClient(async () => null))}
        adminConsentResult={{ outcome: 'failed', description: 'The admin canceled the request' }}
      />,
    );
    expect(screen.getByText(/admin consent was not granted/i)).toBeInTheDocument();
    expect(screen.getByText('The admin canceled the request')).toBeInTheDocument();
    await screen.findAllByRole('button', { name: 'Sign in' });
  });
});

describe('App: Contact consent', () => {
  const signedIn = () => fakeClient(async () => ada);

  it('asks a new User for Contact consent, unticked, before anything else', async () => {
    render(<App signIn={setup(signedIn(), fakeUserRecord(null))} adminConsentResult={null} />);
    const choice = await screen.findByRole('checkbox', { name: /SecMinds may email me about its other products/i });
    expect(choice).not.toBeChecked();
    expect(screen.queryByRole('heading', { name: 'Signed in' })).not.toBeInTheDocument();
  });

  it('stores no consent when the User continues without ticking the box', async () => {
    const userRecord = fakeUserRecord(null);
    render(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    expect(userRecord.saveContactConsent).toHaveBeenCalledWith(false);
    expect(await screen.findByRole('heading', { name: 'Signed in' })).toBeInTheDocument();
  });

  it('stores consent when the User ticks the box', async () => {
    const userRecord = fakeUserRecord(null);
    render(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /SecMinds may email me/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(userRecord.saveContactConsent).toHaveBeenCalledWith(true);
    expect(await screen.findByRole('heading', { name: 'Signed in' })).toBeInTheDocument();
  });

  it('does not ask a returning User again', async () => {
    const userRecord = fakeUserRecord();
    render(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    expect(await screen.findByRole('heading', { name: 'Signed in' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(userRecord.saveContactConsent).not.toHaveBeenCalled();
  });

  it('says what is stored about the User when asking', async () => {
    render(<App signIn={setup(signedIn(), fakeUserRecord(null))} adminConsentResult={null} />);
    await screen.findByRole('checkbox');
    expect(screen.getByText(/Home tenant, username, first and last name, email address/i)).toBeInTheDocument();
  });

  it('shows why the record could not be read and lets the User try again', async () => {
    const userRecord = fakeUserRecord(null);
    vi.mocked(userRecord.contactConsent).mockRejectedValueOnce(new Error('The User record service answered HTTP 503.'));
    render(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('HTTP 503');
    expect(screen.queryByRole('heading', { name: 'Signed in' })).not.toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('checkbox')).toBeInTheDocument();
  });

  it('keeps the choice on screen when storing it fails', async () => {
    const userRecord = fakeUserRecord(null);
    vi.mocked(userRecord.saveContactConsent).mockRejectedValueOnce(new Error('The User record service answered HTTP 500.'));
    render(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /SecMinds may email me/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500');
    expect(screen.getByRole('checkbox', { name: /SecMinds may email me/i })).toBeChecked();
    expect(screen.queryByRole('heading', { name: 'Signed in' })).not.toBeInTheDocument();
  });
});

describe('App: onboarding check', () => {
  const signedIn = () => fakeClient(async () => ada);
  const renderWith = (readiness: () => Promise<Readiness>) => {
    const signIn = setup(signedIn(), fakeUserRecord(), readiness);
    render(<App signIn={signIn} adminConsentResult={null} />);
    return signIn;
  };

  it('does not check the Tenant before the Contact consent choice is made', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(null));
    render(<App signIn={signIn} adminConsentResult={null} />);
    await screen.findByRole('checkbox');
    expect(signIn.checkReadiness).not.toHaveBeenCalled();
  });

  it('says it is checking the Tenant', async () => {
    renderWith(() => new Promise(() => {}));
    expect(await screen.findByText('Checking your Tenant…')).toBeInTheDocument();
  });

  it('continues to the Analysis for a Supported tenant and a User with the right roles', async () => {
    renderWith(async () => ({ status: 'ready', devices: 12 }));
    expect(await screen.findByRole('heading', { name: 'Ready for an Analysis' })).toBeInTheDocument();
    expect(screen.getByText(/12 devices/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Signed in' })).toBeInTheDocument();
  });

  it('explains Plan 2 and Defender for Business when the Tenant has no advanced hunting', async () => {
    renderWith(async () => ({ status: 'not-supported', details: "'DeviceInfo' could not be resolved." }));
    expect(await screen.findByRole('heading', { name: 'Your Tenant is not supported' })).toBeInTheDocument();
    expect(screen.getByText(/Defender for Endpoint Plan 2/)).toBeInTheDocument();
    expect(screen.getByText(/Defender for Business/)).toBeInTheDocument();
    expect(screen.getByText("'DeviceInfo' could not be resolved.")).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ready for an Analysis' })).not.toBeInTheDocument();
  });

  it('says there is nothing to analyse yet when there are no onboarded devices, without calling the Tenant unsupported', async () => {
    renderWith(async () => ({ status: 'no-devices' }));
    expect(await screen.findByRole('heading', { name: 'No devices to analyse yet' })).toBeInTheDocument();
    expect(screen.getByText(/onboarded to Defender for Endpoint/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your Tenant is not supported' })).not.toBeInTheDocument();
  });

  it('names the missing advanced hunting role and where to assign it', async () => {
    renderWith(async () => ({
      status: 'access-needed',
      advancedHunting: 'refused',
      intune: 'allowed',
      details: ['Advanced hunting: Forbidden.'],
    }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Security data basics (read)');
    expect(alert).toHaveTextContent('Security Reader');
    expect(alert).toHaveTextContent(/Permissions and roles/);
    expect(alert).toHaveTextContent(/View data/);
    expect(alert).toHaveTextContent(/Plan 2/);
    expect(alert).not.toHaveTextContent('Read Only Operator');
    expect(alert).toHaveTextContent('Advanced hunting: Forbidden.');
  });

  it('names the missing Intune role and where to assign it', async () => {
    renderWith(async () => ({ status: 'access-needed', advancedHunting: 'allowed', intune: 'refused', details: ['Intune: Forbidden.'] }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Read Only Operator');
    expect(alert).toHaveTextContent(/Tenant administration › Roles/);
    expect(alert).not.toHaveTextContent('Security data basics (read)');
  });

  it('checks again after a role was assigned', async () => {
    const signIn = renderWith(async () => ({ status: 'access-needed', advancedHunting: 'allowed', intune: 'refused', details: [] }));
    fireEvent.click(await screen.findByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(signIn.checkReadiness).toHaveBeenCalledTimes(2));
    expect(signIn.checkReadiness).toHaveBeenNthCalledWith(1, { freshToken: false });
    expect(signIn.checkReadiness).toHaveBeenNthCalledWith(2, { freshToken: true });
  });

  it('shows a failed check with the reason and lets the User try again', async () => {
    const signIn = renderWith(async () => ({ status: 'failed', message: 'Advanced hunting: Service unavailable.' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Advanced hunting: Service unavailable.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(signIn.checkReadiness).toHaveBeenCalledTimes(2));
    expect(signIn.checkReadiness).toHaveBeenLastCalledWith({ freshToken: true });
  });

  it('shows an unexpected error of the check as failed', async () => {
    renderWith(async () => Promise.reject(new Error('Nobody is signed in.')));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nobody is signed in.');
  });
});
