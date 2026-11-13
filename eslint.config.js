import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Vendored design system files are updated from the design system, not edited here.
  { ignores: ['dist', 'coverage', 'src/design-system/bundle.js', 'src/design-system/components.d.ts'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-console': 'error',
    },
  },
  {
    files: ['eslint.config.js', 'vite.config.ts'],
    languageOptions: { globals: globals.node },
  },
);
