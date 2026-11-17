// Reading the rows of an advanced hunting answer. Microsoft's examples differ in the casing of
// column names, so columns are matched case-insensitively.

export const unexpectedAnswer = () => new Error('Advanced hunting sent an unexpected answer.');

/** The `results` rows of a runHuntingQuery answer. */
export function huntingRows(result: unknown): unknown[] {
  if (typeof result !== 'object' || result === null) throw unexpectedAnswer();
  const rows: unknown = (result as { results?: unknown }).results;
  if (!Array.isArray(rows)) throw unexpectedAnswer();
  return rows;
}

function column(row: unknown, name: string): unknown {
  if (typeof row !== 'object' || row === null) throw unexpectedAnswer();
  const key = name.toLowerCase();
  return Object.entries(row).find(([column]) => column.toLowerCase() === key)?.[1];
}

export function numberColumn(row: unknown, name: string): number {
  const value = column(row, name);
  if (typeof value !== 'number' || !Number.isFinite(value)) throw unexpectedAnswer();
  return value;
}

export function textColumn(row: unknown, name: string): string {
  const value = column(row, name);
  if (typeof value !== 'string') throw unexpectedAnswer();
  return value;
}
