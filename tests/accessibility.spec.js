const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const { extname, isAbsolute, join, normalize, relative } = require("node:path");

const root = join(__dirname, "..");
const pages = [
  "/",
  "/spec.html",
  "/context-integrity",
  "/context-integrity-demo",
  "/privacy.html",
  "/accessibility.html",
];

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

for (const path of pages) {
  test(`axe scan passes for ${path}`, async ({ page }) => {
    await page.goto(`${baseURL}${path}`);
    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });

  test(`no horizontal overflow at mobile width for ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(`${baseURL}${path}`);

    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);
  });
}
