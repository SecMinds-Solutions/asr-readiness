import * as React from 'react';

// The design system bundle reads React from window.React when it loads.
// This module must be imported before ./bundle.js.
(window as unknown as { React: typeof React }).React = React;
