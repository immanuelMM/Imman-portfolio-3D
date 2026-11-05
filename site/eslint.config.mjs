// @ts-check
import js from '@eslint/js'
import astro from 'eslint-plugin-astro'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', '.astro/**', 'node_modules/**', 'test-results/**', 'e2e/shots/**', 'public/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.{ts,tsx,astro}'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    // R3F scenes: hooks rules matter; the scene mutates three.js objects inside useFrame on purpose.
    files: ['src/scene/**/*.tsx', 'src/islands/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Node scripts and tests
    files: ['scripts/**/*.mjs', '*.config.{mjs,ts}', 'src/**/*.test.ts', 'e2e/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }, // browser: page.evaluate bodies in the capture scripts
    rules: { 'no-console': 'off' },
  },
  {
    // Playwright specs: `async ({}, testInfo)` is the documented way to reach testInfo without a fixture.
    files: ['e2e/q1/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-empty-pattern': 'off', 'no-console': 'off' },
  },
)
