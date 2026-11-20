import { SecMinds } from '../design-system';
import { MINIMUM_AUDIT_PERIOD_DAYS, OBSERVATION_WINDOW_DAYS } from '../analysis/thresholds';
import { VERDICT_FILTER_PARAM, verdictSummary, type CoverageRange } from '../analysis/verdictSummary';
import type { RuleAssessment } from '../analysis/verdicts';
import { useNavigation } from '../navigation';
import { ButtonLink } from './ButtonLink';
import { devicesText } from './devicesText';

const { Card, Stat } = SecMinds;

/** The Coverage of the rules on one tile, as "n of m devices" or "n–k of m devices". */
const coverageText = ({ lowest, highest, devices }: CoverageRange) =>
  lowest === highest ? `Coverage ${devicesText(lowest, devices)}` : `Coverage ${lowest}–${devicesText(highest, devices)}`;

const rulesText = (count: number) => `${count} ASR ${count === 1 ? 'rule' : 'rules'}`;

/**
 * The Analysis at a glance: the devices that report their Rule modes, the number of ASR rules per
 * Verdict with the Coverage they speak for, each opening the Verdicts filtered to it, and the next step.
 */
export function OverviewView({ assessments, devices }: { assessments: RuleAssessment[]; devices: number }) {
  const { href } = useNavigation();
  const summary = verdictSummary(assessments);
  const verdicts = href({ site: 'app', page: 'verdicts' });
  const ready = summary
    .filter((count) => count.value === 'ready-to-block' || count.value === 'ready-with-exclusions')
    .reduce((sum, count) => sum + count.rules, 0);

  return (
    <>
      <section className="app-section" aria-labelledby="overview-verdicts">
        <h2 id="overview-verdicts" className="h3 app-section-title">
          Your ASR rules at a glance
        </h2>
        <p className="app-text">
          Each Verdict speaks only for the devices in its Coverage: the devices that report the rule in Audit mode.
        </p>
        <ul className="app-tiles">
          <li>
            <a className="app-tile" href={href({ site: 'app', page: 'rules' })}>
              <Stat value={devices} label="Devices report their Rule modes" delta="See the ASR rules" />
            </a>
          </li>
          {summary.map((count) => (
            <li key={count.value}>
              <a className="app-tile" href={`${verdicts}?${VERDICT_FILTER_PARAM}=${count.value}`}>
                <Stat
                  value={count.rules}
                  label={count.label}
                  delta={
                    count.coverage
                      ? coverageText(count.coverage)
                      : count.value === 'already-blocking' && count.rules > 0
                        ? 'Set to Block mode by Intune'
                        : 'No rules'
                  }
                />
              </a>
            </li>
          ))}
        </ul>
      </section>
      <Card title="Next step">
        {ready > 0 ? (
          <>
            <p className="app-text">
              {rulesText(ready)} {ready === 1 ? 'is' : 'are'} ready to move to Block mode. Download the Suggested policy, then
              import, assign and deploy it in Intune yourself, to a pilot group first.
            </p>
            <ButtonLink href={href({ site: 'app', page: 'policy' })}>Open the Suggested policy</ButtonLink>
          </>
        ) : (
          <>
            <p className="app-text">
              No ASR rule is ready to move to Block mode yet. A rule is ready when it has been in Audit mode for at least the
              Minimum audit period of {MINIMUM_AUDIT_PERIOD_DAYS} days, and has no Audit events in the last{' '}
              {OBSERVATION_WINDOW_DAYS} days or only Audit events that can be excluded safely. Any change to the Intune
              policies that set a rule, or to their assignments, starts its Audit period again. The Verdicts say why each rule
              is not ready yet.
            </p>
            <ButtonLink variant="secondary" href={verdicts}>
              See why in the Verdicts
            </ButtonLink>
          </>
        )}
      </Card>
    </>
  );
}
