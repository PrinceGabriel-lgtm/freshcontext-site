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
