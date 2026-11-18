import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App, type SignInSetup } from './App';
import { ThemeContext } from './components/ThemeToggle';
import { createThemeController } from './theme';
import type { AuthClient } from './auth/msalAuthClient';
import type { SignedInUser } from './auth/user';
import { auditEventsFromRows, type AuditEvents } from './analysis/auditEvents';
import type { AuditPeriods } from './analysis/auditPeriods';
import { asrSettings, choice, toAllDevices } from './analysis/fixtures/intunePolicies';
import { ruleModesFromPolicies } from './analysis/intuneRuleModes';
import type { RuleOverview } from './analysis/ruleOverview';
import type { Readiness, ReadinessCheck } from './onboarding/readiness';
import type { UserRecord, UserRecordClient } from './user-record/client';

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
  };
}

const emptyOverview: RuleOverview = {
  modes: ruleModesFromPolicies([]),
  coverage: { devices: 12, auditDevices: {}, unrecognisedRules: [] },
};

function setup(
  client: AuthClient,
  userRecord: UserRecordClient = fakeUserRecord(),
  checkReadiness: ReadinessCheck = async () => ({ status: 'ready', devices: 12 }),
  loadRuleOverview: () => Promise<RuleOverview> = async () => emptyOverview,
  loadAuditEvents: () => Promise<AuditEvents> = async () => auditEventsFromRows([], []),
  loadAuditPeriods: () => Promise<AuditPeriods> = async () => ({}),
): SignInSetup {
  return {
    client,
    adminConsentUrl: consentUrl,
    userRecord,
    checkReadiness: vi.fn(checkReadiness),
    loadRuleOverview: vi.fn(loadRuleOverview),
    loadAuditEvents: vi.fn(loadAuditEvents),
    loadAuditPeriods: vi.fn(loadAuditPeriods),
  };
}

/** The alert with this title; a failed part also shows the No Verdicts alert. */
const alertWith = async (title: string) =>
  (await screen.findAllByRole('alert')).find((alert) => alert.textContent?.includes(title)) as HTMLElement;

/** Opens one of the Analysis tabs once the onboarding check has passed. */
const openTab = async (name: string) => fireEvent.click(await screen.findByRole('tab', { name }));

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
    vi.mocked(userRecord.userRecord).mockRejectedValueOnce(new Error('The User record service answered HTTP 503.'));
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

describe('App: theme', () => {
  it('shows the theme button on every page, also when sign-in is not configured', () => {
    const query = { matches: false, addEventListener: () => {}, removeEventListener: () => {} };
    const controller = createThemeController(document.createElement('html'), query, () => {
      throw new Error('no storage');
    });
    render(
      <ThemeContext.Provider value={controller}>
        <App signIn={null} adminConsentResult={null} />
      </ThemeContext.Provider>,
    );
    const nav = screen.getByRole('navigation');
    fireEvent.click(within(nav).getByRole('button', { name: 'Switch to dark mode' }));
    expect(within(nav).getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });
});

describe('App: privacy notice and the User record', () => {
  const signedIn = () => fakeClient(async () => ada);
  const openPrivacyNotice = () => {
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'Privacy notice' }));
    fireEvent(window, new HashChangeEvent('hashchange'));
  };

  afterEach(() => {
    window.location.hash = '';
  });

  it('links to the privacy notice from every page, also when sign-in is not configured', async () => {
    render(<App signIn={null} adminConsentResult={null} />);
    expect(within(screen.getByRole('navigation')).getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '#privacy');
    openPrivacyNotice();
    expect(await screen.findByRole('heading', { name: 'Privacy notice' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('describes the data, the purpose, EU hosting and the rights, and asks a signed-out User to sign in for their record', async () => {
    window.location.hash = '#privacy';
    render(<App signIn={setup(fakeClient(async () => null))} adminConsentResult={null} />);
    expect(await screen.findByRole('heading', { name: 'Privacy notice' })).toBeInTheDocument();
    expect(screen.getByText(/West Europe region, in the European Union/)).toBeInTheDocument();
    expect(screen.getByText(/withdraw your Contact consent/)).toBeInTheDocument();
    expect(screen.getByText(/removed from storage at once/)).toBeInTheDocument();
    expect(screen.getByText('Sign in to see, change or delete your User record.')).toBeInTheDocument();
  });

  it('shows a signed-in User their stored User record on the privacy notice', async () => {
    render(<App signIn={setup(signedIn())} adminConsentResult={null} />);
    await screen.findByRole('heading', { name: 'Signed in' });
    openPrivacyNotice();
    const card = (await screen.findByRole('heading', { name: 'Your User record' })).closest('article') as HTMLElement;
    for (const value of [ada.homeTenantId, 'ada@contoso.com', 'Ada', 'Lovelace', 'Not given']) {
      expect(within(card).getAllByText(value).length).toBeGreaterThan(0);
    }
  });

  it('withdraws Contact consent and shows the new choice', async () => {
    const userRecord = fakeUserRecord({ ...storedRecord, contactConsent: true });
    window.location.hash = '#privacy';
    render(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw Contact consent' }));
    expect(userRecord.saveContactConsent).toHaveBeenCalledWith(false);
    expect(await screen.findByText('Not given')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Give Contact consent' })).toBeInTheDocument();
  });

  it('keeps the record on screen and says why when withdrawing fails', async () => {
    const userRecord = fakeUserRecord({ ...storedRecord, contactConsent: true });
    vi.mocked(userRecord.saveContactConsent).mockRejectedValueOnce(new Error('The User record service answered HTTP 500.'));
    window.location.hash = '#privacy';
    render(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw Contact consent' }));
    expect(await alertWith('Not changed')).toHaveTextContent('HTTP 500');
    expect(screen.getByText('Given')).toBeInTheDocument();
  });

  it('deletes the User record only after confirmation, then offers only sign-out', async () => {
    const client = signedIn();
    const signIn = setup(client);
    window.location.hash = '#privacy';
    render(<App signIn={signIn} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete my User record' }));
    expect(signIn.userRecord.deleteUserRecord).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(signIn.userRecord.deleteUserRecord).toHaveBeenCalledOnce();
    const done = (await screen.findByText('Your User record is deleted')).closest('[role="status"]') as HTMLElement;
    expect(done).toHaveTextContent('Nothing about you remains in storage');
    expect(screen.queryByRole('heading', { name: 'Your User record' })).toBeNull();
    window.location.hash = '';
    fireEvent(window, new HashChangeEvent('hashchange'));
    expect(screen.queryByRole('heading', { name: 'Signed in' })).toBeNull();
    expect(signIn.checkReadiness).not.toHaveBeenCalled();
    fireEvent.click(within(done).getByRole('button', { name: 'Sign out' }));
    expect(client.signOut).toHaveBeenCalled();
  });

  it('keeps the record and says why when deleting fails', async () => {
    const userRecord = fakeUserRecord();
    vi.mocked(userRecord.deleteUserRecord).mockRejectedValueOnce(new Error('The User record service answered HTTP 503.'));
    window.location.hash = '#privacy';
    render(<App signIn={setup(signedIn(), userRecord)} adminConsentResult={null} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete my User record' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await alertWith('Not changed')).toHaveTextContent('could not be deleted');
    expect(screen.getByRole('heading', { name: 'Your User record' })).toBeInTheDocument();
  });

  it('says nothing is stored yet for a signed-in User who has not made the Contact consent choice', async () => {
    window.location.hash = '#privacy';
    render(<App signIn={setup(signedIn(), fakeUserRecord(null))} adminConsentResult={null} />);
    expect(await screen.findByText(/Nothing is stored about you yet/)).toBeInTheDocument();
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
    expect(screen.getByText(/advanced hunting shows 12 devices/)).toBeInTheDocument();
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

describe('App: ASR rules', () => {
  const signedIn = () => fakeClient(async () => ada);

  it('reads the ASR rules once the Tenant is ready, and lists them', async () => {
    const signIn = setup(signedIn());
    render(<App signIn={signIn} adminConsentResult={null} />);
    await openTab('ASR rules');
    expect(await screen.findByRole('heading', { name: 'ASR rules' })).toBeInTheDocument();
    expect(signIn.loadRuleOverview).toHaveBeenCalledOnce();
    expect(within(screen.getByRole('table', { name: /Rule mode from the Tenant/ })).getAllByText('0 of 12 devices')).toHaveLength(19);
  });

  it('does not read the ASR rules when the Tenant is not ready', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), async () => ({ status: 'no-devices' }));
    render(<App signIn={signIn} adminConsentResult={null} />);
    await screen.findByRole('heading', { name: 'No devices to analyse yet' });
    expect(signIn.loadRuleOverview).not.toHaveBeenCalled();
  });

  it('says it is reading the ASR rules', async () => {
    render(<App signIn={setup(signedIn(), fakeUserRecord(), undefined, () => new Promise(() => {}))} adminConsentResult={null} />);
    await openTab('ASR rules');
    expect(await screen.findByText('Reading the Intune policies and the Rule modes devices report…')).toBeInTheDocument();
  });

  it('shows why the ASR rules could not be read and lets the User try again', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, async () => Promise.reject(new Error('Microsoft Graph answered HTTP 503.')));
    render(<App signIn={signIn} adminConsentResult={null} />);
    await openTab('ASR rules');
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
    render(<App signIn={signIn} adminConsentResult={null} />);
    await openTab('Audit events');
    expect(await screen.findByRole('heading', { name: 'Audit events' })).toBeInTheDocument();
    expect(signIn.loadAuditEvents).toHaveBeenCalledOnce();
    expect(screen.getByText('No Audit events in the last 30 days')).toBeInTheDocument();
  });

  it('does not read the Audit events when the Tenant is not ready', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), async () => ({ status: 'no-devices' }));
    render(<App signIn={signIn} adminConsentResult={null} />);
    await screen.findByRole('heading', { name: 'No devices to analyse yet' });
    expect(signIn.loadAuditEvents).not.toHaveBeenCalled();
  });

  it('says it is counting the Audit events', async () => {
    render(<App signIn={setup(signedIn(), fakeUserRecord(), undefined, undefined, () => new Promise(() => {}))} adminConsentResult={null} />);
    await openTab('Audit events');
    expect(await screen.findByText('Counting Audit events in advanced hunting…')).toBeInTheDocument();
  });

  it('shows why the Audit events could not be read, such as throttling, and lets the User try again', async () => {
    const throttled = new Error('Advanced hunting is throttled: wait a few minutes and try again.');
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, undefined, async () => Promise.reject(throttled));
    render(<App signIn={signIn} adminConsentResult={null} />);
    await openTab('Audit events');
    const alert = await alertWith('The Audit events could not be read');
    expect(alert).toHaveTextContent('The Audit events could not be read');
    expect(alert).toHaveTextContent('Advanced hunting is throttled');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(signIn.loadAuditEvents).toHaveBeenCalledTimes(2));
  });
});

describe('App: Analysis tabs', () => {
  const signedIn = () => fakeClient(async () => ada);

  it('shows the Verdicts tab first, with the Suggested policy in it', async () => {
    render(<App signIn={setup(signedIn())} adminConsentResult={null} />);
    expect(await screen.findByRole('tab', { name: 'Verdicts' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'ASR rules' })).toHaveAttribute('aria-selected', 'false');
    expect(await screen.findByRole('heading', { name: 'Verdicts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Suggested policy' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Audit events' })).toBeNull();
  });

  it('switches tabs without reading Graph again', async () => {
    const signIn = setup(signedIn());
    render(<App signIn={signIn} adminConsentResult={null} />);
    await screen.findByRole('heading', { name: 'Verdicts' });
    await openTab('ASR rules');
    expect(await screen.findByRole('heading', { name: 'ASR rules' })).toBeInTheDocument();
    await openTab('Audit events');
    expect(await screen.findByRole('heading', { name: 'Audit events' })).toBeInTheDocument();
    await openTab('Verdicts');
    expect(await screen.findByRole('heading', { name: 'Verdicts' })).toBeInTheDocument();
    expect(signIn.loadRuleOverview).toHaveBeenCalledOnce();
    expect(signIn.loadAuditEvents).toHaveBeenCalledOnce();
    expect(signIn.loadAuditPeriods).toHaveBeenCalledOnce();
  });

  it('keeps a part that is still loading when the User switches away and back', async () => {
    let finish: (events: AuditEvents) => void = () => {};
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, undefined, () => new Promise((resolve) => (finish = resolve)));
    render(<App signIn={signIn} adminConsentResult={null} />);
    await openTab('Audit events');
    expect(await screen.findByText('Counting Audit events in advanced hunting…')).toBeInTheDocument();
    await openTab('Verdicts');
    finish(auditEventsFromRows([], []));
    await openTab('Audit events');
    expect(await screen.findByText('No Audit events in the last 30 days')).toBeInTheDocument();
    expect(signIn.loadAuditEvents).toHaveBeenCalledOnce();
  });
});

describe('App: Verdicts', () => {
  const signedIn = () => fakeClient(async () => ada);
  const ADOBE = '7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c';
  const adobeInAudit: RuleOverview = {
    modes: ruleModesFromPolicies([
      { id: 'p1', name: 'ASR', assignments: [toAllDevices], settings: asrSettings(choice('blockadobereaderfromcreatingchildprocesses', 'audit')).value },
    ]),
    coverage: { devices: 12, auditDevices: { [ADOBE]: 12 }, unrecognisedRules: [] },
  };

  it('combines the ASR rules, Audit events and Audit periods into a Verdict per rule, each read once', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, async () => adobeInAudit, undefined, async () => ({
      [ADOBE]: { devices: 12, shortestDays: 20 },
    }));
    render(<App signIn={signIn} adminConsentResult={null} />);
    expect(await screen.findByRole('heading', { name: 'Verdicts' })).toBeInTheDocument();
    const verdicts = screen.getByRole('table', { name: /Verdict, Coverage and reason/ });
    const adobe = within(verdicts).getByRole('cell', { name: 'Block Adobe Reader from creating child processes' }).closest('tr') as HTMLElement;
    expect(within(adobe).getByText('Ready to block')).toBeInTheDocument();
    expect(within(adobe).getByText('12 of 12 devices')).toBeInTheDocument();
    expect(signIn.loadRuleOverview).toHaveBeenCalledOnce();
    expect(signIn.loadAuditEvents).toHaveBeenCalledOnce();
    expect(signIn.loadAuditPeriods).toHaveBeenCalledOnce();
  });

  it('offers the Suggested policy with the rules that are ready, under the Verdicts', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, async () => adobeInAudit, undefined, async () => ({
      [ADOBE]: { devices: 12, shortestDays: 20 },
    }));
    render(<App signIn={signIn} adminConsentResult={null} />);
    expect(await screen.findByRole('heading', { name: 'Suggested policy' })).toBeInTheDocument();
    const policy = screen.getByRole('table', { name: /Suggested policy sets to Block mode/ });
    expect(within(policy).getByRole('cell', { name: 'Block Adobe Reader from creating child processes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Suggested policy/ })).toBeInTheDocument();
  });

  it('gives no Verdicts when the Coverage query failed, rather than No evidence for every rule', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, async () => ({ ...adobeInAudit, coverage: { failed: 'Advanced hunting did not answer.' } }));
    render(<App signIn={signIn} adminConsentResult={null} />);
    const alert = await alertWith('No Verdicts');
    expect(alert).toHaveTextContent('Coverage: Advanced hunting did not answer.');
    expect(screen.queryByRole('heading', { name: 'Verdicts' })).toBeNull();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(signIn.loadRuleOverview).toHaveBeenCalledTimes(2));
  });

  it('says it is working out the Verdicts while a part is still loading', async () => {
    render(<App signIn={setup(signedIn(), fakeUserRecord(), undefined, undefined, undefined, () => new Promise(() => {}))} adminConsentResult={null} />);
    expect(await screen.findByText('Working out a Verdict per ASR rule…')).toBeInTheDocument();
  });

  it('gives no Verdicts when a part could not be read, says which, and lets the User try that part again', async () => {
    const signIn = setup(signedIn(), fakeUserRecord(), undefined, undefined, undefined, async () => Promise.reject(new Error('Advanced hunting is throttled.')));
    render(<App signIn={signIn} adminConsentResult={null} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No Verdicts');
    expect(alert).toHaveTextContent('how long rules have been in Audit mode: Advanced hunting is throttled.');
    expect(screen.queryByRole('heading', { name: 'Verdicts' })).toBeNull();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(signIn.loadAuditPeriods).toHaveBeenCalledTimes(2));
    expect(signIn.loadRuleOverview).toHaveBeenCalledOnce();
  });
});
