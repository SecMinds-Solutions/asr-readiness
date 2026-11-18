import { createContext, useContext, useSyncExternalStore } from 'react';
import { SecMinds } from '../design-system';
import type { ThemeController } from '../theme';

const { Button } = SecMinds;

/** The app's theme controller; null where none is set up, such as in most tests. */
export const ThemeContext = createContext<ThemeController | null>(null);

/** Switches between light and dark mode. The design system has no sun or moon icon, so the button says it in words. */
export function ThemeToggle() {
  const controller = useContext(ThemeContext);
  if (!controller) return null;
  return <ThemeButton controller={controller} />;
}

function ThemeButton({ controller }: { controller: ThemeController }) {
  const theme = useSyncExternalStore(controller.subscribe, controller.theme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <Button variant="ghost" size="sm" aria-label={`Switch to ${next} mode`} onClick={() => controller.choose(next)}>
      {next === 'dark' ? 'Dark mode' : 'Light mode'}
    </Button>
  );
}
