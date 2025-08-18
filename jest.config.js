module.exports = {
  preset: "react-native",
  setupFilesAfterEnv: ["<rootDir>/tests/setupTests.js"],
  testMatch: ["**/tests/**/*.test.{ts,tsx,js}"],
  moduleDirectories: ["node_modules", "src", "app"],
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-native-.*|@expo|expo|@tanstack|axios|uuid|expo-document-picker|expo-media-library|expo-sharing|expo-file-system|expo-modules-core|expo-font|expo-haptics|@react-native/virtualized-lists|react-native/Libraries/Components/ScrollView)/)"
  ],
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@contexts/(.*)$": "<rootDir>/src/contexts/$1",
    "^@constants/(.*)$": "<rootDir>/src/constants/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@styles/(.*)$": "<rootDir>/src/styles/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@hooks/(.*)$": "<rootDir>/src/hooks/$1"
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "app/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!src/types/**/*",
    "!src/styles/**/*",
    "!**/*.styles.{ts,tsx}"
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70
    }
  },
  testEnvironment: "jsdom"
};