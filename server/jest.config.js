module.exports = {
    setupFiles: ['<rootDir>/jest.setup.js'],
  
    collectCoverage: true,
    collectCoverageFrom: [
      'src/**/*.{js,jsx,ts,tsx}',
      '!src/**/*.test.{js,jsx,ts,tsx}',
      '!src/**/index.{js,ts}'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['lcov', 'text'],
  
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 90,
        statements: 90
      }
    },
  
    testEnvironment: 'node',
    testMatch: [
      '<rootDir>/**/*.test.js',
      '<rootDir>/**/*.spec.js'
    ],
  };
  