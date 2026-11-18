import { useMemo } from 'react';
import { SecMinds } from '../design-system';
import { suggestedPolicy, type SuggestedPolicy, type SuggestedRule } from '../analysis/suggestedPolicy';
import type { RuleAssessment } from '../analysis/verdicts';
import { errorMessage } from '../errorMessage';
import { devicesText } from './devicesText';
import { VerdictBadge } from './Verdicts';

const { Alert, Button, Card, EmptyState, Table } = SecMinds;

/** Saves a file in the User's browser; nothing is sent anywhere. */
export type SaveFile = (fileName: string, contents: string) => void;

export const saveInBrowser: SaveFile = (fileName, contents) => {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers read the file after click() returns; revoking at once can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

type Built = { status: 'built'; value: SuggestedPolicy } | { status: 'none' } | { status: 'failed'; message: string };

function build(assessments: RuleAssessment[]): Built {
  try {
    const value = suggestedPolicy(assessments, new Date());
    return value ? { status: 'built', value } : { status: 'none' };
  } catch (error) {
    return { status: 'failed', message: errorMessage(error) };
  }
}

function Exclusions({ rule }: { rule: SuggestedRule }) {
  if (rule.exclusions.length === 0) return <>None</>;
  return (
    <ul className="app-list app-break">
      {rule.exclusions.map((path) => (
        <li key={path}>{path}</li>
      ))}
    </ul>
  );
}

/** The rules a Suggested policy sets to Block with their Suggested exclusions, the download, and how to deploy it. */
export function SuggestedPolicyView({
  assessments,
  saveFile = saveInBrowser,
}: {
  assessments: RuleAssessment[];
  saveFile?: SaveFile;
}) {
  const built = useMemo(() => build(assessments), [assessments]);

  if (built.status === 'failed') {
    return (
      <Alert tone="danger" title="No Suggested policy">
        <p className="app-text">The Suggested policy could not be made, so none is offered. {built.message}</p>
      </Alert>
    );
  }
  if (built.status === 'none') {
    return (
      <Card title="Suggested policy">
        <EmptyState title="No Suggested policy yet">
          No ASR rule is Ready to block or Ready with exclusions, so there is nothing to set to Block.
        </EmptyState>
      </Card>
    );
  }

  const { rules, policy, fileName } = built.value;
  return (
    <Card title="Suggested policy">
      <p className="app-text">
        The Suggested policy sets the ASR rules below to Block mode, with their Suggested exclusions. Rules that are not ready
        are not in it, so it leaves them as your own policies set them. Each Verdict speaks only for the devices in its
        Coverage, so check devices outside it in the pilot. ASR Readiness never changes anything in your Tenant:
        you import, assign and deploy the policy yourself.
      </p>
      <Table
        caption="ASR rules the Suggested policy sets to Block mode, with their Coverage and Suggested exclusions"
        columns={[
          { key: 'name', label: 'ASR rule', render: (row: SuggestedRule) => row.rule.name },
          {
            key: 'verdict',
            label: 'Verdict',
            render: (row: SuggestedRule) => <VerdictBadge verdict={row.verdict} />,
          },
          {
            key: 'coverage',
            label: 'Coverage',
            align: 'right',
            render: (row: SuggestedRule) =>
              row.coverage ? devicesText(row.coverage.auditDevices, row.coverage.devices) : 'Not available',
          },
          { key: 'exclusions', label: 'Suggested exclusions', render: (row: SuggestedRule) => <Exclusions rule={row} /> },
        ]}
        rows={rules}
      />
      <div className="app-row">
        <Button icon="download" onClick={() => saveFile(fileName, `${JSON.stringify(policy, null, 2)}\n`)}>
          Download Suggested policy
        </Button>
      </div>
      <h4 className="h4">How to deploy it</h4>
      <ol className="app-list">
        <li>
          In the Microsoft Intune admin center, go to Devices, then Configuration, and choose Create, then Import policy. Select
          the downloaded file and give the policy a name.
        </li>
        <li>Open the imported policy and check its rules and exclusions before you assign it.</li>
        <li>
          Assign it to a pilot group of devices first. Watch what the rules block on those devices in Microsoft Defender for a
          while, then widen the assignment step by step.
        </li>
      </ol>
      <Alert tone="warning" title="Avoid a Conflict with your current policies">
        <p className="app-text">
          Your current Intune policies set these rules to Audit mode. On a device that gets both those policies and the Suggested
          policy, Intune sees a Conflict and applies neither Rule mode, so the rule stops auditing as well. Remove these rules
          from the policies that set them to Audit mode, or exclude the pilot group from those policies. Excluding the group also
          removes the other rules in those policies from the pilot devices.
        </p>
      </Alert>
    </Card>
  );
}
