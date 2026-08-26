// eslint-config-next 16 ships flat configs directly — the FlatCompat/eslintrc
// shim we used for the v15 eslintrc presets crashes on them.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // eslint-plugin-react-hooks 7 (shipped with eslint-config-next 16) added
      // the React Compiler diagnostics as errors. They flag pre-existing,
      // React-19-legal patterns; the compiler bails out of what it can't
      // optimize rather than miscompiling it, so these are advisory here.
      // Warn until the flagged call sites are cleaned up on their own.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'dist/**'] },
]
