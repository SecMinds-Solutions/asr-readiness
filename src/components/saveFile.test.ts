import { saveInBrowser } from './saveFile';

describe('saveInBrowser', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('saves a CSV file with its own media type', async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:users');
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = vi.fn();
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    saveInBrowser('users.csv', 'a,b\r\n', 'text/csv;charset=utf-8');
    expect((createObjectURL.mock.calls[0]?.[0] as Blob).type).toBe('text/csv;charset=utf-8');
    click.mockRestore();
  });

  it('saves the contents as a JSON file under its name, and frees the object URL only after the download started', async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:policy');
    const revokeObjectURL = vi.fn<(url: string) => void>();
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });
    let clicked: { href: string; download: string; attached: boolean } | undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked = { href: this.href, download: this.download, attached: document.body.contains(this) };
    });

    saveInBrowser('policy.json', '{"name":"x"}\n');

    expect(clicked).toEqual({ href: 'blob:policy', download: 'policy.json', attached: true });
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe('application/json');
    expect(await blob.text()).toBe('{"name":"x"}\n');
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:policy');
    click.mockRestore();
  });
});
