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

test("proof starts with a changed version decision", async ({ page }) => {
  await page.goto(`${baseURL}/proof`);
  await expect(page.locator("#verdict-state")).toHaveText("CHANGED");
  await expect(page.locator("#task-version")).toHaveText("v3.4");
  await expect(page.locator("#checks-body")).toContainText("The carried answer is scoped to v3.1");
});

test("wrong geography remains visibly scoped", async ({ page }) => {
  await page.goto(`${baseURL}/proof`);
  await page.getByRole("button", { name: /Wrong geography/ }).click();
  await expect(page.locator("#verdict-state")).toHaveText("CHANGED");
  await expect(page.locator("#task-region")).toHaveText("EU");
  await expect(page.locator("#checks-body")).toContainText("United States");
});

test("conflicting current authorities do not collapse into certainty", async ({ page }) => {
  await page.goto(`${baseURL}/proof`);
  await page.getByRole("button", { name: /Conflicting authority/ }).click();
  await expect(page.locator("#verdict-state")).toHaveText("UNRESOLVED");
  await expect(page.locator("#checks-body")).toContainText("Two current first-party sources disagree");
  await expect(page.locator("#evidence-record")).toContainText('"verdict": "UNRESOLVED"');
});

test("clean current match can be accepted within its boundary", async ({ page }) => {
  await page.goto(`${baseURL}/proof`);
  await page.getByRole("button", { name: /Clean match/ }).click();
  await expect(page.locator("#verdict-state")).toHaveText("CURRENT");
  await expect(page.locator("#checks-body .proof-check-state[data-state='FAIL']")).toHaveCount(0);
  await expect(page.locator("#evidence-record")).toContainText("source integrity does not guarantee source truth");
});

test("proof is self-contained and does not create a new data-exfiltration surface", async ({ page }) => {
  const externalRequests = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.protocol !== "data:" && requestUrl.origin !== baseURL) externalRequests.push(request.url());
  });

  await page.goto(`${baseURL}/proof`);
  for (const name of [/Wrong geography/, /Conflicting authority/, /Clean match/, /Wrong version/]) {
    await page.getByRole("button", { name }).click();
  }

  expect(externalRequests).toEqual([]);
  await expect(page.locator("form, input, textarea, select")).toHaveCount(0);
  expect(await page.evaluate(() => ({
    localStorageItems: localStorage.length,
    sessionStorageItems: sessionStorage.length,
    cookie: document.cookie
  }))).toEqual({ localStorageItems: 0, sessionStorageItems: 0, cookie: "" });
});

test("scrollable decision record is keyboard reachable", async ({ page }) => {
  await page.goto(`${baseURL}/proof`);
  const record = page.locator("pre[aria-label='Decision record JSON']");
  await record.focus();
  await expect(record).toBeFocused();
});
