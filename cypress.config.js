const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    specPattern: 'client/__tests__/**/*.cy.{js,jsx,ts,tsx}',
    baseUrl: 'http://localhost:3000',
    supportFile: false,
  },
});
