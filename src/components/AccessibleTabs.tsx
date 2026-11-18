import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { SecMinds } from '../design-system';

const { Tabs } = SecMinds;

export interface AccessibleTab {
  value: string;
  label: string;
  content: ReactNode;
}

/**
 * The design system's Tabs with the rest of the WAI-ARIA tabs pattern, which the vendored component
 * lacks: a labelled tablist, arrow keys, Home and End to move between tabs, one tab in the Tab
 * order at a time, and each tab tied to its panel (aria-controls, aria-labelledby).
 */
export function AccessibleTabs({ id, label, tabs }: { id: string; label: string; tabs: AccessibleTab[] }) {
  const [selected, setSelected] = useState(tabs[0]?.value ?? '');
  const container = useRef<HTMLDivElement>(null);
  const focusSelected = useRef(false);

  // Adds what the vendored component does not render, after every render it makes.
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const panelId = `${id}-panel`;
    root.querySelector('[role="tablist"]')?.setAttribute('aria-label', label);
    root.querySelectorAll<HTMLElement>('[role="tab"]').forEach((tab, index) => {
      const value = tabs[index]?.value ?? '';
      const isSelected = value === selected;
      tab.id = `${id}-tab-${value}`;
      tab.setAttribute('aria-controls', panelId);
      tab.tabIndex = isSelected ? 0 : -1;
      if (isSelected && focusSelected.current) {
        tab.focus();
        focusSelected.current = false;
      }
    });
    const panel = root.querySelector<HTMLElement>('[role="tabpanel"]');
    if (panel) {
      panel.id = panelId;
      panel.setAttribute('aria-labelledby', `${id}-tab-${selected}`);
      panel.tabIndex = 0;
    }
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).getAttribute('role') !== 'tab') return;
    const index = tabs.findIndex((tab) => tab.value === selected);
    const last = tabs.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[
      event.key
    ];
    const target = next === undefined ? undefined : tabs[next];
    if (!target) return;
    event.preventDefault();
    focusSelected.current = true;
    setSelected(target.value);
  };

  return (
    <div ref={container} className="app-tabs" onKeyDown={onKeyDown}>
      <Tabs tabs={tabs} value={selected} onChange={setSelected} />
    </div>
  );
}
