const { test, expect } = require("@playwright/test");
const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const { extname, isAbsolute, join, normalize, relative } = require("node:path");

const root = join(__dirname, "..");

let server;
let baseURL;

function contentType(pathname) {
  if (pathname.endsWith(".html")) return "text/html; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  return "application/octet-stream";
}

function resolvePath(url) {
  const pathname = new URL(url, "http://localhost").pathname;
  const filename = pathname === "/"
    ? "index.html"
    : extname(pathname)
      ? pathname.slice(1)
      : `${pathname.slice(1)}.html`;
  const safePath = normalize(join(root, filename));
  const relativePath = relative(root, safePath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return null;
  }
  return safePath;
}

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const path = resolvePath(req.url ?? "/");
    if (!path) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const body = await readFile(path);
      res.writeHead(200, { "content-type": contentType(path) });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseURL = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// The forms load Cloudflare Turnstile. Blocked here so every run scans the same page
// (the email fallback state) whatever the network allows.

test.beforeEach(async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  await page.route("https://intake.freshcontext.dev/**", (route) => route.abort());
});

// Serves the page with a Turnstile stub and answers the intake from the test.
async function online(page, path, intake) {
  await page.route("https://challenges.cloudflare.com/**", (route) => route.fulfill({
    contentType: "text/javascript",
    body: "window.turnstile={render:function(el,o){window.__tsAction=o.action;return 'w1'},getResponse:function(){return 'token-from-stub'},reset:function(){}};window.onFreshContextTurnstile();",
  }));
  const seen = [];
  await page.route("https://intake.freshcontext.dev/applications", async (route) => {
    seen.push(route.request().postDataJSON());
    await route.fulfill(await intake(route));
  });
  await page.goto(`${baseURL}${path}`);
  return seen;
}

async function fillContact(page, p) {
  await page.fill(`#${p}-name`, "Jane Doe");
  await page.fill(`#${p}-email`, "jane@example.com");
  await page.fill(`#${p}-company`, "Example Co");
  await page.fill(`#${p}-role`, "Head of Support");
}

const received = { status: 201, contentType: "application/json", body: JSON.stringify({ reference: "FC-APP-20260928-ABC123", received_at: "2026-09-28T10:00:00Z" }) };

test("a Snapshot request reaches the intake in the shape it accepts", async ({ page }) => {
  const seen = await online(page, "/snapshot", async () => received);
  await fillContact(page, "s");
  await page.fill("#s-url", "https://help.example.com/");
  await page.fill("#s-note", "Pricing changed in August");
  await page.check("#s-ack");
  await page.click("#snapshot-form button[type=submit]");
  await expect(page.locator("[data-done]")).toBeVisible();
  await expect(page.locator("[data-reference]")).toHaveText("FC-APP-20260928-ABC123");
  await expect(page.locator("#snapshot-form")).toBeHidden();
  expect(seen).toHaveLength(1);
  const sent = seen[0];
  expect(sent.service).toBe("snapshot");
  expect(sent.workflow).toBe("https://help.example.com/\n\nNote: Pricing changed in August");
  expect(sent.acknowledgement).toBe(true);
  expect(sent.turnstile_token).toBe("token-from-stub");
  expect(sent.client_reference).toMatch(/^FC-APP-\d{8}-[A-F0-9]{6}$/);
  // Only what the form asks is sent; the intake stores the rest as empty.
  expect(Object.keys(sent).sort()).toEqual(["acknowledgement", "client_reference", "company", "email", "name", "role", "service", "turnstile_token", "workflow"]);
  expect(await page.evaluate(() => window.__tsAction)).toBe("commercial_application");
});

test("an intake refusal is explained on the form, not swallowed", async ({ page }) => {
  await online(page, "/snapshot", async () => ({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "help_centre_url_required" }) }));
  await fillContact(page, "s");
  await page.fill("#s-url", "https://help.example.com/");
  await page.check("#s-ack");
  await page.click("#snapshot-form button[type=submit]");
  await expect(page.locator("#snapshot-form [data-help]")).toContainText("https://");
  await expect(page.locator("#snapshot-form")).toBeVisible();
});

test("an audit enquiry is sent as service audit", async ({ page }) => {
  const seen = await online(page, "/contact", async () => received);
  await fillContact(page, "a");
  await page.fill("#a-about", "Intercom Fin, about 2,000 conversations a month.");
  await page.check("#a-ack");
  await page.click("#audit-form button[type=submit]");
  await expect(page.locator("#audit [data-done]")).toBeVisible();
  expect(seen[0].service).toBe("audit");
  expect(seen[0].workflow).toBe("Intercom Fin, about 2,000 conversations a month.");
});

test("with the intake unreachable, the request becomes an email the visitor sends", async ({ page }) => {
  await page.goto(`${baseURL}/snapshot`);
  await fillContact(page, "s");
  await page.fill("#s-url", "https://help.example.com/");
  await page.check("#s-ack");
  await page.click("#snapshot-form button[type=submit]");
  await expect(page.locator("[data-done-title]")).toHaveText("It couldn't be sent online.");
  const href = await page.locator("[data-mail]").getAttribute("href");
  expect(href).toContain("mailto:immanuel@freshcontext.dev");
  expect(decodeURIComponent(href)).toContain("https://help.example.com/");
});

test("nothing is sent without the acknowledgement or a URL", async ({ page }) => {
  const seen = await online(page, "/snapshot", async () => received);
  await fillContact(page, "s");
  await page.fill("#s-url", "https://help.example.com/");
  await page.click("#snapshot-form button[type=submit]");
  await expect(page.locator("#s-ack")).toBeFocused();
  await page.check("#s-ack");
  await page.fill("#s-url", "");
  await page.click("#snapshot-form button[type=submit]");
  expect(seen).toHaveLength(0);
});
