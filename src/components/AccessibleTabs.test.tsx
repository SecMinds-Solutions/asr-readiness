import { fireEvent, render, screen } from '@testing-library/react';
import { AccessibleTabs } from './AccessibleTabs';

const tabs = [
  { value: 'a', label: 'First', content: <p>First panel</p> },
  { value: 'b', label: 'Second', content: <p>Second panel</p> },
  { value: 'c', label: 'Third', content: <p>Third panel</p> },
];

const renderTabs = () => render(<AccessibleTabs id="t" label="Analysis" tabs={tabs} />);

describe('AccessibleTabs', () => {
  it('labels the tablist and ties the selected tab to a named panel', () => {
    renderTabs();
    expect(screen.getByRole('tablist', { name: 'Analysis' })).toBeInTheDocument();
    const first = screen.getByRole('tab', { name: 'First' });
    const panel = screen.getByRole('tabpanel', { name: 'First' });
    expect(first).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveTextContent('First panel');
  });

  it('keeps only the selected tab in the Tab order', () => {
    renderTabs();
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute('tabindex', '-1');
  });

  it('moves with the arrow keys, wrapping around, and focuses the new tab', () => {
    renderTabs();
    const first = screen.getByRole('tab', { name: 'First' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    const second = screen.getByRole('tab', { name: 'Second' });
    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(second).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Second' })).toHaveTextContent('Second panel');

    fireEvent.keyDown(second, { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByRole('tab', { name: 'First' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Third' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Third' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'First' })).toHaveFocus();
  });

  it('goes to the first and last tab with Home and End', () => {
    renderTabs();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'First' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Third' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Third' }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute('aria-selected', 'true');
  });

  it('still selects a tab by click, and ignores other keys', () => {
    renderTabs();
    fireEvent.click(screen.getByRole('tab', { name: 'Third' }));
    expect(screen.getByRole('tabpanel', { name: 'Third' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Third' }), { key: 'a' });
    expect(screen.getByRole('tab', { name: 'Third' })).toHaveAttribute('aria-selected', 'true');
  });
});
