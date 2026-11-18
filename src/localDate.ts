const pad = (value: number) => String(value).padStart(2, '0');

/** The User's local date as yyyy-mm-dd: the day they see on their own clock. Pure. */
export const localDate = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
