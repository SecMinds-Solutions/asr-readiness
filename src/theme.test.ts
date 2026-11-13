import { applyTheme, themeFor } from './theme';

describe('themeFor', () => {
  it('is dark when the system prefers dark', () => {
    expect(themeFor(true)).toBe('dark');
  });

  it('is light otherwise', () => {
    expect(themeFor(false)).toBe('light');
  });
});

describe('applyTheme', () => {
  function fakeQuery(matches: boolean) {
    const listeners: Array<(e: { matches: boolean }) => void> = [];
    return {
      matches,
      addEventListener: (_: 'change', l: (e: { matches: boolean }) => void) => listeners.push(l),
      removeEventListener: (_: 'change', l: (e: { matches: boolean }) => void) => {
        listeners.splice(listeners.indexOf(l), 1);
      },
      fire: (m: boolean) => listeners.forEach((l) => l({ matches: m })),
      listeners,
    };
  }

  it('sets data-theme from the system preference and follows changes', () => {
    const root = document.createElement('html');
    const query = fakeQuery(true);

    const stop = applyTheme(root, query);
    expect(root.dataset.theme).toBe('dark');

    query.fire(false);
    expect(root.dataset.theme).toBe('light');

    stop();
    expect(query.listeners).toHaveLength(0);
  });
});
