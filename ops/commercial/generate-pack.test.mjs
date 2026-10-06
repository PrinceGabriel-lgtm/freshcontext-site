import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const generator = path.resolve("ops/commercial/generate-pack.mjs");
const catalogPath = path.resolve("ops/commercial/catalog.json");

function attempt(extra = []) {
  const output = mkdtempSync(path.join(tmpdir(), "freshcontext-retired-pack-"));
  const result = spawnSync(process.execPath, [
    generator,
    "--application", "FC-APP-20260921-A1B2C3",
    "--service", "assessment",
    "--client", "Example Systems (Pty) Ltd",
    "--fee", "25000",
    "--scope", "Assess one workflow.",
    "--output", output,
    ...extra,
  ], { encoding: "utf8" });
  return { output, result };
}

test("retired generator fails closed and creates no customer transaction paper", () => {
  const { output, result } = attempt();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /RETIRED and intentionally disabled/i);
  assert.match(result.stderr, /must not generate or issue/i);
  assert.deepEqual(readdirSync(output), []);
});

test("arguments cannot bypass the retirement boundary", () => {
  for (const extra of [
    ["--deposit", "1"],
    ["--service", "single-workflow"],
    ["--service", "private-multi"],
    ["--service", "build-to-spec"],
  ]) {
    const { output, result } = attempt(extra);
    assert.notEqual(result.status, 0);
    assert.deepEqual(readdirSync(output), []);
  }
});

test("historical catalog is an explicit non-authoritative retirement marker", () => {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  assert.equal(catalog.status, "RETIRED_NOT_AUTHORITY");
  assert.deepEqual(catalog.services, {});
  assert.match(catalog.warning, /Do not use/i);
  assert.match(catalog.transaction_document_boundary, /remains disabled/i);
});
