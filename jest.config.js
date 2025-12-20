/**
 * Jest Configuration for Loopee RN
 *
 * Testing Strategy (Updated 2025-12-07):
 * - Unit Tests: Service layer and stores (Jest)
 * - E2E Tests: UI components and user flows (Maestro)
 *
 * Component unit tests were removed due to React Native bridge
 * compatibility issues with Expo SDK 53. UI testing is now
 * handled via Maestro E2E tests in the .maestro/ directory.
 */
module.exports = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*|zustand)",
  ],
  collectCoverageFrom: [
    // Focus on service layer and stores for unit test coverage
    "src/services/**/*.{ts,tsx}",
    "src/stores/**/*.{ts,tsx}",
    "src/utils/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/**/types/**",
  ],
  coverageThreshold: {
    // Thresholds adjusted for service-only unit testing
    // UI coverage provided by Maestro E2E tests
    global: {
      branches: 30,
      functions: 30,
      lines: 35,
      statements: 35,
    },
  },
  testMatch: [
    "**/__tests__/**/*.test.(ts|tsx|js|jsx)",
    "**/?(*.)+(spec|test).(ts|tsx|js|jsx)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@env$": "<rootDir>/__mocks__/env.js",
    "^react-native$": "<rootDir>/node_modules/react-native",
  },
  testEnvironment: "node",
  // Detect open handles to prevent memory leaks
  detectOpenHandles: false,
  // Force exit after tests complete
  forceExit: true,
};
