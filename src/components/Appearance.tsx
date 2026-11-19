import { useContext, useSyncExternalStore } from 'react';
import { SecMinds } from '../design-system';
import type { ThemeController, ThemePreference } from '../theme';
import { ThemeContext } from './ThemeToggle';

const { Radio } = SecMinds;

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System: follow your device' },
];

/** Light, Dark or System. The header's theme button and this choice stay in step through the controller. */
export function AppearanceChoice() {
  const controller = useContext(ThemeContext);
  if (!controller) return <p className="app-text">The theme follows your device.</p>;
  return <AppearanceRadios controller={controller} />;
}

function AppearanceRadios({ controller }: { controller: ThemeController }) {
  const preference = useSyncExternalStore(controller.subscribe, controller.preference);
  return (
    <fieldset className="app-fieldset">
      <legend className="app-visually-hidden">Theme</legend>
      {OPTIONS.map((option) => (
        <Radio
          key={option.value}
          name="theme"
          value={option.value}
          label={option.label}
          checked={preference === option.value}
          onChange={() => (option.value === 'system' ? controller.followSystem() : controller.choose(option.value))}
        />
      ))}
    </fieldset>
  );
}
