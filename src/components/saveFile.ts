/** Saves a file in the User's browser; nothing is sent anywhere. The media type defaults to JSON. */
export type SaveFile = (fileName: string, contents: string, mediaType?: string) => void;

export const saveInBrowser: SaveFile = (fileName, contents, mediaType = 'application/json') => {
  const url = URL.createObjectURL(new Blob([contents], { type: mediaType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers read the file after click() returns; revoking at once can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
