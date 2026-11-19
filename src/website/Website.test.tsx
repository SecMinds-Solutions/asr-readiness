import { render, screen, within } from '@testing-library/react';
import { NavigationProvider } from '../navigation';
import { DEFAULT_ORIGINS, type WebsitePage } from '../places';
import { GET_STARTED_LABEL } from './Landing';
import { Website } from './Website';

const consentUrl = 'https://login.microsoftonline.com/organizations/v2.0/adminconsent?client_id=abc';

function renderWebsite(page: WebsitePage = 'home', adminConsentUrl: string | null = consentUrl) {
  window.history.replaceState(null, '', page === 'home' ? '/' : `/${page}`);
  return render(
    <NavigationProvider origins={DEFAULT_ORIGINS} initial={{ site: 'website', page }}>
      <Website adminConsentUrl={adminConsentUrl} />
    </NavigationProvider>,
  );
}

const APP = 'http://localhost:3000/app/';

describe('Website: header and footer', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('links to How it works, FAQ and the privacy notice, and opens the app', () => {
    renderWebsite();
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'ASR Compass home' })).toHaveAttribute('href', 'http://localhost:3000/');
    expect(within(header).getByRole('link', { name: 'How it works' })).toHaveAttribute('href', 'http://localhost:3000/#how-it-works');
    expect(within(header).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', 'http://localhost:3000/#faq');
    expect(within(header).getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', 'http://localhost:3000/privacy');
    expect(within(header).getByRole('link', { name: 'Open app' })).toHaveAttribute('href', APP);
    expect(within(header).queryByRole('button', { name: /sign in/i })).toBeNull();
  });

  it('has a footer with the privacy notice, the source code, the copyright and the licence', () => {
    renderWebsite();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', 'http://localhost:3000/privacy');
    expect(within(footer).getByRole('link', { name: 'Source code on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/SecMinds-Solutions/asr-readiness',
    );
    expect(footer).toHaveTextContent(/© \d{4} SecMinds Solutions/);
    expect(within(footer).getByRole('link', { name: 'MIT licence' })).toBeInTheDocument();
    expect(footer).toHaveTextContent('SecMinds logos and brand assets are not covered by it');
  });

  it('shows the privacy notice as its own page, with what the website does not do', () => {
    renderWebsite('privacy');
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy notice' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText(/does not sign you in and sets no cookies/)).toBeInTheDocument();
    expect(screen.getByText(/West Europe region, in the European Union/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Settings in the app' })).toHaveAttribute('href', 'http://localhost:3000/app/settings');
    expect(screen.queryByRole('heading', { name: 'Your User record' })).toBeNull();
  });
});

describe('Website: landing page', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('has one main heading and all nine sections, in order', () => {
    renderWebsite();
    expect(screen.getAllByRole('heading', { level: 1 }).map((heading) => heading.textContent)).toEqual(['ASR Compass']);
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Why ASR rules stay in Audit mode',
      'How it works',
      "Who it's for",
      'Benefits',
      'Get started in 5 steps',
      'Built to be trusted',
      'Frequently asked questions',
      'Ready to move your ASR rules to Block mode?',
    ]);
    expect(within(screen.getByRole('main')).getByText('Preview')).toBeInTheDocument();
  });

  it('gives the header links a section to scroll to', () => {
    const { container } = renderWebsite();
    expect(container.querySelector('#how-it-works')).toHaveAccessibleName('How it works');
    expect(container.querySelector('#faq')).toHaveAccessibleName('Frequently asked questions');
  });

  it('leads both calls to action to the app, asking it to start sign-in, and the secondary one to How it works', () => {
    renderWebsite();
    const ctas = screen.getAllByRole('link', { name: GET_STARTED_LABEL });
    expect(ctas).toHaveLength(2);
    ctas.forEach((cta) => expect(cta).toHaveAttribute('href', `${APP}?sign-in`));
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '#how-it-works');
  });

  it('shows a Verdict table with fictitious data, every Verdict with its word', () => {
    renderWebsite();
    const table = screen.getByRole('table', { name: 'Example Verdicts (fictitious data)' });
    for (const verdict of ['Ready to block', 'Ready with exclusions', 'Not ready', 'No evidence']) {
      expect(within(table).getByText(verdict)).toBeInTheDocument();
    }
    expect(within(table).getByText('Block Adobe Reader from creating child processes')).toBeInTheDocument();
    expect(within(table).getAllByText(/of 50 devices/)).toHaveLength(4);
  });

  it('lists the five steps, with the admin consent link in the consent step', () => {
    renderWebsite();
    const steps = within(screen.getByRole('region', { name: 'Get started in 5 steps' })).getAllByRole('listitem');
    expect(steps.map((step) => within(step).getByRole('heading').textContent)).toEqual([
      'Check the requirements',
      'Ask an admin to grant admin consent',
      'Sign in with Microsoft',
      'Review the Verdicts per ASR rule',
      'Download the Suggested policy',
    ]);
    expect(steps[0]).toHaveTextContent('Defender for Endpoint Plan 2');
    expect(within(steps[1] as HTMLElement).getByRole('link', { name: 'Open the admin consent page' })).toHaveAttribute('href', consentUrl);
    expect(within(steps[2] as HTMLElement).getByRole('link', { name: 'Sign in now' })).toHaveAttribute('href', `${APP}?sign-in`);
  });

  it('says where the admin consent link is when this build has no app registration', () => {
    renderWebsite('home', null);
    expect(screen.getByText(/The app shows the admin consent link/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open the admin consent page' })).toBeNull();
  });

  it('uses the Observation window and Verdict thresholds from the analysis', () => {
    renderWebsite();
    expect(screen.getByText(/last 30 days of audit events and a rule that has been in Audit mode for at least 14 days/)).toBeInTheDocument();
    expect(screen.getAllByText(/at most 5 paths/).length).toBeGreaterThan(0);
  });

  it('answers questions in an accordion, starting with where the data goes', () => {
    renderWebsite();
    const faq = screen.getByRole('region', { name: 'Frequently asked questions' });
    expect(faq.querySelectorAll('details')).toHaveLength(8);
    expect(within(faq).getByText('Does my security data leave my browser?')).toBeInTheDocument();
  });
});
