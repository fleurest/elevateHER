module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

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
