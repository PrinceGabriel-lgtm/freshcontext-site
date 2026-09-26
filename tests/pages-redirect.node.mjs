// The pages.dev retirement redirect (functions/_middleware.js). Node's test runner,
// not Playwright: the file name keeps it out of Playwright's *.spec/*.test match.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// The package is CommonJS, so load the ES module source as one.
const source = await readFile(new URL("../functions/_middleware.js", import.meta.url), "utf8");
const { onRequest } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const served = new Response("site");
const visit = (url) => onRequest({ request: new Request(url), next: async () => served });

test("every pages.dev address goes permanently to the same path on freshcontext.dev", async () => {
  for (const [from, to] of [
    ["https://freshcontext.pages.dev/", "https://freshcontext.dev/"],
    ["https://freshcontext-site.pages.dev/spec", "https://freshcontext.dev/spec"],
    ["https://abc123.freshcontext-site.pages.dev/privacy?x=1", "https://freshcontext.dev/privacy?x=1"],
  ]) {
    const res = await visit(from);
    assert.equal(res.status, 301, from);
    assert.equal(res.headers.get("location"), to, from);
  }
});

test("any other host is served normally", async () => {
  assert.equal(await visit("https://freshcontext.dev/privacy"), served);
  assert.equal(await visit("https://evil.example/?next=pages.dev"), served);
  assert.equal(await visit("https://pages.dev.evil.example/"), served);
});
