/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: "./tests",
  workers: 1,
  reporter: "list",
  use: {
    // Playwright's bundled Chromium, version-locked by @playwright/test in the
    // lockfile. This was `channel: "chrome"`, which binds the run to whatever Google
    // Chrome is installed locally: a different build on every machine, and missing
    // from most containers, where the whole suite fails with
    // `Chromium distribution 'chrome' is not found` regardless of the page content.
    // Accessibility results should not depend on the browser a contributor happens
    // to have.
    headless: true,
  },
};
