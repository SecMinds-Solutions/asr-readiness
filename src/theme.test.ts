import { createThemeController, THEME_STORAGE_KEY, themeFor, type ThemeStorage } from './theme';

describe('themeFor', () => {
  it('is dark when the system prefers dark', () => {
    expect(themeFor(true)).toBe('dark');
  });

  it('is light otherwise', () => {
    expect(themeFor(false)).toBe('light');
  });
});

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

function memoryStorage(initial: Record<string, string> = {}): ThemeStorage & { values: Record<string, string> } {
  const values = { ...initial };
  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value;
    },
  };
}

const failingStorage: ThemeStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('createThemeController', () => {
  it('follows the system setting while the User has not chosen, and stops following on stop', () => {
    const root = document.createElement('html');
    const query = fakeQuery(true);
    const controller = createThemeController(root, query, () => memoryStorage());
    expect(root.dataset.theme).toBe('dark');
    expect(controller.theme()).toBe('dark');

    query.fire(false);
    expect(root.dataset.theme).toBe('light');

    controller.stop();
    expect(query.listeners).toHaveLength(0);
  });

  it('switches the theme, remembers the choice and no longer follows the system', () => {
    const root = document.createElement('html');
    const query = fakeQuery(false);
    const storage = memoryStorage();
    const controller = createThemeController(root, query, () => storage);
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.choose('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(storage.values[THEME_STORAGE_KEY]).toBe('dark');
    expect(listener).toHaveBeenCalled();

    query.fire(false);
    expect(root.dataset.theme).toBe('dark');
  });

  it('uses a remembered choice on a later visit, over the system setting', () => {
    const root = document.createElement('html');
    createThemeController(root, fakeQuery(true), () => memoryStorage({ [THEME_STORAGE_KEY]: 'light' }));
    expect(root.dataset.theme).toBe('light');
  });

  it('keeps the storage key asr-readiness-theme, so a choice from before the rename to ASR Compas still applies', () => {
    const root = document.createElement('html');
    createThemeController(root, fakeQuery(true), () => memoryStorage({ 'asr-readiness-theme': 'light' }));
    expect(root.dataset.theme).toBe('light');
  });

  it('ignores a stored value that is not a theme', () => {
    const root = document.createElement('html');
    createThemeController(root, fakeQuery(true), () => memoryStorage({ [THEME_STORAGE_KEY]: 'purple' }));
    expect(root.dataset.theme).toBe('dark');
  });

  it.each([
    ['storage that throws', () => failingStorage],
    ['no storage at all', () => {
      throw new Error('localStorage is not available');
    }],
  ])('still switches for the visit with %s', (_, storage: () => ThemeStorage) => {
    const root = document.createElement('html');
    const query = fakeQuery(false);
    const controller = createThemeController(root, query, storage);
    expect(root.dataset.theme).toBe('light');

    controller.choose('dark');
    expect(root.dataset.theme).toBe('dark');
    query.fire(false);
    expect(root.dataset.theme).toBe('dark');
  });

  it('tells subscribers when the system setting changes the theme, until they unsubscribe', () => {
    const query = fakeQuery(false);
    const controller = createThemeController(document.createElement('html'), query, () => memoryStorage());
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    query.fire(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    query.fire(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
