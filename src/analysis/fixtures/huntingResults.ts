// Advanced hunting answers shaped like Graph's runHuntingQuery response: a schema and result rows
// with the column names the queries in queries.ts give.

export const totalsResult = (...rows: { ActionType: string; Events: number; Groups: number }[]) => ({
  schema: [
    { Name: 'ActionType', Type: 'String' },
    { Name: 'Events', Type: 'Int64' },
    { Name: 'Groups', Type: 'Int64' },
  ],
  results: rows,
});

/** A row without ApplicationFolder gets FOLDER, so tests only spell out the folder where it matters. */
export const FOLDER = 'C:\\Program Files\\Contoso';

export const groupsResult = (
  ...rows: { ActionType: string; Application: string; ApplicationFolder?: string; Path: string; Events: number; Devices: number }[]
) => ({
  schema: [
    { Name: 'ActionType', Type: 'String' },
    { Name: 'Application', Type: 'String' },
    { Name: 'ApplicationFolder', Type: 'String' },
    { Name: 'Path', Type: 'String' },
    { Name: 'Events', Type: 'Int64' },
    { Name: 'Devices', Type: 'Int64' },
  ],
  results: rows.map((row) => ({ ApplicationFolder: FOLDER, ...row })),
});

/** The answer of ASR_RULE_MODES_QUERY: devices per AsrConfigurationStates key and value ("" for null). */
export const ruleModesResult = (...rows: { Rule: string; Mode: string; Devices: number }[]) => ({
  schema: [
    { Name: 'Rule', Type: 'String' },
    { Name: 'Mode', Type: 'String' },
    { Name: 'Devices', Type: 'Int64' },
  ],
  results: rows,
});

export const auditPeriodsResult = (...rows: { Rule: string; Devices: number; ShortestDays: number }[]) => ({
  schema: [
    { Name: 'Rule', Type: 'String' },
    { Name: 'Devices', Type: 'Int64' },
    { Name: 'ShortestDays', Type: 'Int32' },
  ],
  results: rows,
});
