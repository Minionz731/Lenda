module.exports = {
  testEnvironment: 'node',
  setupFilesAfterFramework: ['./jest.setup.js'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!jest.setup.js',
    '!jest.config.js',
  ],
  verbose: true,
};