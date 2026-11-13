import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('shows the product name and the SecMinds logo', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'ASR Readiness' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'SecMinds Solutions' })).toBeInTheDocument();
  });

  it('says the tool is in development and states the trust promise', () => {
    render(<App />);
    expect(screen.getByText('In development')).toBeInTheDocument();
    expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument();
  });

  it('renders inside the design system root', () => {
    const { container } = render(<App />);
    expect(container.firstElementChild).toHaveClass('sm-root');
  });
});
