/**
 * jest-expo wires up the Expo/React Native module mocks and the Babel
 * transform. Everything below is the delta this project needs on top.
 */
module.exports = {
  preset: 'jest-expo',

  // `setupFilesAfterEnv` rather than `setupFiles`: the preset already populates
  // the latter with the React Native and Expo mocks, and setting it here would
  // replace them instead of adding to them.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // RN and most Expo/community packages ship untranspiled ESM, so they must
  // NOT be ignored by the transform — hence the negative lookahead.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-paper|react-native-maps|react-native-safe-area-context|react-native-vector-icons|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],

  // `.claude/` holds worktree copies of this source; without this jest would
  // collect every test twice and warn about duplicate haste module names.
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/', '/.claude/'],
  modulePathIgnorePatterns: ['/.claude/'],

  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/.claude/**',
    '!**/ios/**',
    '!**/android/**',
    '!**/__tests__/**',
    '!app.config.ts',
  ],
};
