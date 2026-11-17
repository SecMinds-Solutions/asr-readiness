/** The message to show for an error, also when something other than an Error was thrown. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error.';
}
