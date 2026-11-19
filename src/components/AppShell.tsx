import type { ReactNode } from 'react';
import { SecMinds } from '../design-system';
import { useNavigation } from '../navigation';
import { MAIN_ID, type AppPage } from '../places';
import { AppHeader } from './AppHeader';
import { Footer } from './Footer';

const { AppLayout, SideNav } = SecMinds;

/** The pages of an Analysis: they share one Analysis and show the Tenant status bar. */
export const ANALYSIS_PAGES: readonly AppPage[] = ['home', 'verdicts', 'policy', 'rules', 'events'];

export const isAnalysisPage = (page: AppPage) => ANALYSIS_PAGES.includes(page);

/** Each page's heading and the one sentence under it. */
export const PAGE_HEADINGS: Record<AppPage, { title: string; description: string }> = {
  home: { title: 'Overview', description: 'Where your Tenant stands on moving ASR rules from Audit mode to Block mode.' },
  verdicts: { title: 'Verdicts', description: 'A Verdict for each ASR rule, from its Rule mode, Audit period and Audit events.' },
  policy: {
    title: 'Suggested policy',
    description: 'An Intune ASR policy that sets the rules that are ready to Block, for you to import, assign and deploy.',
  },
  rules: { title: 'ASR rules', description: 'Every ASR rule with its Rule mode in Intune and its Coverage on your devices.' },
  events: { title: 'Audit events', description: 'The Audit events of the Observation window, per ASR rule, application and path.' },
  settings: { title: 'Settings', description: 'What ASR Compass stores about you, and how to change or delete it.' },
  admin: { title: 'Admin overview', description: 'How many Users there are, how many gave Contact consent, and from which Home tenants.' },
  'admin-users': { title: 'User records', description: 'Every User record, to read and export. Only SecMinds admins can see them.' },
};

/** The sidebar: the Analysis, the SecMinds admin pages for admins only, and Settings. */
function AppNav({ page, admin }: { page: AppPage; admin: boolean }) {
  const { href } = useNavigation();
  const item = (target: AppPage, label: string, icon: string) => ({
    label,
    icon,
    href: href({ site: 'app', page: target }),
    active: page === target,
  });
  return (
    <SideNav
      label="Main"
      groups={[
        {
          label: 'Analysis',
          items: [
            item('home', 'Overview', 'activity'),
            item('verdicts', 'Verdicts', 'circle-check'),
            item('policy', 'Suggested policy', 'file-text'),
            item('rules', 'ASR rules', 'shield-check'),
            item('events', 'Audit events', 'eye'),
          ],
        },
        // The API decides who may see the User records; the admin claim only decides what is shown.
        ...(admin
          ? [
              {
                label: 'SecMinds admin',
                items: [item('admin', 'Admin overview', 'bar-chart-3'), item('admin-users', 'User records', 'users')],
              },
            ]
          : []),
        { items: [item('settings', 'Settings', 'settings')] },
      ]}
    />
  );
}

/** A page's one heading and the sentence under it. */
function PageHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="app-heading">
      <h1 className="h1 app-title">{title}</h1>
      {description && <p className="body app-lead">{description}</p>}
    </div>
  );
}

/** A page without the sidebar: signed out, the Contact consent choice, and the states before it. */
export function Page({ account, title, children }: { account?: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="sm-root app">
      <AppHeader account={account} />
      <main className="app-main" id={MAIN_ID} tabIndex={-1}>
        <PageHeading title={title} />
        {children}
      </main>
      <Footer />
    </div>
  );
}

/** A page of the signed-in app: header, the sidebar beside the page's heading and content, and the footer. */
export function ShellPage({
  account,
  page,
  admin,
  children,
}: {
  account: ReactNode;
  page: AppPage;
  admin: boolean;
  children: ReactNode;
}) {
  return (
    <div className="sm-root app">
      <AppHeader account={account} />
      <AppLayout className="app-layout" sidebar={<AppNav page={page} admin={admin} />}>
        <main className="app-page" id={MAIN_ID} tabIndex={-1}>
          <PageHeading {...PAGE_HEADINGS[page]} />
          {children}
        </main>
      </AppLayout>
      <Footer />
    </div>
  );
}
