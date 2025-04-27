module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

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

  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/**/*.test.js',
    '<rootDir>/**/*.spec.js'
  ],

  transform: {
    '^.+\\.(jpg|jpeg|png|gif|svg|css|scss)$': 'jest-transform-stub',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

};
