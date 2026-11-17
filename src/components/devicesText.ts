/** Coverage and device counts as the UI shows them: "n of m devices". */
export const devicesText = (count: number, total: number) => `${count} of ${total} ${total === 1 ? 'device' : 'devices'}`;
