import { act, fireEvent, render, screen } from '@testing-library/react';
import { NavigationProvider, useNavigation } from './navigation';
import { DEFAULT_ORIGINS, MAIN_ID, type Place } from './places';

function Page() {
  const { place, href } = useNavigation();
  return (
    <>
      <main id={MAIN_ID} tabIndex={-1}>
        <h1>{place.page}</h1>
      </main>
      <a href={href({ site: 'app', page: 'settings' })}>Settings</a>
      <a href={href({ site: 'website', page: 'privacy' })}>Privacy</a>
      <a href={`${href({ site: 'app', page: 'home' })}#analysis`}>Section</a>
      <a href="https://github.com/">Elsewhere</a>
    </>
  );
}

function renderAt(path: string, initial: Place) {
  window.history.replaceState(null, '', path);
  render(
    <NavigationProvider origins={DEFAULT_ORIGINS} initial={initial}>
      <Page />
    </NavigationProvider>,
  );
}

/** Clicks a link as the browser would: the click is cancelled when the page handles it itself. */
const click = (name: string) => fireEvent.click(screen.getByRole('link', { name }));

describe('NavigationProvider', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('links to pages of both halves from where the page is', () => {
    renderAt('/app/', { site: 'app', page: 'home' });
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', 'http://localhost:3000/app/settings');
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', 'http://localhost:3000/privacy');
  });

  it('changes the page of the same half without loading it, and moves focus to the main content', () => {
    renderAt('/app/', { site: 'app', page: 'home' });
    expect(screen.getByRole('main')).not.toHaveFocus();
    const followed = click('Settings');
    expect(followed).toBe(false);
    expect(window.location.pathname).toBe('/app/settings');
    expect(screen.getByRole('heading', { name: 'settings' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('leaves links to the other half, to sections and to other sites to the browser', () => {
    renderAt('/app/', { site: 'app', page: 'home' });
    expect(click('Privacy')).toBe(true);
    expect(click('Section')).toBe(true);
    expect(click('Elsewhere')).toBe(true);
    expect(screen.getByRole('heading', { name: 'home' })).toBeInTheDocument();
  });

  it('leaves a click with a modifier key to the browser, to open a new tab', () => {
    renderAt('/app/', { site: 'app', page: 'home' });
    expect(fireEvent.click(screen.getByRole('link', { name: 'Settings' }), { ctrlKey: true })).toBe(true);
    expect(window.location.pathname).toBe('/app/');
  });

  it('follows Back and Forward', () => {
    renderAt('/app/', { site: 'app', page: 'home' });
    click('Settings');
    act(() => {
      window.history.replaceState(null, '', '/app/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByRole('heading', { name: 'home' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('does not move focus on the first page', () => {
    renderAt('/app/settings', { site: 'app', page: 'settings' });
    expect(screen.getByRole('main')).not.toHaveFocus();
  });
});
