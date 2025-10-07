module.exports = {
  preset: "react-native",
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setupTests.js"],
  testMatch: ["**/tests/**/*.test.{ts,tsx,js}"],
  moduleDirectories: ["node_modules", "src", "app"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|@react-navigation|@expo|expo|expo-device|@unimodules|unimodules|@react-native-community|@expo/vector-icons)/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@src/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@contexts/(.*)$": "<rootDir>/src/contexts/$1",
    "^@constants/(.*)$": "<rootDir>/src/constants/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@styles/(.*)$": "<rootDir>/src/styles/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@hooks/(.*)$": "<rootDir>/src/hooks/$1",
    "^@assets/(.*)$": "<rootDir>/assets/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "app/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!src/types/**/*",
    "!src/styles/**/*",
    "!**/*.styles.{ts,tsx}",
    // Exclude layout files (pure routing configuration, no testable logic)
    "!**/_layout.tsx",
    // Exclude barrel/index files (re-exports only, no testable logic)
    "!**/index.ts",
    // Exclude static info pages (presentational only, no testable logic)
    "!app/(modals)/(profile)/about.tsx",
    "!app/(modals)/(profile)/helpAndSupport.tsx",
    "!app/(modals)/(settings)/privacyPolicy.tsx",
    "!app/(modals)/(settings)/termsOfService.tsx",
    "!**/about.tsx",
    "!**/helpAndSupport.tsx",
    "!**/privacyPolicy.tsx",
    "!**/termsOfService.tsx",
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 65,
      statements: 65,
    },
  },
  testEnvironment: "jsdom",
};
