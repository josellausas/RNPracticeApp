// Flat config (ESLint 9). `eslint-config-expo/flat` bundles the React,
// react-hooks, TypeScript and import rules Expo recommends for SDK 55.
const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');
const globals = require('globals');

module.exports = defineConfig([
  ...expoConfig,
  {
    // Generated or vendored trees — never our code to fix.
    // `ios/` and `android/` come from prebuild (see AGENTS.md); `.claude/`
    // holds worktree copies of this same source, which would double every finding.
    ignores: ['node_modules/**', 'ios/**', 'android/**', '.expo/**', 'dist/**', '.claude/**'],
  },
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', 'jest.setup.js'],
    languageOptions: {
      globals: globals.jest,
    },
  },
]);
