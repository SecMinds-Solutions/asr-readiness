import { act, fireEvent, render, screen } from '@testing-library/react';
import { createThemeController, THEME_STORAGE_KEY, type ThemeStorage } from '../theme';
import { ThemeContext, ThemeToggle } from './ThemeToggle';

function setup(prefersDark = false) {
  const listeners: Array<(e: { matches: boolean }) => void> = [];
  const query = {
    matches: prefersDark,
    addEventListener: (_: 'change', l: (e: { matches: boolean }) => void) => listeners.push(l),
    removeEventListener: () => {},
  };
  const values: Record<string, string> = {};
  const storage: ThemeStorage = {
    getItem: (k) => values[k] ?? null,
    setItem: (k, v) => void (values[k] = v),
    removeItem: (k) => void Reflect.deleteProperty(values, k),
  };
  const root = document.createElement('html');
  const controller = createThemeController(root, query, () => storage);
  render(
    <ThemeContext.Provider value={controller}>
      <ThemeToggle />
    </ThemeContext.Provider>,
  );
  return { root, storage, fireSystem: (matches: boolean) => act(() => listeners.forEach((l) => l({ matches }))) };
}

describe('ThemeToggle', () => {
  it('offers dark mode in light mode, and switches', () => {
    const { root } = setup(false);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(root.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('shows the moon in light mode and the sun in dark mode, and keeps the choice', () => {
    const { root, storage } = setup(false);
    const moon = screen.getByRole('button', { name: 'Switch to dark mode' });
    expect(moon.querySelector('svg')?.innerHTML).toContain('M12 3a6 6 0 0 0 9 9');
    fireEvent.click(moon);
    const sun = screen.getByRole('button', { name: 'Switch to light mode' });
    expect(sun.querySelector('svg circle')).not.toBeNull();
    expect(root.dataset.theme).toBe('dark');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('follows a change of the system setting before the User chooses', () => {
    const { fireSystem } = setup(false);
    fireSystem(true);
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('renders nothing without a theme controller', () => {
    const { container } = render(<ThemeToggle />);
    expect(container).toBeEmptyDOMElement();
  });
});
