import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const generator = path.resolve("ops/commercial/generate-pack.mjs");

function run(extra = []) {
  const output = mkdtempSync(path.join(tmpdir(), "freshcontext-pack-"));
  const args = [
    generator,
    "--application", "FC-APP-20260921-A1B2C3",
    "--service", "single-workflow",
    "--client", "Example Systems (Pty) Ltd",
    "--client-email", "buyer@example.com",
    "--supplier", "Immanuel Gabriel",
    "--fee", "4000",
    "--currency", "USD",
    "--scope", "Integrate FreshContext into the support RAG staging workflow.",
    "--date", "2026-09-21",
    "--output", output,
    ...extra,
  ];
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  return { output, result };
}

test("generates the complete draft transaction pack", () => {
  const { output, result } = run();
  assert.equal(result.status, 0, result.stderr);

  for (const name of [
    "00_manifest.json",
    "01_service_order.md",
    "02_invoice.md",
    "03_acceptance_schedule.md",
    "04_kickoff_checklist.md",
    "05_cover_email.txt",
    "06_transaction_pack.html",
  ]) {
    assert.equal(existsSync(path.join(output, name)), true, name + " missing");
  }

  const manifest = JSON.parse(readFileSync(path.join(output, "00_manifest.json"), "utf8"));
  assert.equal(manifest.status, "DRAFT_NOT_EXECUTED");
  assert.equal(manifest.service_name, "Single-Workflow Integration");
  assert.equal(manifest.fee, 4000);
  assert.equal(manifest.deposit_percent, 50);
  assert.equal(manifest.deposit_amount, 2000);
  assert.equal(manifest.balance_amount, 2000);
  assert.equal(manifest.tax_treatment, "TO_BE_CONFIRMED_BEFORE_ISSUE");

  const order = readFileSync(path.join(output, "01_service_order.md"), "utf8");
  assert.match(order, /DRAFT — NOT EXECUTED/);
  assert.match(order, /payment receipt is not by itself confirmation of cleared funds/i);
  assert.match(order, /Historical FreshContext material previously released under the MIT License/i);

  const invoice = readFileSync(path.join(output, "02_invoice.md"), "utf8");
  assert.match(invoice, /DO NOT PAY UNTIL FORMALLY ISSUED/);
  assert.match(invoice, /\$2,000\.00/);

  const acceptance = readFileSync(path.join(output, "03_acceptance_schedule.md"), "utf8");
  assert.match(acceptance, /Weak or unknown dating/);
  assert.match(acceptance, /does not certify truth/i);

  const html = readFileSync(path.join(output, "06_transaction_pack.html"), "utf8");
  assert.match(html, /FreshContext Service Order/);
  assert.match(html, /Example Systems \(Pty\) Ltd/);
});

test("uses service-specific deposit defaults", () => {
  const { output, result } = run(["--service", "private-multi", "--fee", "10000"]);
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(readFileSync(path.join(output, "00_manifest.json"), "utf8"));
  assert.equal(manifest.deposit_percent, 40);
  assert.equal(manifest.deposit_amount, 4000);
});

test("refuses invalid application references", () => {
  const output = mkdtempSync(path.join(tmpdir(), "freshcontext-pack-invalid-"));
  const result = spawnSync(process.execPath, [
    generator,
    "--application", "FC-123",
    "--service", "assessment",
    "--client", "Example",
    "--fee", "1250",
    "--scope", "Assess one workflow.",
    "--output", output,
  ], { encoding: "utf8" });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must match FC-APP-YYYYMMDD-XXXXXX/);
});

test("escapes user-controlled content in printable HTML", () => {
  const { output, result } = run(["--client", "<script>alert(1)</script>"]);
  assert.equal(result.status, 0, result.stderr);
  const html = readFileSync(path.join(output, "06_transaction_pack.html"), "utf8");
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
