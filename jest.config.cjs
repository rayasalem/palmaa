/** Jest config for Palma Marketplace – unit, api, integration tests (server). */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js', '**/*.test.cjs', '**/*.spec.js'],
  testPathIgnorePatterns: ['/node_modules/', '/cypress/', '/e2e/'],
  modulePathIgnorePatterns: ['<rootDir>/server/node_modules'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/server.js',
    '!server/auth/**',
    '!server/payment/**',
    '!server/modules/**',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 3,
      functions: 5,
      lines: 5,
      statements: 5,
    },
  },
  // Goal: 80%+ (see tests/README.md). Raise thresholds as more tests are added.
  moduleNameMapper: {},
  transform: { '^.+\\.js$': 'babel-jest' },
  transformIgnorePatterns: ['/node_modules/'],
  testTimeout: 15000,
  verbose: true,
};
