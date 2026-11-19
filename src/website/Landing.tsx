import type { ReactNode } from 'react';
import { SecMinds } from '../design-system';
import { ASR_RULES } from '../analysis/asrRules';
import { MAX_SUGGESTED_EXCLUSIONS, MINIMUM_AUDIT_PERIOD_DAYS, OBSERVATION_WINDOW_DAYS } from '../analysis/thresholds';
import type { Verdict } from '../analysis/verdicts';
import { ButtonLink } from '../components/ButtonLink';
import { SOURCE_CODE_URL } from '../components/Footer';
import { devicesText } from '../components/devicesText';
import { VerdictBadge } from '../components/Verdicts';
import { useNavigation } from '../navigation';

const { Accordion, Badge, Card, Icon, NumberBadge, Table, TextLink } = SecMinds;

/** The section ids the website header links to. */
export const HOW_IT_WORKS_ID = 'how-it-works';
export const FAQ_ID = 'faq';

export const GET_STARTED_LABEL = 'Get started – sign in with Microsoft';

const ruleName = (guid: string) => ASR_RULES.find((asrRule) => asrRule.guid === guid)?.name ?? guid;

interface ExampleRow {
  rule: string;
  verdict: Verdict;
  coverage: string;
  reason: string;
}

/** Fictitious Verdicts for the hero: real ASR rule names, made-up counts, never data from a tenant. */
const EXAMPLE_ROWS: ExampleRow[] = [
  {
    rule: ruleName('7674ba52-37eb-4a4f-a9a1-f0f9a1619a2c'),
    verdict: 'Ready to block',
    coverage: devicesText(48, 50),
    reason: 'No Audit events in 30 days.',
  },
  {
    rule: ruleName('d4f940ab-401b-4efc-aadc-ad5f3c50688a'),
    verdict: 'Ready with exclusions',
    coverage: devicesText(48, 50),
    reason: '2 paths in Program Files.',
  },
  {
    rule: ruleName('5beb7efe-fd9a-4556-801d-275e5ffc04cc'),
    verdict: 'Not ready',
    coverage: devicesText(47, 50),
    reason: 'Audit events from Downloads.',
  },
  {
    rule: ruleName('d1e49aac-8f56-4280-b9ba-993a6d77406c'),
    verdict: 'No evidence',
    coverage: devicesText(0, 50),
    reason: 'Not in Audit mode.',
  },
];

function Section({ id, title, tone, children }: { id?: string; title: string; tone?: 'sunken'; children: ReactNode }) {
  const headingId = `${id ?? title.toLowerCase().replace(/[^a-z]+/g, '-')}-heading`;
  return (
    <section id={id} className={`site-section${tone ? ` site-section-${tone}` : ''}`} aria-labelledby={headingId}>
      <div className="site-inner">
        <h2 className="h2 site-heading" id={headingId}>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function Feature({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <Card
      title={
        <span className="site-feature-title">
          <Icon name={icon} size={24} />
          {title}
        </span>
      }
    >
      {children}
    </Card>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="site-step">
      <NumberBadge size={40}>{number}</NumberBadge>
      <div>
        <h3 className="h4 site-step-title">{title}</h3>
        <div className="body site-step-body">{children}</div>
      </div>
    </li>
  );
}

/**
 * The website's home page: what ASR Compass is, why it exists, who it is for and how to start. It
 * loads no sign-in code; the calls to action are links to the app, which signs the visitor in.
 */
export function Landing({ adminConsentUrl }: { adminConsentUrl: string | null }) {
  const { href } = useNavigation();
  const app = href({ site: 'app', page: 'home' });
  const privacy = href({ site: 'website', page: 'privacy' });

  return (
    <>
      <section className="site-section site-hero" aria-labelledby="hero-heading">
        <div className="site-inner site-hero-grid">
          <div className="site-hero-text">
            <div className="app-row">
              <h1 className="h1 site-title" id="hero-heading">
                ASR Compass
              </h1>
              <Badge tone="info">Preview</Badge>
            </div>
            <p className="body-lg site-lead">
              ASR Compass gives every Microsoft Defender Attack Surface Reduction rule a Verdict from its audit events, so you
              know which rules you can move from Audit mode to Block mode safely.
            </p>
            <div className="site-actions">
              <ButtonLink size="lg" href={app}>
                {GET_STARTED_LABEL}
              </ButtonLink>
              <ButtonLink size="lg" variant="secondary" href={`#${HOW_IT_WORKS_ID}`}>
                How it works
              </ButtonLink>
            </div>
            <p className="body-sm site-note">Free and open source. Your security data never leaves your browser.</p>
          </div>
          <figure className="site-example">
            <Table
              caption="Example Verdicts (fictitious data)"
              columns={[
                { key: 'rule', label: 'ASR rule' },
                { key: 'verdict', label: 'Verdict', render: (row: ExampleRow) => <VerdictBadge verdict={row.verdict} /> },
                { key: 'coverage', label: 'Coverage', align: 'right' },
                { key: 'reason', label: 'Reason' },
              ]}
              rows={EXAMPLE_ROWS}
            />
            <figcaption className="caption site-note">
              An example with made-up numbers, not data from a real tenant.
            </figcaption>
          </figure>
        </div>
      </section>

      <Section title="Why ASR rules stay in Audit mode" tone="sunken">
        <p className="body-lg site-text">
          Attack Surface Reduction rules block the behaviour attackers rely on, such as Office macros starting processes or
          scripts launching downloads. Most admins turn them on in Audit mode and leave them there, because moving to
          Block mode feels risky: nobody can tell which line-of-business application will break. ASR Compass reads the audit
          events your devices already collect and tells you, per rule, whether it is safe to block.
        </p>
      </Section>

      <Section id={HOW_IT_WORKS_ID} title="How it works">
        <div className="site-grid">
          <Feature icon="check" title="A Verdict per ASR rule">
            Ready to block, Ready with exclusions, Not ready or No evidence, based on the last {OBSERVATION_WINDOW_DAYS} days of
            audit events and a rule that has been in Audit mode for at least {MINIMUM_AUDIT_PERIOD_DAYS} days. Every Verdict
            shows the share of devices it speaks for.
          </Feature>
          <Feature icon="folder" title="Suggested exclusions">
            When a rule&apos;s audit events come from at most {MAX_SUGGESTED_EXCLUSIONS} paths, ASR Compass suggests them as
            exclusions, but never in a location where ordinary users can write files.
          </Feature>
          <Feature icon="download" title="A Suggested policy to download">
            An Intune settings catalog policy that sets only the ready rules to Block, with their Suggested exclusions. You
            import, assign and deploy it yourself; ASR Compass changes nothing in your tenant.
          </Feature>
        </div>
      </Section>

      <Section title="Who it's for" tone="sunken">
        <p className="body-lg site-text">
          Defender and Intune administrators of tenants with Microsoft Defender for Endpoint Plan 2, and the MSPs who manage
          those tenants through GDAP.
        </p>
      </Section>

      <Section title="Benefits">
        <div className="site-grid">
          <Feature icon="shield" title="Move to Block mode safely">
            Block only the rules your own audit events show are ready, and keep the rest in Audit mode until they are.
          </Feature>
          <Feature icon="lock" title="A smaller attack surface">
            Every rule in Block mode stops a technique attackers use, instead of only logging it.
          </Feature>
          <Feature icon="activity" title="No guesswork">
            Decisions come from what happened on your devices, with the reason for every Verdict.
          </Feature>
        </div>
      </Section>

      <Section id="get-started" title="Get started in 5 steps" tone="sunken">
        <ol className="site-steps">
          <Step number={1} title="Check the requirements">
            Microsoft Defender for Endpoint Plan 2 (also in Microsoft 365 E5) and Intune. You need a Defender XDR role with
            Security data basics (read), or the Entra role Security Reader, and an Intune role with Device configurations: Read,
            such as Read Only Operator.
          </Step>
          <Step number={2} title="Ask an admin to grant admin consent">
            Once per tenant, an admin who can grant tenant-wide consent approves ASR Compass&apos;s read-only permissions.{' '}
            {adminConsentUrl ? (
              <TextLink href={adminConsentUrl}>Open the admin consent page</TextLink>
            ) : (
              'The app shows the admin consent link to send them.'
            )}
          </Step>
          <Step number={3} title="Sign in with Microsoft">
            Sign in to the app with your work account, on Microsoft&apos;s own sign-in page.{' '}
            <TextLink href={app}>Open the app</TextLink>
          </Step>
          <Step number={4} title="Review the Verdicts per ASR rule">
            See which rules are ready to block, which need exclusions and why the others are not ready yet.
          </Step>
          <Step number={5} title="Download the Suggested policy">
            Import it in Intune, assign it to a pilot group first and deploy it yourself.
          </Step>
        </ol>
      </Section>

      <Section title="Built to be trusted">
        <ul className="site-trust">
          <li>
            <Icon name="monitor" size={24} />
            <span>
              <strong>Your data stays in your browser.</strong> The Analysis runs in your browser with your own token; your
              audit events, paths, device names and policies are never sent to or stored by SecMinds.
            </span>
          </li>
          <li>
            <Icon name="key" size={24} />
            <span>
              <strong>Delegated, read-only permissions.</strong> ASR Compass reads advanced hunting and Intune configuration with
              your own roles, only while you are signed in, and has no client secret.
            </span>
          </li>
          <li>
            <Icon name="eye" size={24} />
            <span>
              <strong>Open source.</strong> Read every line on <TextLink href={SOURCE_CODE_URL}>GitHub</TextLink>, under the MIT
              licence.
            </span>
          </li>
          <li>
            <Icon name="check" size={24} />
            <span>
              <strong>Free.</strong> A community tool by SecMinds Solutions. It stores only a small User record about you; see
              the <TextLink href={privacy}>privacy notice</TextLink>.
            </span>
          </li>
        </ul>
      </Section>

      <Section id={FAQ_ID} title="Frequently asked questions" tone="sunken">
        <Accordion
          items={[
            {
              title: 'Does my security data leave my browser?',
              content: (
                <p className="app-text">
                  No. The Analysis runs in your browser. Audit events, paths, device names, policies and Verdicts are never sent
                  to SecMinds and never stored.
                </p>
              ),
            },
            {
              title: 'Which permissions does ASR Compass need?',
              content: (
                <p className="app-text">
                  Delegated, read-only Microsoft Graph permissions: ThreatHunting.Read.All for advanced hunting and
                  DeviceManagementConfiguration.Read.All for Intune policies, plus the basic sign-in permissions and one scope
                  of its own to store your User record.
                </p>
              ),
            },
            {
              title: 'Does ASR Compass change anything in my tenant?',
              content: (
                <p className="app-text">
                  No. It only reads. The Suggested policy is a file you download, review, import and deploy yourself.
                </p>
              ),
            },
            {
              title: 'Which licence does my tenant need?',
              content: (
                <p className="app-text">
                  Microsoft Defender for Endpoint Plan 2, also included in Microsoft 365 E5 and the Defender Suite add-on for
                  Business Premium. Defender for Business is not supported, because it has no advanced hunting.
                </p>
              ),
            },
            {
              title: 'How is a Verdict decided?',
              content: (
                <p className="app-text">
                  From the last {OBSERVATION_WINDOW_DAYS} days of audit events of rules that Intune sets to Audit mode and that
                  have been in Audit mode for at least {MINIMUM_AUDIT_PERIOD_DAYS} days. A rule without audit events is Ready to
                  block; a rule whose audit events come from at most {MAX_SUGGESTED_EXCLUSIONS} paths, none in a User-writable
                  location and none from an application that runs from one, is Ready with exclusions.
                </p>
              ),
            },
            {
              title: 'What is stored about me?',
              content: (
                <p className="app-text">
                  Your Home tenant ID, username, first name, last name, email address and your Contact consent with its date.
                  You can see, change and delete it under Settings in the app. See the{' '}
                  <TextLink href={privacy}>privacy notice</TextLink>.
                </p>
              ),
            },
            {
              title: 'Can an MSP analyse the Tenants it manages?',
              content: <p className="app-text">Yes, through GDAP, with the roles above in each Tenant.</p>,
            },
            {
              title: 'What does it cost?',
              content: (
                <p className="app-text">
                  Nothing. ASR Compass is free and open source under the MIT licence.
                </p>
              ),
            },
          ]}
        />
      </Section>

      <section className="site-section site-closing" aria-labelledby="closing-heading">
        <div className="site-inner site-closing-inner">
          <h2 className="h2 site-heading" id="closing-heading">
            Ready to move your ASR rules to Block mode?
          </h2>
          <p className="body-lg site-text">Sign in, review the Verdicts, and download your Suggested policy.</p>
          <ButtonLink size="lg" href={app}>
            {GET_STARTED_LABEL}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
