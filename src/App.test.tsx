import { fireEvent, render, screen, within } from '@testing-library/react';
import { App, type SignInSetup } from './App';
import type { AuthClient } from './auth/msalAuthClient';
import type { SignedInUser } from './auth/user';

const ada: SignedInUser = {
  name: 'Ada Lovelace',
  username: 'ada@contoso.com',
  homeTenantId: '11111111-1111-1111-1111-111111111111',
};
const consentUrl = 'https://login.microsoftonline.com/organizations/v2.0/adminconsent?client_id=abc';

function fakeClient(start: () => Promise<SignedInUser | null>): AuthClient {
  return { start: vi.fn(start), signIn: vi.fn(async () => {}), signOut: vi.fn(async () => {}) };
}

function setup(client: AuthClient): SignInSetup {
  return { client, adminConsentUrl: consentUrl };
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
