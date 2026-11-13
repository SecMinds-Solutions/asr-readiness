import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme } from './theme';

applyTheme(document.documentElement, window.matchMedia('(prefers-color-scheme: dark)'));

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
