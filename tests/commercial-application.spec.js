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
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) return null;
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

// By default Turnstile cannot load, which exercises the page's email fallback. The online
// tests below register their own stub, which takes precedence.
test.beforeEach(async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  await page.route("https://intake.freshcontext.dev/**", (route) => route.abort());
});

test("service link preselects the requested engagement", async ({ page }) => {
  await page.goto(`${baseURL}/apply?service=single-workflow`);
  await expect(page.locator("#service")).toHaveValue("single-workflow");
});

test("application preparation creates a trackable non-binding email", async ({ page }) => {
  await page.goto(`${baseURL}/apply?service=assessment`);

  await page.fill("#company", "Example Systems");
  await page.fill("#name", "Alex Example");
  await page.fill("#email", "alex@example.com");
  await page.fill("#role", "AI Platform Lead");
  await page.fill("#workflow", "RAG assistant retrieves policy pages before answering.");
  await page.fill("#stack", "Postgres, vector search, TypeScript orchestration.");
  await page.fill("#failure", "Policy pages can be stale and source dates are inconsistently captured.");
  await page.fill("#acceptance", "Stale candidates are flagged and decisions carry inspectable reasons.");
  await page.selectOption("#timeline", { label: "Within 30 days" });
  await page.selectOption("#environment", { label: "Staging / test" });
  await page.selectOption("#sensitivity", { label: "Public / non-sensitive test data" });
  await page.selectOption("#authority", { label: "I can approve this engagement" });
  await page.check("#acknowledgement");

  // Turnstile is blocked, so the page reverts to preparing an email.
  await expect(page.locator("#application-submit")).toHaveText("Prepare application");
  await page.click('button[type="submit"]');

  const prepared = page.locator("#prepared-application");
  await expect(prepared).toBeVisible();

  const reference = await page.locator("#application-reference").textContent();
  expect(reference).toMatch(/^FC-APP-\d{8}-[A-F0-9]{6}$/);

  const summary = await page.locator("#application-summary").textContent();
  expect(summary).toContain(`Application reference: ${reference}`);
  expect(summary).toContain("Context Integrity Assessment");
  expect(summary).toContain("Example Systems");
  expect(summary).toContain("This application is non-binding.");

  const href = await page.locator("#application-email").getAttribute("href");
  expect(href).toContain("mailto:immanuel@freshcontext.dev");
  expect(decodeURIComponent(href)).toContain(reference);
  expect(decodeURIComponent(href)).toContain("Context Integrity Assessment");
});

test("application cannot be prepared without commercial acknowledgement", async ({ page }) => {
  await page.goto(`${baseURL}/apply?service=build-to-spec`);

  await page.fill("#company", "Example Systems");
  await page.fill("#name", "Alex Example");
  await page.fill("#email", "alex@example.com");
  await page.fill("#role", "CTO");
  await page.fill("#workflow", "Agent workflow.");
  await page.fill("#stack", "TypeScript.");
  await page.fill("#failure", "Context integrity risk.");
  await page.fill("#acceptance", "Inspectable decision output.");
  await page.selectOption("#timeline", { label: "Quarter / later" });
  await page.selectOption("#environment", { label: "Not yet decided" });
  await page.selectOption("#sensitivity", { label: "Not sure yet" });
  await page.selectOption("#authority", { label: "I can approve this engagement" });

  await page.click('button[type="submit"]');

  await expect(page.locator("#prepared-application")).toBeHidden();
  await expect(page.locator("#acknowledgement")).toBeFocused();
});

// Online submission: the page is served with a Turnstile site key, the Turnstile script is
// replaced by a stub, and the intake endpoint is answered by the test.
async function openOnline(page, intake) {
  await page.route(`${baseURL}/apply*`, async (route) => {
    const res = await route.fetch();
    const html = (await res.text()).replace(/data-turnstile-sitekey="[^"]*"/, 'data-turnstile-sitekey="test-site-key"');
    await route.fulfill({ response: res, body: html });
  });
  await page.route("https://challenges.cloudflare.com/**", (route) => route.fulfill({
    contentType: "text/javascript",
    body: "window.turnstile={render:function(el,o){window.__tsAction=o.action;return 'w1'},getResponse:function(){return 'token-from-stub'},reset:function(){}};window.onFreshContextTurnstile();",
  }));
  const seen = [];
  await page.route("https://intake.freshcontext.dev/applications", async (route) => {
    seen.push(route.request().postDataJSON());
    await route.fulfill(await intake(route));
  });
  await page.goto(`${baseURL}/apply?service=private-multi`);
  await page.fill("#company", "ABC");
  await page.fill("#name", "Jane Doe");
  await page.fill("#email", "jane@example.com");
  await page.fill("#role", "CTO");
  await page.fill("#workflow", "RAG support");
  await page.fill("#stack", "Retriever");
  await page.fill("#failure", "Weak and unsafe handoff");
  await page.fill("#acceptance", "Good handoff between agents");
  await page.selectOption("#timeline", { label: "Within 2 weeks" });
  await page.selectOption("#environment", { label: "Staging / test" });
  await page.selectOption("#sensitivity", { label: "Public / non-sensitive test data" });
  await page.selectOption("#authority", { label: "I can approve this engagement" });
  await page.check("#acknowledgement");
  return seen;
}

test("configured page submits the application and shows the reference FreshContext assigned", async ({ page }) => {
  const seen = await openOnline(page, async () => ({ status: 201, contentType: "application/json", body: JSON.stringify({ reference: "FC-APP-20260925-5EA7ED", received_at: "2026-09-25T13:12:18.325Z" }) }));
  await expect(page.locator("#application-submit")).toHaveText("Submit application");
  await page.click("#application-submit");
  await expect(page.locator("#prepared-title")).toHaveText("Application received.");
  await expect(page.locator("#application-reference")).toHaveText("FC-APP-20260925-5EA7ED");
  await expect(page.locator("#application-email-actions")).toBeHidden();
  await expect(page.locator("#commercial-application")).toBeHidden();
  expect(seen).toHaveLength(1);
  expect(seen[0]).toMatchObject({ service: "private-multi", company: "ABC", email: "jane@example.com", acknowledgement: true, turnstile_token: "token-from-stub", timeline: "Within 2 weeks" });
  expect(seen[0].client_reference).toMatch(/^FC-APP-\d{8}-[A-F0-9]{6}$/);
  expect(await page.evaluate(() => window.__tsAction)).toBe("commercial_application");
});

test("a refusal the visitor can fix is explained next to the button", async ({ page }) => {
  await openOnline(page, async () => ({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "rate_limited" }) }));
  await page.click("#application-submit");
  await expect(page.locator("#application-help")).toContainText("Too many submissions");
  await expect(page.locator("#prepared-application")).toBeHidden();
  await expect(page.locator("#application-submit")).toBeEnabled();
});

test("when the service is down the page falls back to the email draft", async ({ page }) => {
  await openOnline(page, async () => ({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "rate_limit_unavailable" }) }));
  await page.click("#application-submit");
  await expect(page.locator("#prepared-title")).toHaveText("Your application could not be submitted online.");
  await expect(page.locator("#application-email-actions")).toBeVisible();
  const href = await page.locator("#application-email").getAttribute("href");
  expect(decodeURIComponent(href)).toContain("Weak and unsafe handoff");
});
