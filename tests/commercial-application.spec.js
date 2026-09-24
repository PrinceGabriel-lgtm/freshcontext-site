const { test, expect } = require("@playwright/test");
const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const { extname, isAbsolute, join, normalize, relative } = require("node:path");
const root = join(__dirname, "..");
let server, baseURL;
test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const filename = pathname === "/" ? "index.html" : extname(pathname) ? pathname.slice(1) : `${pathname.slice(1)}.html`;
    const path = normalize(join(root, filename));
    const rel = relative(root, path);
    if (rel.startsWith("..") || isAbsolute(rel)) { res.writeHead(403); res.end(); return; }
    try {
      const body = await readFile(path);
      const type = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript" }[extname(path)] || "application/octet-stream";
      res.writeHead(200, {"content-type":type}); res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => { await new Promise(resolve => server.close(resolve)); });
test.beforeEach(async ({page}) => {
  await page.route("**/api/request-config", route => route.fulfill({json:{enabled:true,mode:"local-preview"}}));
});
async function fill(page) {
  await page.fill("#name","Synthetic Reviewer");
  await page.fill("#email","reviewer@example.invalid");
  await page.fill("#workflow","Synthetic workflow for browser checks.");
}
test("service links preserve the selected engagement",async ({page}) => {
  await page.goto(`${baseURL}/apply?service=single-workflow`);
  await expect(page.locator("#service")).toHaveValue("single-workflow");
});
test("receipt is displayed only after a valid successful server response",async ({page}) => {
  let posted;
  await page.route("**/api/requests",async route => {
    posted=route.request().postDataJSON();
    await route.fulfill({status:201,json:{reference:"FC-REQ-ABCDEF0123456789ABCDEF01"}});
  });
  await page.goto(`${baseURL}/apply?utm_source=coderlegion`);
  await fill(page); await page.getByRole("checkbox").check(); await page.click("#send-request");
  await expect(page.locator("#receipt")).toBeVisible();
  expect(posted.attribution).toBe("coderlegion"); expect(posted.company).toBe(""); expect(posted.acknowledgement).toBe(true);
  expect(posted.idempotency_key).toMatch(/^[a-f0-9-]{36}$/);
  await expect(page.locator("#request-form")).toBeHidden();
  await expect(page.locator("#receipt")).toContainText("No booking, contract or payment");
});
test("unacknowledged requests are not submitted",async ({page}) => {
  let submissions=0;
  await page.route("**/api/requests",route=>{submissions++;return route.fulfill({status:503,json:{}});});
  await page.goto(`${baseURL}/apply`); await fill(page); await page.click("#send-request");
  await expect(page.locator("#receipt")).toBeHidden(); expect(submissions).toBe(0);
});
test("failed writes preserve the request and reuse the key for an exact retry",async ({page}) => {
  const posted=[];
  await page.route("**/api/requests",route=>{posted.push(route.request().postDataJSON());return route.fulfill({status:503,json:{error:"unavailable"}});});
  await page.goto(`${baseURL}/apply`); await fill(page); await page.getByRole("checkbox").check();
  await page.click("#send-request"); await expect(page.locator("#request-status")).toContainText("Receipt could not be confirmed");
  await page.click("#send-request"); await expect(page.locator("#request-status")).toContainText("Receipt could not be confirmed");
  expect(posted).toHaveLength(2); expect(posted[0].idempotency_key).toBe(posted[1].idempotency_key);
  await expect(page.locator("#receipt")).toBeHidden();
  await expect(page.locator("#workflow")).toHaveValue("Synthetic workflow for browser checks.");
});
test("a missing receiver leaves a clear email fallback, never a false receipt",async ({page}) => {
  await page.route("**/api/request-config",route=>route.fulfill({status:404,body:"Not found"}));
  await page.goto(`${baseURL}/apply`);
  await expect(page.locator("#request-status")).toContainText("Direct requests are unavailable");
  await expect(page.locator("#send-request")).toBeDisabled();
  await expect(page.locator('a[href="mailto:immanuel@freshcontext.dev"]')).toBeVisible();
  await expect(page.locator("#receipt")).toBeHidden();
});
