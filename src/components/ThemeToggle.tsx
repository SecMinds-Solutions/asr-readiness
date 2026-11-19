import { createContext, useContext, useSyncExternalStore } from 'react';
import { SecMinds } from '../design-system';
import type { ThemeController } from '../theme';

const { IconButton } = SecMinds;

/** The page's theme controller; null where none is set up, such as in most tests. */
export const ThemeContext = createContext<ThemeController | null>(null);

/**
 * Switches between light and dark mode: the moon in the light theme, the sun in the dark theme, as
 * the design system prescribes. Its accessible name says what it switches to.
 */
export function ThemeToggle() {
  const controller = useContext(ThemeContext);
  if (!controller) return null;
  return <ThemeButton controller={controller} />;
}

function ThemeButton({ controller }: { controller: ThemeController }) {
  const theme = useSyncExternalStore(controller.subscribe, controller.theme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={`Switch to ${next} mode`} onClick={() => controller.choose(next)} />
  );
}
