module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/src/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 15000, // Increased timeout for database operations
  // Separate test patterns for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/**/*.test.js'],
      testPathIgnorePatterns: ['<rootDir>/tests/integration/']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
    }
  ],
  // Global setup for all tests
  globalSetup: undefined,
  globalTeardown: undefined,
  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
};