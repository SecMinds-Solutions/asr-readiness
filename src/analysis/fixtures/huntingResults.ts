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
