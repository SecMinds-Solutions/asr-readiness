import { act, fireEvent, render, screen, waitFor, within, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { App, type SignInSetup } from './App';
import { ThemeContext } from './components/ThemeToggle';
import { createThemeController } from './theme';
import { NavigationProvider } from './navigation';
import { DEFAULT_ORIGINS, resolve, type Place } from './places';
import type { AuthClient } from './auth/msalAuthClient';
import type { SignedInUser } from './auth/user';
import { auditEventsFromRows, type AuditEvents } from './analysis/auditEvents';
import type { PolicyChanges } from './analysis/auditPeriods';
import { asrSettings, choice, toAllDevices } from './analysis/fixtures/intunePolicies';
import { ruleModesFromPolicies } from './analysis/intuneRuleModes';
import type { RuleOverview } from './analysis/ruleOverview';
import type { Readiness, ReadinessCheck } from './onboarding/readiness';
import type { UserRecord, UserRecordClient } from './user-record/client';

const ada: SignedInUser = {
  name: 'Ada Lovelace',
  username: 'ada@contoso.com',
  homeTenantId: '11111111-1111-1111-1111-111111111111',
  tenantId: '11111111-1111-1111-1111-111111111111',
  email: 'ada@contoso.com',
  admin: false,
};

/** Puts the browser at `path` on localhost, where the app is served under /app. */
function goTo(path: string) {
  window.history.replaceState(null, '', path);
}

/** The page the browser is at, as the app's entry point resolves it before rendering. */
function placeHere(): Place {
  const resolution = resolve(new URL(window.location.href), DEFAULT_ORIGINS);
  if (resolution.kind !== 'show') throw new Error(`${window.location.href} redirects to ${resolution.url}`);
  return resolution.place;
}

function Navigation({ children }: { children: ReactNode }) {
  return (
    <NavigationProvider origins={DEFAULT_ORIGINS} initial={placeHere()}>
      {children}
    </NavigationProvider>
  );
}

const renderApp = (ui: ReactElement, options?: RenderOptions) => render(ui, { wrapper: Navigation, ...options });

/** Follows a link or goes back in history without a click: the address bar changes, then the page. */
const navigateTo = (path: string) =>
  act(() => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

beforeEach(() => goTo('/app/'));
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

const storedRecord: UserRecord = {
  homeTenantId: ada.homeTenantId,
  username: ada.username,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@contoso.com',
  contactConsent: false,
  contactConsentDate: '2026-11-01T09:00:00.000Z',
};

function fakeUserRecord(stored: UserRecord | null = storedRecord): UserRecordClient {
  return {
    userRecord: vi.fn(async () => stored),
    saveContactConsent: vi.fn(async (contactConsent: boolean) => ({
      ...storedRecord,
      contactConsent,
      contactConsentDate: '2026-11-17T10:00:00.000Z',
    })),
    deleteUserRecord: vi.fn(async () => {}),
    listUserRecords: vi.fn(async () => ({ status: 'not-allowed' as const })),
  };
}

const emptyOverview: RuleOverview = {
  modes: ruleModesFromPolicies([]),
  coverage: { devices: 12, auditDevices: {}, unrecognisedRules: [] },
};

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
/** The Intune audit log of the Observation window, without changes to any policy. */
const noPolicyChanges = (): PolicyChanges => ({ since: daysAgo(30), changes: [] });

function setup(
  client: AuthClient,
  userRecord: UserRecordClient = fakeUserRecord(),
  checkReadiness: ReadinessCheck = async () => ({ status: 'ready', devices: 12 }),
  loadRuleOverview: () => Promise<RuleOverview> = async () => emptyOverview,
  loadAuditEvents: () => Promise<AuditEvents> = async () => auditEventsFromRows([], []),
  loadPolicyChanges: () => Promise<PolicyChanges> = async () => noPolicyChanges(),
): SignInSetup {
  return {
    client,
    adminConsentUrl: consentUrl,
    userRecord,
    checkReadiness: vi.fn(checkReadiness),
    loadRuleOverview: vi.fn(loadRuleOverview),
    loadAuditEvents: vi.fn(loadAuditEvents),
    loadPolicyChanges: vi.fn(loadPolicyChanges),
  };
}

/** The alert with this title; a failed part also shows the No Verdicts alert. */
const alertWith = async (title: string) =>
  (await screen.findAllByRole('alert')).find((alert) => alert.textContent?.includes(title)) as HTMLElement;

/** The sidebar of the signed-in app. */
const sidebar = async () => screen.findByRole('navigation', { name: 'Main' });

/** Opens a page from the sidebar, as a User clicking its link. */
const openPage = async (name: string) => fireEvent.click(within(await sidebar()).getByRole('link', { name }));

/** Opens an admin page from the user menu, the only place the admin pages are linked from. */
const openAdminPage = async (name: 'Admin overview' | 'User records') => {
  await openUserMenu();
  fireEvent.click(screen.getByRole('menuitem', { name }));
};

/** Opens Settings from the user menu, the only place it is linked from. */
const openSettings = async () => {
  await openUserMenu();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
};

/** The heading of a page of the signed-in app, once the sidebar shows: before it, a loading page has the same heading. */
const findPageHeading = async (name: string) => {
  await sidebar();
  return screen.findByRole('heading', { level: 1, name });
};

const findNavbarSignIn = async () => within(screen.getByRole('banner')).findByRole('button', { name: 'Sign in' });

/** Opens the user menu in the header. */
const openUserMenu = async () => {
  await sidebar();
  fireEvent.click(screen.getByRole('button', { name: /user menu/ }));
};

const consentError = Object.assign(new Error('AADSTS65004: User declined to consent.'), {
  errorCode: 'access_denied',
  errorMessage: 'AADSTS65004: User declined to consent.',
});

describe('App', () => {
  it('shows the product name, the SecMinds logo and the trust promise', async () => {
    renderApp(<App signIn={setup(fakeClient(async () => null))} adminConsentResult={null} />);
    expect(screen.getByRole('heading', { level: 1, name: 'ASR Compass' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'SecMinds Solutions' })).toBeInTheDocument();
    expect(await screen.findByText(/never leaves your browser/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'What is ASR Compass?' })).toHaveAttribute('href', 'http://localhost:3000/');
    await screen.findAllByRole('button', { name: 'Sign in' });
  });

  it('renders inside the design system root', () => {
    const { container } = renderApp(<App signIn={null} adminConsentResult={null} />);
    expect(container.firstElementChild).toHaveClass('sm-root');
  });

  it('says it is checking sign-in while MSAL starts', () => {
    renderApp(<App signIn={setup(fakeClient(() => new Promise(() => {})))} adminConsentResult={null} />);
    expect(screen.getByText('Checking sign-in…')).toBeInTheDocument();
  });

  it('signs a signed-out User in when they choose Sign in', async () => {
    const client = fakeClient(async () => null);
    renderApp(<App signIn={setup(client)} adminConsentResult={null} />);
    fireEvent.click(await findNavbarSignIn());
    expect(client.signIn).toHaveBeenCalledOnce();
  });

  it('offers admins the admin consent flow before signing in', async () => {
    renderApp(<App signIn={setup(fakeClient(async () => null))} adminConsentResult={null} />);
    expect(await screen.findByRole('link', { name: /grant admin consent/i })).toHaveAttribute('href', consentUrl);
  });

  it('shows the signed-in User in the user menu, and signs them out', async () => {
    const client = fakeClient(async () => ada);
    renderApp(<App signIn={setup(client)} adminConsentResult={null} />);
    await sidebar();
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Ada Lovelace, user menu' })).toBeInTheDocument();
    await openUserMenu();
    expect(screen.getByRole('menu')).toHaveAccessibleDescription(/ada@contoso\.com/);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(client.signOut).toHaveBeenCalledOnce();
  });

  it('guides a User without consent to the admin consent flow', async () => {
    renderApp(<App signIn={setup(fakeClient(async () => Promise.reject(consentError)))} adminConsentResult={null} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/admin of your tenant/i);
    expect(within(alert).getByRole('link', { name: /grant admin consent/i })).toHaveAttribute('href', consentUrl);
  });

  it('guides the User to admin consent when starting the sign-in itself fails for lack of consent', async () => {
    const client = fakeClient(async () => null);
    vi.mocked(client.signIn).mockRejectedValue(consentError);
    renderApp(<App signIn={setup(client)} adminConsentResult={null} />);
    fireEvent.click(await findNavbarSignIn());
    expect(await screen.findByRole('alert')).toHaveTextContent(/admin of your tenant/i);
  });

  it('shows why sign-in failed and lets the User try again', async () => {
    const client = fakeClient(async () => Promise.reject(new Error('AADSTS50011: The redirect URI does not match.')));
    renderApp(<App signIn={setup(client)} adminConsentResult={null} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Sign-in failed');
    expect(alert).toHaveTextContent('AADSTS50011: The redirect URI does not match.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(client.signIn).toHaveBeenCalledOnce();
  });

  it('says so when sign-in is not configured in this build', () => {
    renderApp(<App signIn={null} adminConsentResult={null} />);
    expect(screen.getByText(/sign-in is not configured/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('confirms a granted admin consent', async () => {
    renderApp(<App signIn={setup(fakeClient(async () => null))} adminConsentResult={{ outcome: 'granted' }} />);
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
    renderApp(<App signIn={setup(signedIn(), fakeUserRecord(null))} adminConsentResult={null} />);
    const choice = await screen.findByRole('checkbox', { name: /SecMinds may email me about its other products/i });
    expect(choice).not.toBeChecked();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it('stores no consent when the User continues without ticking the box', async () => {
    const userRecord = fakeUserRecord(null);
    renderApp(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    expect(userRecord.saveContactConsent).toHaveBeenCalledWith(false);
    expect(await findPageHeading('Overview')).toBeInTheDocument();
    expect(await sidebar()).toBeInTheDocument();
  });

  it('stores consent when the User ticks the box', async () => {
    const userRecord = fakeUserRecord(null);
    renderApp(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /SecMinds may email me/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(userRecord.saveContactConsent).toHaveBeenCalledWith(true);
    expect(await findPageHeading('Overview')).toBeInTheDocument();
  });

  it('does not ask a returning User again', async () => {
    const userRecord = fakeUserRecord();
    renderApp(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    expect(await findPageHeading('Overview')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(userRecord.saveContactConsent).not.toHaveBeenCalled();
  });

  it('says what is stored about the User when asking', async () => {
    renderApp(<App signIn={setup(signedIn(), fakeUserRecord(null))} adminConsentResult={null} />);
    await screen.findByRole('checkbox');
    expect(screen.getByText(/Home tenant, username, first and last name, email address/i)).toBeInTheDocument();
  });

  it('shows why the record could not be read and lets the User try again', async () => {
    const userRecord = fakeUserRecord(null);
    vi.mocked(userRecord.userRecord).mockRejectedValueOnce(new Error('The User record service answered HTTP 503.'));
    renderApp(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('HTTP 503');
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('checkbox')).toBeInTheDocument();
  });

  it('keeps the choice on screen when storing it fails', async () => {
    const userRecord = fakeUserRecord(null);
    vi.mocked(userRecord.saveContactConsent).mockRejectedValueOnce(new Error('The User record service answered HTTP 500.'));
    renderApp(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /SecMinds may email me/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 500');
    expect(screen.getByRole('checkbox', { name: /SecMinds may email me/i })).toBeChecked();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });
});

describe('App: sign-in requested from the website', () => {
  it('starts sign-in at once for a signed-out User who chose Get started', async () => {
    const client = fakeClient(async () => null);
    renderApp(<App signIn={setup(client)} adminConsentResult={null} signInRequested />);
    await waitFor(() => expect(client.signIn).toHaveBeenCalledOnce());
  });

  it('does not sign in again for a User who is already signed in', async () => {
    const client = fakeClient(async () => ada);
    renderApp(<App signIn={setup(client)} adminConsentResult={null} signInRequested />);
    await findPageHeading('Overview');
    expect(client.signIn).not.toHaveBeenCalled();
  });

  it('waits for the User when the app is opened without the request', async () => {
    const client = fakeClient(async () => null);
    renderApp(<App signIn={setup(client)} adminConsentResult={null} />);
    await screen.findByRole('button', { name: 'Sign in with Microsoft' });
    expect(client.signIn).not.toHaveBeenCalled();
  });

  it('shows why sign-in failed and does not try again by itself', async () => {
    const client = fakeClient(async () => null);
    vi.mocked(client.signIn).mockRejectedValue(new Error('The sign-in page could not be opened.'));
    renderApp(<App signIn={setup(client)} adminConsentResult={null} signInRequested />);
    expect(await alertWith('Sign-in failed')).toHaveTextContent('could not be opened');
    expect(client.signIn).toHaveBeenCalledOnce();
  });

  it('shows the admin consent guidance when starting sign-in fails for lack of consent', async () => {
    const client = fakeClient(async () => null);
    vi.mocked(client.signIn).mockRejectedValue(consentError);
    renderApp(<App signIn={setup(client)} adminConsentResult={null} signInRequested />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/admin of your tenant/i);
    expect(client.signIn).toHaveBeenCalledOnce();
  });
});

describe('App: theme', () => {
  it('shows the theme button on every page, also when sign-in is not configured', () => {
    const query = { matches: false, addEventListener: () => {}, removeEventListener: () => {} };
    const controller = createThemeController(document.createElement('html'), query, () => {
      throw new Error('no storage');
    });
    renderApp(
      <ThemeContext.Provider value={controller}>
        <App signIn={null} adminConsentResult={null} />
      </ThemeContext.Provider>,
    );
    const nav = screen.getByRole('banner');
    fireEvent.click(within(nav).getByRole('button', { name: 'Switch to dark mode' }));
    expect(within(nav).getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });
});

describe('App: Settings and the User record', () => {
  const signedIn = () => fakeClient(async () => ada);
  it('links to the privacy notice on the website from the footer, also when sign-in is not configured', () => {
    renderApp(<App signIn={null} adminConsentResult={null} />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', 'http://localhost:3000/privacy');
    expect(within(footer).getByRole('link', { name: 'Source code on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/SecMinds-Solutions/asr-readiness',
    );
  });

  it('links to the privacy notice and Settings from the user menu', async () => {
    renderApp(<App signIn={setup(signedIn())} adminConsentResult={null} />);
    await openUserMenu();
    expect(screen.getByRole('menuitem', { name: 'Privacy notice' })).toHaveAttribute('href', 'http://localhost:3000/privacy');
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('href', 'http://localhost:3000/app/settings');
    expect(screen.getByRole('menu')).toHaveAccessibleDescription(/ada@contoso\.com/);
  });

  it('asks a signed-out User to sign in on Settings, without reading anything', async () => {
    const signIn = setup(fakeClient(async () => null));
    goTo('/app/settings');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(await screen.findByText('Sign in to see, change or delete your User record.')).toBeInTheDocument();
    expect(signIn.userRecord.userRecord).not.toHaveBeenCalled();
  });

  it('says it is loading the User record on Settings', async () => {
    const userRecord = fakeUserRecord();
    vi.mocked(userRecord.userRecord).mockReturnValue(new Promise(() => {}));
    goTo('/app/settings');
    renderApp(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    expect(await screen.findByText('Loading your User record…')).toBeInTheDocument();
  });

  it('shows why the User record could not be loaded on Settings and lets the User try again', async () => {
    const userRecord = fakeUserRecord();
    vi.mocked(userRecord.userRecord).mockRejectedValueOnce(new Error('The User record service answered HTTP 500.'));
    goTo('/app/settings');
    renderApp(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    const alert = await alertWith('Your User record could not be loaded');
    expect(alert).toHaveTextContent('HTTP 500');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  });

  it('shows a signed-in User their stored User record on Settings, opened from the user menu', async () => {
    renderApp(<App signIn={setup(signedIn())} adminConsentResult={null} />);
    await findPageHeading('Overview');
    await openUserMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(await findPageHeading('Settings')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.queryByRole('heading', { name: 'Privacy notice' })).toBeNull();
    const profile = await screen.findByRole('region', { name: 'Profile' });
    for (const value of [ada.homeTenantId, 'ada@contoso.com', 'Ada', 'Lovelace']) {
      expect(within(profile).getAllByText(value).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('switch', { name: /SecMinds may email me/ })).not.toBeChecked();
  });

  it('withdraws Contact consent and shows the new choice', async () => {
    const userRecord = fakeUserRecord({ ...storedRecord, contactConsent: true });
    goTo('/app/settings');
    renderApp(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    const consent = await screen.findByRole('switch', { name: /SecMinds may email me/ });
    expect(consent).toBeChecked();
    fireEvent.click(consent);
    expect(userRecord.saveContactConsent).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.getByRole('switch', { name: /SecMinds may email me/ })).not.toBeChecked());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('keeps the record on screen and says why when withdrawing fails', async () => {
    const userRecord = fakeUserRecord({ ...storedRecord, contactConsent: true });
    vi.mocked(userRecord.saveContactConsent).mockRejectedValueOnce(new Error('The User record service answered HTTP 500.'));
    goTo('/app/settings');
    renderApp(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('switch', { name: /SecMinds may email me/ }));
    expect(await alertWith('Not changed')).toHaveTextContent('HTTP 500');
    expect(screen.getByRole('switch', { name: /SecMinds may email me/ })).toBeChecked();
  });

  it('deletes the User record only after confirmation, then offers only sign-out', async () => {
    const client = signedIn();
    const signIn = setup(client);
    goTo('/app/settings');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete my User record' }));
    expect(signIn.userRecord.deleteUserRecord).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(signIn.userRecord.deleteUserRecord).toHaveBeenCalledOnce();
    const done = (await screen.findByText('Your User record is deleted')).closest('[role="status"]') as HTMLElement;
    expect(done).toHaveTextContent('Nothing about you remains in storage');
    expect(screen.queryByRole('heading', { name: 'Profile' })).toBeNull();
    navigateTo('/app/');
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
    expect(signIn.checkReadiness).not.toHaveBeenCalled();
    fireEvent.click(within(done).getByRole('button', { name: 'Sign out' }));
    expect(client.signOut).toHaveBeenCalled();
  });

  it('keeps the record and says why when deleting fails', async () => {
    const userRecord = fakeUserRecord();
    vi.mocked(userRecord.deleteUserRecord).mockRejectedValueOnce(new Error('The User record service answered HTTP 503.'));
    goTo('/app/settings');
    renderApp(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete my User record' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await alertWith('Not changed')).toHaveTextContent('could not be deleted');
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  });

  it('says nothing is stored yet for a signed-in User who has not made the Contact consent choice', async () => {
    goTo('/app/settings');
    renderApp(<App signIn={setup(signedIn(), fakeUserRecord(null))} adminConsentResult={null} />);
    expect(await screen.findByText(/Nothing is stored about you yet/)).toBeInTheDocument();
  });
});

describe('App: admin page', () => {
  const frans: SignedInUser = { name: 'Frans', username: 'frans@secminds.nl', homeTenantId: ada.homeTenantId, tenantId: ada.homeTenantId, email: 'frans@secminds.nl', admin: true };
  const users: UserRecord[] = [
    storedRecord,
    { ...storedRecord, username: 'grace@fabrikam.com', firstName: '<b>Grace</b>', lastName: '', contactConsent: true },
  ];

  it('shows the SecMinds admin pages in the user menu only to a User whose ID token has the Admin role, never in the sidebar', async () => {
    const { unmount } = renderApp(<App signIn={setup(fakeClient(async () => ada))} adminConsentResult={null} />);
    await findPageHeading('Overview');
    await openUserMenu();
    expect(screen.queryByRole('menuitem', { name: 'Admin overview' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'User records' })).toBeNull();
    unmount();

    renderApp(<App signIn={setup(fakeClient(async () => frans))} adminConsentResult={null} />);
    await findPageHeading('Overview');
    expect(within(await sidebar()).queryByRole('link', { name: /Admin overview|User records/ })).toBeNull();
    await openUserMenu();
    expect(screen.getByRole('menuitem', { name: 'Admin overview' })).toHaveAttribute('href', 'http://localhost:3000/app/admin');
    expect(screen.getByRole('menuitem', { name: 'User records' })).toHaveAttribute('href', 'http://localhost:3000/app/admin/users');
  });

  it('opens User records and the Admin overview from the user menu, reading the records once', async () => {
    const userRecord = fakeUserRecord();
    vi.mocked(userRecord.listUserRecords).mockResolvedValue({ status: 'allowed', users });
    goTo('/app/admin');
    renderApp(<App signIn={setup(fakeClient(async () => frans), userRecord)} adminConsentResult={null} />);
    await openAdminPage('User records');
    expect(await findPageHeading('User records')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/app/admin/users');
    expect(await screen.findByText('grace@fabrikam.com')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Users per Home tenant' })).toBeNull();
    await openAdminPage('Admin overview');
    expect(await screen.findByRole('table', { name: 'Users per Home tenant' })).toBeInTheDocument();
    expect(userRecord.listUserRecords).toHaveBeenCalledOnce();
  });

  it('opens the admin page from the user menu without signing in again', async () => {
    const client = fakeClient(async () => frans);
    renderApp(<App signIn={setup(client)} adminConsentResult={null} />);
    await findPageHeading('Overview');
    await openUserMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Admin overview' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Admin overview' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/app/admin');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(client.start).toHaveBeenCalledOnce();
  });

  it('lists every User record to an admin, as text', async () => {
    const userRecord = fakeUserRecord();
    vi.mocked(userRecord.listUserRecords).mockResolvedValue({ status: 'allowed', users });
    goTo('/app/admin/users');
    const { container } = renderApp(<App signIn={setup(fakeClient(async () => frans), userRecord)} adminConsentResult={null} />);
    const table = await screen.findByRole('table', { name: 'Every stored User record' });
    expect(within(table).getByText('grace@fabrikam.com')).toBeInTheDocument();
    expect(within(table).getByText('<b>Grace</b>')).toBeInTheDocument();
    expect(within(table).getByText('Given')).toBeInTheDocument();
    expect(within(table).getAllByText('2026-11-01')).toHaveLength(2);
    expect(container.querySelector('b')).toBeNull();
    expect(userRecord.listUserRecords).toHaveBeenCalledOnce();
  });

  it('says "not allowed" when the API refuses the User, also if they open the page by its address', async () => {
    goTo('/app/admin');
    renderApp(<App signIn={setup(fakeClient(async () => ada))} adminConsentResult={null} />);
    expect(await alertWith('Not allowed')).toHaveTextContent('Only SecMinds admins can see the User records.');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows an empty state when there are no User records', async () => {
    const userRecord = fakeUserRecord();
    vi.mocked(userRecord.listUserRecords).mockResolvedValue({ status: 'allowed', users: [] });
    goTo('/app/admin/users');
    renderApp(<App signIn={setup(fakeClient(async () => frans), userRecord)} adminConsentResult={null} />);
    expect(await screen.findByText('No User records yet')).toBeInTheDocument();
  });

  it('shows why the User records could not be read and lets the admin try again', async () => {
    const userRecord = fakeUserRecord();
    vi.mocked(userRecord.listUserRecords)
      .mockRejectedValueOnce(new Error('The User record service answered HTTP 500.'))
      .mockResolvedValue({ status: 'allowed', users });
    goTo('/app/admin/users');
    renderApp(<App signIn={setup(fakeClient(async () => frans), userRecord)} adminConsentResult={null} />);
    const alert = await alertWith('The User records could not be read');
    expect(alert).toHaveTextContent('HTTP 500');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table', { name: 'Every stored User record' })).toBeInTheDocument();
  });

  it('asks a signed-out User to sign in, without reading anything', async () => {
    const signIn = setup(fakeClient(async () => null));
    goTo('/app/admin');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    expect(await screen.findByText('Sign in as a SecMinds admin to see the User records.')).toBeInTheDocument();
    expect(signIn.userRecord.listUserRecords).not.toHaveBeenCalled();
  });
});

describe('App: onboarding check', () => {
  const signedIn = () => fakeClient(async () => ada);
  const renderWith = (readiness: () => Promise<Readiness>) => {
    const signIn = setup(signedIn(), fakeUserRecord(), readiness);
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    return signIn;
  };

  it('does not check the Tenant before the Contact consent choice is made', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(null));
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    await screen.findByRole('checkbox');
    expect(signIn.checkReadiness).not.toHaveBeenCalled();
  });

  it('says it is checking the Tenant', async () => {
    renderWith(() => new Promise(() => {}));
    expect(await screen.findByText('Checking your Tenant…')).toBeInTheDocument();
  });

  it('continues to the Analysis for a Supported tenant and a User with the right roles, with the Tenant status bar', async () => {
    renderWith(async () => ({ status: 'ready', devices: 12 }));
    const status = await screen.findByRole('region', { name: 'Tenant' });
    expect(within(status).getByText(ada.tenantId)).toBeInTheDocument();
    expect(within(status).getByText('12')).toBeInTheDocument();
    expect(await within(status).findByRole('button', { name: 'Read again' })).toBeEnabled();
  });

  it('explains Plan 2 and Defender for Business when the Tenant has no advanced hunting', async () => {
    renderWith(async () => ({ status: 'not-supported', details: "'DeviceInfo' could not be resolved." }));
    expect(await screen.findByRole('heading', { name: 'Your Tenant is not supported' })).toBeInTheDocument();
    expect(screen.getByText(/Defender for Endpoint Plan 2/)).toBeInTheDocument();
    expect(screen.getByText(/Defender for Business/)).toBeInTheDocument();
    expect(screen.getByText("'DeviceInfo' could not be resolved.")).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Tenant' })).not.toBeInTheDocument();
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

describe('App: ASR rules', () => {
  const signedIn = () => fakeClient(async () => ada);

  it('reads the ASR rules once the Tenant is ready, and lists them', async () => {
    const signIn = setup(signedIn());
    goTo('/app/rules');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    expect(await screen.findByRole('heading', { name: 'Rule mode and Coverage per ASR rule' })).toBeInTheDocument();
    expect(signIn.loadRuleOverview).toHaveBeenCalledOnce();
    expect(within(screen.getByRole('table', { name: /Rule mode from the Tenant/ })).getAllByText('0 of 12 devices')).toHaveLength(19);
  });

  it('does not read the ASR rules when the Tenant is not ready', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), async () => ({ status: 'no-devices' }));
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    await screen.findByRole('heading', { name: 'No devices to analyse yet' });
    expect(signIn.loadRuleOverview).not.toHaveBeenCalled();
  });

  it('says it is reading the ASR rules', async () => {
    goTo('/app/rules');
    renderApp(<App signIn={setup(signedIn(), fakeUserRecord(), undefined, () => new Promise(() => {}))} adminConsentResult={null} />);
    expect(await screen.findByText('Reading the Intune policies and the Rule modes devices report…')).toBeInTheDocument();
  });

  it('shows why the ASR rules could not be read and lets the User try again', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, async () => Promise.reject(new Error('Microsoft Graph answered HTTP 503.')));
    goTo('/app/rules');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    const alert = await alertWith('The ASR rules could not be read');
    expect(alert).toHaveTextContent('HTTP 503');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(signIn.loadRuleOverview).toHaveBeenCalledTimes(2));
  });
});

describe('App: Audit events', () => {
  const signedIn = () => fakeClient(async () => ada);

  it('reads the Audit events once the Tenant is ready, and shows them', async () => {
    const signIn = setup(signedIn());
    goTo('/app/events');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    expect(await screen.findByRole('heading', { name: 'Audit events per ASR rule' })).toBeInTheDocument();
    expect(signIn.loadAuditEvents).toHaveBeenCalledOnce();
    expect(screen.getByText('No Audit events in the last 30 days')).toBeInTheDocument();
  });

  it('does not read the Audit events when the Tenant is not ready', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), async () => ({ status: 'no-devices' }));
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    await screen.findByRole('heading', { name: 'No devices to analyse yet' });
    expect(signIn.loadAuditEvents).not.toHaveBeenCalled();
  });

  it('says it is counting the Audit events', async () => {
    goTo('/app/events');
    renderApp(<App signIn={setup(signedIn(), fakeUserRecord(), undefined, undefined, () => new Promise(() => {}))} adminConsentResult={null} />);
    expect(await screen.findByText('Counting Audit events in advanced hunting…')).toBeInTheDocument();
  });

  it('shows why the Audit events could not be read, such as throttling, and lets the User try again', async () => {
    const throttled = new Error('Advanced hunting is throttled: wait a few minutes and try again.');
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, undefined, async () => Promise.reject(throttled));
    goTo('/app/events');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    const alert = await alertWith('The Audit events could not be read');
    expect(alert).toHaveTextContent('The Audit events could not be read');
    expect(alert).toHaveTextContent('Advanced hunting is throttled');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(signIn.loadAuditEvents).toHaveBeenCalledTimes(2));
  });
});

describe('App: pages of the Analysis', () => {
  const signedIn = () => fakeClient(async () => ada);

  it('starts on the Overview, with the sidebar marking it as the page shown', async () => {
    renderApp(<App signIn={setup(signedIn())} adminConsentResult={null} />);
    expect(await findPageHeading('Overview')).toBeInTheDocument();
    const nav = await sidebar();
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Verdicts' })).toHaveAttribute('href', 'http://localhost:3000/app/verdicts');
    expect(within(nav).getByRole('link', { name: 'Suggested policy' })).toHaveAttribute('href', 'http://localhost:3000/app/policy');
    expect(within(nav).getByRole('link', { name: 'ASR rules' })).toHaveAttribute('href', 'http://localhost:3000/app/rules');
    expect(within(nav).getByRole('link', { name: 'Audit events' })).toHaveAttribute('href', 'http://localhost:3000/app/events');
    expect(within(nav).queryByRole('link', { name: 'Settings' })).toBeNull();
    expect(within(nav).getAllByRole('link')).toHaveLength(5);
  });

  it('moves between pages without reading Graph again, and moves focus to the page', async () => {
    const signIn = setup(signedIn());
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    await findPageHeading('Overview');
    await openPage('ASR rules');
    expect(await findPageHeading('ASR rules')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/app/rules');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(within(await sidebar()).getByRole('link', { name: 'ASR rules' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('heading', { name: 'Rule mode and Coverage per ASR rule' })).toBeInTheDocument();
    await openPage('Audit events');
    expect(await screen.findByRole('heading', { name: 'Audit events per ASR rule' })).toBeInTheDocument();
    await openPage('Verdicts');
    expect(await screen.findByRole('heading', { name: 'Verdict per ASR rule' })).toBeInTheDocument();
    await openPage('Suggested policy');
    expect(await findPageHeading('Suggested policy')).toBeInTheDocument();
    await openSettings();
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    await openPage('Overview');
    expect(await findPageHeading('Overview')).toBeInTheDocument();
    expect(signIn.checkReadiness).toHaveBeenCalledOnce();
    expect(signIn.loadRuleOverview).toHaveBeenCalledOnce();
    expect(signIn.loadAuditEvents).toHaveBeenCalledOnce();
    expect(signIn.loadPolicyChanges).toHaveBeenCalledOnce();
  });

  it('keeps a part that is still loading when the User moves away and back', async () => {
    let finish: (events: AuditEvents) => void = () => {};
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, undefined, () => new Promise((resolve) => (finish = resolve)));
    goTo('/app/events');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    expect(await screen.findByText('Counting Audit events in advanced hunting…')).toBeInTheDocument();
    await openPage('Verdicts');
    await act(async () => finish(auditEventsFromRows([], [])));
    await openPage('Audit events');
    expect(await screen.findByText('No Audit events in the last 30 days')).toBeInTheDocument();
    expect(signIn.loadAuditEvents).toHaveBeenCalledOnce();
  });

  it('reads every part again on Read again, and says when it was read', async () => {
    const signIn = setup(signedIn());
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    const status = await screen.findByRole('region', { name: 'Tenant' });
    await waitFor(() => expect(within(status).getByRole('button', { name: 'Read again' })).toBeEnabled());
    expect(within(status).queryByText('Reading…')).toBeNull();
    expect(within(status).getByText('Observation window')).toBeInTheDocument();
    fireEvent.click(within(status).getByRole('button', { name: 'Read again' }));
    expect(within(status).getByText('Reading…')).toBeInTheDocument();
    await waitFor(() => expect(signIn.loadPolicyChanges).toHaveBeenCalledTimes(2));
    expect(signIn.loadRuleOverview).toHaveBeenCalledTimes(2);
    expect(signIn.loadAuditEvents).toHaveBeenCalledTimes(2);
    expect(signIn.checkReadiness).toHaveBeenCalledOnce();
  });

  it('does not check the Tenant or read the Analysis until a page of the Analysis is opened', async () => {
    const signIn = setup(signedIn());
    goTo('/app/settings');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(signIn.checkReadiness).not.toHaveBeenCalled();
    await openPage('Verdicts');
    await waitFor(() => expect(signIn.loadRuleOverview).toHaveBeenCalledOnce());
    expect(signIn.checkReadiness).toHaveBeenCalledOnce();
  });

  it('shows the onboarding message on every page of the Analysis while the Tenant is not ready, and keeps Settings reachable', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), async () => ({ status: 'no-devices' }));
    goTo('/app/verdicts');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    expect(await screen.findByRole('heading', { name: 'No devices to analyse yet' })).toBeInTheDocument();
    await openPage('ASR rules');
    expect(await screen.findByRole('heading', { name: 'No devices to analyse yet' })).toBeInTheDocument();
    await openSettings();
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(signIn.loadRuleOverview).not.toHaveBeenCalled();
  });

  it('shows the admin consent guidance and sign-in errors on every page, not only the home page', async () => {
    goTo('/app/verdicts');
    const { unmount } = renderApp(<App signIn={setup(fakeClient(async () => Promise.reject(consentError)))} adminConsentResult={null} />);
    expect(await screen.findByRole('link', { name: /grant admin consent/i })).toHaveAttribute('href', consentUrl);
    unmount();

    goTo('/app/settings');
    renderApp(<App signIn={setup(fakeClient(async () => Promise.reject(new Error('AADSTS50011: The redirect URI does not match.'))))} adminConsentResult={null} />);
    expect(await alertWith('Sign-in failed')).toHaveTextContent('AADSTS50011');
  });

  it('asks a signed-out User to sign in on a page of the Analysis, without reading anything', async () => {
    const signIn = setup(fakeClient(async () => null));
    goTo('/app/verdicts');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Verdicts' })).toBeInTheDocument();
    expect(await screen.findByText(/Sign in to run an Analysis/)).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
    expect(signIn.checkReadiness).not.toHaveBeenCalled();
  });
});

describe('App: Verdicts', () => {
  const signedIn = () => fakeClient(async () => ada);
  const ADOBE = '7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c';
  const adobeInAudit: RuleOverview = {
    modes: ruleModesFromPolicies([
      {
        id: 'p1',
        name: 'ASR',
        assignments: [toAllDevices],
        settings: asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'audit')).value,
        createdDateTime: daysAgo(90),
        lastModifiedDateTime: daysAgo(60),
      },
    ]),
    coverage: { devices: 12, auditDevices: { [ADOBE]: 12 }, unrecognisedRules: [] },
  };

  it('combines the ASR rules, Audit events and Intune audit log into a Verdict per rule, each read once', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, async () => adobeInAudit);
    goTo('/app/verdicts');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    expect(await screen.findByRole('heading', { name: 'Verdict per ASR rule' })).toBeInTheDocument();
    const verdicts = screen.getByRole('table', { name: /Verdict, Coverage and reason/ });
    const adobe = within(verdicts).getByRole('cell', { name: 'Block Adobe Reader from creating child processes' }).closest('tr') as HTMLElement;
    expect(within(adobe).getByText('Ready to block')).toBeInTheDocument();
    expect(within(adobe).getByText('12 of 12 devices')).toBeInTheDocument();
    expect(signIn.loadRuleOverview).toHaveBeenCalledOnce();
    expect(signIn.loadAuditEvents).toHaveBeenCalledOnce();
    expect(signIn.loadPolicyChanges).toHaveBeenCalledOnce();
  });

  it('gives No evidence and says why when Intune changed the policy that sets the rule recently', async () => {
    const changed = async (): Promise<PolicyChanges> => ({ ...noPolicyChanges(), changes: [{ policyId: 'p1', at: daysAgo(3) }] });
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, async () => adobeInAudit, undefined, changed);
    goTo('/app/verdicts');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    const verdicts = await screen.findByRole('table', { name: /Verdict, Coverage and reason/ });
    const adobe = within(verdicts).getByRole('cell', { name: 'Block Adobe Reader from creating child processes' }).closest('tr') as HTMLElement;
    expect(within(adobe).getByText('No evidence')).toBeInTheDocument();
    expect(within(adobe).getByText('12 of 12 devices')).toBeInTheDocument();
    expect(adobe).toHaveTextContent('Intune changed a policy that sets this rule, or its assignments, 3 days ago');
  });

  it('offers the Suggested policy with the rules that are ready, on its own page', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, async () => adobeInAudit);
    goTo('/app/policy');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    expect(await screen.findByRole('heading', { name: 'Rules the Suggested policy sets to Block mode' })).toBeInTheDocument();
    const policy = screen.getByRole('table', { name: /Suggested policy sets to Block mode/ });
    expect(within(policy).getByRole('cell', { name: 'Block Adobe Reader from creating child processes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Suggested policy/ })).toBeInTheDocument();
  });

  it('gives no Verdicts when the Coverage query failed, rather than No evidence for every rule', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, async () => ({ ...adobeInAudit, coverage: { failed: 'Advanced hunting did not answer.' } }));
    goTo('/app/verdicts');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    const alert = await alertWith('No Verdicts');
    expect(alert).toHaveTextContent('Coverage: Advanced hunting did not answer.');
    expect(screen.queryByRole('heading', { name: 'Verdict per ASR rule' })).toBeNull();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(signIn.loadRuleOverview).toHaveBeenCalledTimes(2));
  });

  it('says it is working out the Verdicts while a part is still loading', async () => {
    goTo('/app/verdicts');
    renderApp(<App signIn={setup(signedIn(), fakeUserRecord(), undefined, undefined, undefined, () => new Promise(() => {}))} adminConsentResult={null} />);
    expect(await screen.findByText('Working out a Verdict per ASR rule…')).toBeInTheDocument();
  });

  it('gives no Verdicts when a part could not be read, says which, and lets the User try that part again', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, undefined, async () => Promise.reject(new Error('Advanced hunting is throttled.')));
    goTo('/app/verdicts');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    const alert = await alertWith('No Verdicts');
    expect(alert).toHaveTextContent('the Audit events: Advanced hunting is throttled.');
    expect(screen.queryByRole('heading', { name: 'Verdict per ASR rule' })).toBeNull();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(signIn.loadAuditEvents).toHaveBeenCalledTimes(2));
    expect(signIn.loadRuleOverview).toHaveBeenCalledOnce();
  });

  it('still gives the Verdicts when the Intune audit log cannot be read, with No evidence and the reason for rules in Audit mode', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, async () => adobeInAudit, undefined, async () =>
      Promise.reject(new Error('Microsoft Graph returned more than 50 pages.')),
    );
    goTo('/app/verdicts');
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    const verdicts = await screen.findByRole('table', { name: /Verdict, Coverage and reason/ });
    const adobe = within(verdicts).getByRole('cell', { name: 'Block Adobe Reader from creating child processes' }).closest('tr') as HTMLElement;
    expect(within(adobe).getByText('No evidence')).toBeInTheDocument();
    expect(adobe).toHaveTextContent('The Intune audit log could not be read, so the Audit period is not known: Microsoft Graph returned more than 50 pages.');
  });

  it('opens the Verdicts filtered to one Verdict from its tile on the Overview, with counts that match the table', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, async () => adobeInAudit);
    renderApp(<App signIn={signIn} adminConsentResult={null} />);
    const tile = await screen.findByRole('link', { name: /^1 Ready to block/ });
    expect(tile).toHaveTextContent('Coverage 12 of 12 devices');
    expect(screen.getByRole('link', { name: /^12 Devices report their Rule modes/ })).toBeInTheDocument();
    fireEvent.click(tile);
    expect(await findPageHeading('Verdicts')).toBeInTheDocument();
    expect(window.location.search).toBe('?verdict=ready-to-block');
    const table = await screen.findByRole('table', { name: /Ready to block$/ });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByRole('cell', { name: 'Block Adobe Reader from creating child processes' })).toBeInTheDocument();
  });

  it('keeps the filter on reload and follows Back to all rules', async () => {
    goTo('/app/verdicts?verdict=no-evidence');
    renderApp(<App signIn={setup(signedIn())} adminConsentResult={null} />);
    expect(await screen.findByRole('link', { name: /^No evidence \(19\)/ })).toHaveAttribute('aria-current', 'true');
    navigateTo('/app/verdicts');
    expect(await screen.findByRole('link', { name: 'All (19)' })).toHaveAttribute('aria-current', 'true');
  });

  it('shows all rules for an unknown filter, without repeating its value', async () => {
    goTo('/app/verdicts?verdict=%3Cb%3Ex%3C%2Fb%3E');
    renderApp(<App signIn={setup(signedIn())} adminConsentResult={null} />);
    expect(await screen.findByRole('link', { name: 'All (19)' })).toHaveAttribute('aria-current', 'true');
    expect(screen.queryByText(/<b>x<\/b>/)).toBeNull();
  });
});
