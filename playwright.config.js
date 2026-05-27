/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: "./tests",
  workers: 1,
  reporter: "list",
  use: {
    channel: "chrome",
    headless: true,
  },
};
