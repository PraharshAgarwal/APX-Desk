/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Matches any .test.js inside a __tests__ folder, at any depth under src/
  testMatch: ['**/src/**/__tests__/**/*.test.js'],
  // Clear mock.calls / mock.results between tests but keep module registry intact
  // so jest.mock() factories set at file-top remain effective across describes.
  clearMocks: true,
  verbose: true,
  testTimeout: 10000,
};
