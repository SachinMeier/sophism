// @ts-check
const { defineConfig } = require('@playwright/test');

const port = process.env.PLAYWRIGHT_PORT || '8090';
const baseURL = `http://127.0.0.1:${port}`;

module.exports = defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.js/,
  use: {
    baseURL,
  },
  webServer: {
    command: `python3 -m http.server ${port}`,
    url: baseURL,
    reuseExistingServer: true,
  },
});
