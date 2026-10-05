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

test("atlas publishes eight bounded failure classes", async ({ page }) => {
  await page.goto(`${baseURL}/failure-atlas`);
  await expect(page.locator(".atlas-entry")).toHaveCount(8);
  await expect(page.locator("#wrong-version")).toContainText("Correct document · wrong version");
  await expect(page.locator("#wrong-geography")).toContainText("Correct policy · wrong geography");
  await expect(page.locator("#wrong-plan")).toContainText("Correct product · wrong plan");
  await expect(page.locator("#changed-source")).toContainText("Recently changed source");
  await expect(page.locator("#authority-conflict")).toContainText("Conflicting authoritative sources");
  await expect(page.locator("#unresolved-provenance")).toContainText("Unresolved provenance");
  await expect(page.locator("#expired-applicability")).toContainText("Previously valid · no longer applicable");
  await expect(page.locator("#autonomy-boundary")).toContainText("inappropriate for autonomous action");
});

test("atlas preserves uncertainty and reliance-mode distinctions", async ({ page }) => {
  await page.goto(`${baseURL}/failure-atlas`);
  await expect(page.locator("#authority-conflict .atlas-verdict")).toHaveText("UNRESOLVED");
  await expect(page.locator("#unresolved-provenance .atlas-verdict")).toHaveText("UNRESOLVED");
  await expect(page.locator("#autonomy-boundary .atlas-verdict")).toHaveText("REVIEW");
  await expect(page.locator("#autonomy-boundary")).toContainText("Separate human-review thresholds from autonomous-action thresholds");
});

test("atlas states its synthetic claim boundary and commercial handoff", async ({ page }) => {
  await page.goto(`${baseURL}/failure-atlas`);
  await expect(page.getByText("Every example on this page is synthetic.")).toBeVisible();
  await expect(page.getByText("US$25,000 fixed")).toBeVisible();
  await expect(page.getByRole("link", { name: "Request an assessment" })).toHaveAttribute("href", "/contact#audit");
});

test("atlas does not create a collection or external-request surface", async ({ page }) => {
  const external = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(baseURL).origin) external.push(request.url());
  });

  await page.goto(`${baseURL}/failure-atlas`);
  await page.waitForLoadState("networkidle");

  await expect(page.locator("form, input, textarea, select")).toHaveCount(0);
  expect(external).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
  expect(await page.evaluate(() => ({
    local: localStorage.length,
    session: sessionStorage.length
  }))).toEqual({ local: 0, session: 0 });
});
