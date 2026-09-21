#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(fs.readFileSync(path.join(here, "catalog.json"), "utf8"));

function fail(message) {
  console.error("FreshContext commercial pack generator: " + message);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) fail("Unexpected argument: " + arg);
    const key = arg.slice(2);
    if (key === "help") {
      out.help = true;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) fail("Missing value for --" + key);
    out[key] = next;
    i += 1;
  }
  return out;
}

function money(amount, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function addDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) fail("Invalid --date value; use YYYY-MM-DD");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function bullets(items) {
  return items.map((item) => "- " + item).join("\n");
}

function htmlList(items) {
  return "<ul>" + items.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
}

function help() {
  console.log(`
Usage:
  node ops/commercial/generate-pack.mjs \\
    --application FC-APP-20260921-A1B2C3 \\
    --service single-workflow \\
    --client "Example Systems (Pty) Ltd" \\
    --client-email "buyer@example.com" \\
    --supplier "Immanuel Gabriel" \\
    --fee 4000 \\
    --currency USD \\
    --scope "Integrate FreshContext into the client support RAG staging workflow."

Required:
  --application   FC-APP-YYYYMMDD-XXXXXX
  --service       assessment | single-workflow | private-multi | build-to-spec
  --client        Client legal / contracting name
  --fee           Agreed fee before any legally applicable tax treatment
  --scope         Short agreed scope statement

Optional:
  --client-email
  --supplier      Defaults to "Immanuel Gabriel"
  --currency      Defaults to USD
  --deposit       Percentage; defaults from service catalog
  --date          YYYY-MM-DD; defaults to today
  --due-days      Invoice due days; defaults to 7
  --output        Output directory; defaults to commercial-packs/<application>
  --notes         Additional commercial note
`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  help();
  process.exit(0);
}

const application = args.application ?? "";
if (!/^FC-APP-\d{8}-[A-F0-9]{6}$/.test(application)) {
  fail("--application must match FC-APP-YYYYMMDD-XXXXXX");
}

const serviceKey = args.service ?? "";
const service = catalog.services[serviceKey];
if (!service) fail("Unknown --service: " + serviceKey);

const client = (args.client ?? "").trim();
if (!client) fail("--client is required");

const scope = (args.scope ?? "").trim();
if (!scope) fail("--scope is required");

const supplier = (args.supplier ?? "Immanuel Gabriel").trim();
if (!supplier) fail("--supplier cannot be blank");

const fee = Number(args.fee);
if (!Number.isFinite(fee) || fee <= 0) fail("--fee must be a positive number");

const currency = (args.currency ?? "USD").toUpperCase();
if (!/^[A-Z]{3}$/.test(currency)) fail("--currency must be a three-letter ISO-style currency code");

const depositPercent = args.deposit === undefined
  ? Number(service.defaultDepositPercent)
  : Number(args.deposit);
if (!Number.isFinite(depositPercent) || depositPercent <= 0 || depositPercent > 100) {
  fail("--deposit must be greater than 0 and no more than 100");
}

const dueDays = args["due-days"] === undefined ? 7 : Number(args["due-days"]);
if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 365) fail("--due-days must be an integer between 0 and 365");

const date = args.date ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("--date must use YYYY-MM-DD");
const dueDate = addDays(date, dueDays);

const suffix = application.split("-").at(-1);
const compactDate = date.replaceAll("-", "");
const serviceOrderId = `FC-SO-${compactDate}-${suffix}`;
const invoiceId = `FC-INV-${compactDate}-${suffix}-01`;
const acceptanceId = `FC-ACC-${compactDate}-${suffix}`;

const depositAmount = Math.round((fee * depositPercent / 100) * 100) / 100;
const balanceAmount = Math.round((fee - depositAmount) * 100) / 100;
const clientEmail = (args["client-email"] ?? "").trim();
const notes = (args.notes ?? "").trim();

const output = path.resolve(args.output ?? path.join("commercial-packs", application));
fs.mkdirSync(output, { recursive: true });

const manifest = {
  schema: "freshcontext-commercial-pack/v1",
  generated_at: new Date().toISOString(),
  status: "DRAFT_NOT_EXECUTED",
  application_reference: application,
  service_key: serviceKey,
  service_name: service.name,
  client,
  client_email: clientEmail || null,
  supplier,
  scope,
  currency,
  fee,
  deposit_percent: depositPercent,
  deposit_amount: depositAmount,
  balance_amount: balanceAmount,
  service_order_id: serviceOrderId,
  invoice_id: invoiceId,
  acceptance_id: acceptanceId,
  issue_date: date,
  invoice_due_date: dueDate,
  delivery_window: service.deliveryWindow,
  tax_treatment: "TO_BE_CONFIRMED_BEFORE_ISSUE",
  notes: notes || null
};

fs.writeFileSync(path.join(output, "00_manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const serviceOrder = `# FreshContext Service Order — DRAFT

**Status:** DRAFT — NOT EXECUTED  
**Application reference:** ${application}  
**Service order:** ${serviceOrderId}  
**Issue date:** ${date}  
**Client:** ${client}  
**Client email:** ${clientEmail || "[to be supplied]"}  
**Supplier / contracting party:** ${supplier}

> This generator creates operational draft paper. It does not determine governing law, tax treatment, registration status, enforceability, or jurisdiction-specific consumer/procurement obligations. Those must be confirmed before issue where applicable.

## 1. Service

**Service:** ${service.name}

**Scope:**  
${scope}

**Standard delivery window:** ${service.deliveryWindow}

## 2. Deliverables

${bullets(service.deliverables)}

## 3. Client dependencies

Before READY_TO_START, confirm:
- authorized technical contact;
- required access to the agreed test/staging/private environment;
- representative, lawfully shareable test payloads;
- data sensitivity/classification;
- any procurement or vendor-onboarding requirement;
- acceptance owner and response timetable.

Ordinary email is not an approved channel for secrets, credentials, payment-card data, regulated records, or sensitive production data unless specifically agreed.

## 4. Price and commencement

**Agreed fee before any legally applicable tax treatment:** ${money(fee, currency)}  
**Commencement deposit:** ${depositPercent}% = ${money(depositAmount, currency)}  
**Remaining balance:** ${money(balanceAmount, currency)}

Work does not commence until:
1. the required commercial agreement is signed by the required parties; and
2. the required commencement payment is confirmed as cleared in the receiving account.

A transfer screenshot, remittance advice, or payment receipt is not by itself confirmation of cleared funds.

Applicable tax/VAT treatment must be confirmed before the final invoice is issued.

## 5. Acceptance

The parties should approve the attached acceptance schedule before implementation begins.

### Baseline acceptance statements

${bullets(service.acceptance)}

Acceptance does not expand the scope beyond the written service order and acceptance schedule.

## 6. Out of scope unless added in writing

${bullets(service.outOfScope)}

## 7. Change control

Any material change to workflow count, environment, integration point, deliverables, acceptance criteria, dependency, timetable, or requested capability requires written scope approval and may change price or delivery dates.

## 8. Background IP and open source

Historical FreshContext material previously released under the MIT License remains subject to those historical licence rights.

Pre-existing FreshContext technology, methods, know-how, reusable components, tools, infrastructure, and general improvements remain Background IP unless an executed agreement expressly states otherwise.

Client-specific deliverables and any rights granted in them must be identified expressly. No exclusivity, assignment, or transfer of FreshContext ownership arises from this draft, an invoice, a payment, or an email exchange.

## 9. Legal completion required before issue

The final executed paper should state the applicable confidentiality, data-handling, warranty, liability, governing-law, dispute, termination, suspension, cure, and handover provisions.

## 10. Signatures

**Client authorized representative**  
Name: ______________________________  
Title: ______________________________  
Signature: ___________________________  
Date: _______________________________

**FreshContext / supplier**  
Name: ${supplier}  
Signature: ___________________________  
Date: _______________________________
`;

fs.writeFileSync(path.join(output, "01_service_order.md"), serviceOrder);

const invoice = `# FreshContext Invoice — DRAFT

**Status:** DRAFT — DO NOT PAY UNTIL FORMALLY ISSUED  
**Invoice:** ${invoiceId}  
**Application reference:** ${application}  
**Service order:** ${serviceOrderId}  
**Invoice date:** ${date}  
**Due date:** ${dueDate}

## Supplier

${supplier}

Address / tax registration / banking details: **to be confirmed on issued invoice**

## Bill to

${client}  
${clientEmail || "[billing email to be supplied]"}

## Description

Commencement deposit for **${service.name}**

Scope reference: ${scope}

## Amount

Agreed service fee before any legally applicable tax treatment: **${money(fee, currency)}**  
Commencement deposit (${depositPercent}%): **${money(depositAmount, currency)}**  
Remaining contractual balance after commencement deposit: **${money(balanceAmount, currency)}**

**Tax/VAT:** TO BE CONFIRMED BEFORE FORMAL ISSUE  
**Amount requested by this draft:** ${money(depositAmount, currency)} plus any legally applicable amount stated on the formally issued invoice.

## Payment reference

**${application}**

Payment details must be supplied through the formally issued invoice or another approved channel.

Payment initiates the applicable payment step only. Work commencement remains subject to the signed agreement and confirmation that the required commencement payment has cleared.
`;

fs.writeFileSync(path.join(output, "02_invoice.md"), invoice);

const acceptanceRows = service.acceptance.map((item, index) =>
  `| A-${String(index + 1).padStart(2, "0")} | ${item.replaceAll("|", "\\|")} | [fixture/evidence] | [expected observable result] | [ ] |`
).join("\n");

const acceptance = `# FreshContext Acceptance Schedule — DRAFT

**Acceptance schedule:** ${acceptanceId}  
**Application reference:** ${application}  
**Service order:** ${serviceOrderId}  
**Service:** ${service.name}

Only the behavior written in the final approved schedule controls acceptance.

| ID | Scenario / requirement | Input or evidence | Expected result | Pass |
|---|---|---|---|---|
${acceptanceRows}

## Additional client-specific tests

| ID | Scenario / requirement | Input or evidence | Expected result | Pass |
|---|---|---|---|---|
| C-01 | [client-specific] | | | [ ] |
| C-02 | [client-specific] | | | [ ] |

## Acceptance boundary

Do not use subjective acceptance terms such as “better,” “robust,” “enterprise-ready,” “safe,” or “accurate” unless they are tied to an objective test.

FreshContext evaluates context integrity and decision readiness. It does not certify truth, legal compliance, model safety, or business outcomes.
`;

fs.writeFileSync(path.join(output, "03_acceptance_schedule.md"), acceptance);

const kickoff = `# FreshContext Kickoff Checklist

**Application reference:** ${application}  
**Service order:** ${serviceOrderId}  
**Target state:** READY_TO_START

- [ ] Service Order signed by required parties
- [ ] Commencement deposit confirmed as cleared
- [ ] Technical owner confirmed
- [ ] Required access confirmed
- [ ] Data sensitivity/classification confirmed
- [ ] Acceptance schedule approved
- [ ] Evidence folder created
- [ ] Scope and out-of-scope list frozen
- [ ] First delivery checkpoint scheduled

## Scope

${scope}

## Notes

${notes || "[none]"}
`;

fs.writeFileSync(path.join(output, "04_kickoff_checklist.md"), kickoff);

const coverEmail = `Subject: FreshContext ${service.name} — ${application}

Hello,

Thank you for the FreshContext application.

I have prepared the draft commercial pack for application ${application}, covering:
- Service Order ${serviceOrderId}
- Invoice ${invoiceId}
- Acceptance Schedule ${acceptanceId}

Service: ${service.name}
Agreed scope: ${scope}
Fee before any legally applicable tax treatment: ${money(fee, currency)}
Proposed commencement deposit: ${depositPercent}% (${money(depositAmount, currency)})

Please review the scope, deliverables, dependencies, acceptance criteria and commercial terms carefully. Do not make payment against a draft document. Payment instructions should be used only from the formally issued invoice.

Work begins only after the required agreement is executed and the required commencement payment is confirmed as cleared.

Regards,
${supplier}
FreshContext
`;

fs.writeFileSync(path.join(output, "05_cover_email.txt"), coverEmail);

const h = {
  app: escapeHtml(application),
  service: escapeHtml(service.name),
  client: escapeHtml(client),
  email: escapeHtml(clientEmail || "[to be supplied]"),
  supplier: escapeHtml(supplier),
  scope: escapeHtml(scope),
  serviceOrderId: escapeHtml(serviceOrderId),
  invoiceId: escapeHtml(invoiceId),
  acceptanceId: escapeHtml(acceptanceId),
  fee: escapeHtml(money(fee, currency)),
  deposit: escapeHtml(money(depositAmount, currency)),
  balance: escapeHtml(money(balanceAmount, currency)),
  depositPercent: escapeHtml(depositPercent),
  date: escapeHtml(date),
  dueDate: escapeHtml(dueDate),
  delivery: escapeHtml(service.deliveryWindow)
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FreshContext Transaction Pack — ${h.app}</title>
<style>
  :root { --ink:#1a1d18; --muted:#666a61; --line:#d9d9d2; --accent:#0f6e55; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.5 Arial, sans-serif; color:var(--ink); background:#f5f5f1; }
  .page { width:min(920px, calc(100% - 32px)); margin:24px auto; background:white; padding:52px; box-shadow:0 1px 8px #0002; }
  h1,h2,h3 { line-height:1.15; }
  h1 { font-size:28px; margin:0 0 6px; }
  h2 { margin-top:30px; border-bottom:1px solid var(--line); padding-bottom:8px; }
  .eyebrow { text-transform:uppercase; letter-spacing:.08em; color:var(--accent); font-weight:700; font-size:11px; }
  .meta { display:grid; grid-template-columns:180px 1fr; border-top:1px solid var(--line); margin-top:20px; }
  .meta div { display:contents; }
  .meta dt,.meta dd { padding:8px 0; border-bottom:1px solid var(--line); margin:0; }
  .meta dt { color:var(--muted); }
  .notice { border-left:4px solid var(--accent); background:#f2f7f5; padding:12px 14px; margin:18px 0; }
  table { width:100%; border-collapse:collapse; }
  th,td { border:1px solid var(--line); padding:8px; text-align:left; vertical-align:top; }
  th { background:#f4f5f1; }
  .signature { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:40px; }
  .line { border-top:1px solid #333; padding-top:8px; margin-top:48px; }
  .page-break { break-before:page; }
  @media print {
    body { background:white; }
    .page { width:auto; margin:0; box-shadow:none; padding:18mm; }
  }
</style>
</head>
<body>
<section class="page">
  <div class="eyebrow">Draft commercial pack</div>
  <h1>FreshContext Service Order</h1>
  <p><strong>DRAFT — NOT EXECUTED</strong></p>
  <dl class="meta">
    <div><dt>Application</dt><dd>${h.app}</dd></div>
    <div><dt>Service order</dt><dd>${h.serviceOrderId}</dd></div>
    <div><dt>Service</dt><dd>${h.service}</dd></div>
    <div><dt>Client</dt><dd>${h.client}</dd></div>
    <div><dt>Supplier</dt><dd>${h.supplier}</dd></div>
    <div><dt>Issue date</dt><dd>${h.date}</dd></div>
  </dl>
  <div class="notice">Operational draft only. Jurisdiction-specific legal terms and tax treatment must be confirmed before formal issue where applicable.</div>
  <h2>Scope</h2><p>${h.scope}</p>
  <h2>Deliverables</h2>${htmlList(service.deliverables)}
  <h2>Commercial terms</h2>
  <p>Fee before any legally applicable tax treatment: <strong>${h.fee}</strong><br>
  Commencement deposit: <strong>${h.depositPercent}% — ${h.deposit}</strong><br>
  Remaining balance: <strong>${h.balance}</strong></p>
  <p>Work begins only after the required agreement is signed and the required commencement payment is confirmed as cleared. A payment screenshot or remittance advice is not by itself confirmation of cleared funds.</p>
  <h2>Acceptance</h2>${htmlList(service.acceptance)}
  <h2>Out of scope unless added in writing</h2>${htmlList(service.outOfScope)}
  <h2>IP boundary</h2>
  <p>Historical FreshContext material already released under MIT remains subject to those historical rights. Pre-existing FreshContext technology, methods, know-how, reusable components and general improvements remain Background IP unless an executed agreement expressly states otherwise.</p>
  <div class="signature">
    <div><div class="line">Client authorized representative / date</div></div>
    <div><div class="line">${h.supplier} / date</div></div>
  </div>
</section>

<section class="page page-break">
  <div class="eyebrow">Draft invoice</div>
  <h1>${h.invoiceId}</h1>
  <dl class="meta">
    <div><dt>Application</dt><dd>${h.app}</dd></div>
    <div><dt>Service order</dt><dd>${h.serviceOrderId}</dd></div>
    <div><dt>Bill to</dt><dd>${h.client}</dd></div>
    <div><dt>Invoice date</dt><dd>${h.date}</dd></div>
    <div><dt>Due date</dt><dd>${h.dueDate}</dd></div>
  </dl>
  <h2>Description</h2>
  <p>Commencement deposit for ${h.service}</p>
  <p>${h.scope}</p>
  <table>
    <thead><tr><th>Item</th><th>Amount</th></tr></thead>
    <tbody>
      <tr><td>Total agreed fee before legally applicable tax treatment</td><td>${h.fee}</td></tr>
      <tr><td>Commencement deposit (${h.depositPercent}%)</td><td><strong>${h.deposit}</strong></td></tr>
      <tr><td>Remaining contractual balance</td><td>${h.balance}</td></tr>
      <tr><td>Tax/VAT</td><td>TO BE CONFIRMED BEFORE FORMAL ISSUE</td></tr>
    </tbody>
  </table>
  <div class="notice"><strong>Do not pay this draft.</strong> Banking/payment details belong only on the formally issued invoice or another approved channel. Use payment reference <strong>${h.app}</strong>.</div>
</section>

<section class="page page-break">
  <div class="eyebrow">Draft acceptance schedule</div>
  <h1>${h.acceptanceId}</h1>
  <p>Only the expected behavior in the final approved acceptance schedule controls acceptance.</p>
  <table>
    <thead><tr><th>ID</th><th>Scenario / requirement</th><th>Input / evidence</th><th>Expected result</th><th>Pass</th></tr></thead>
    <tbody>
      ${service.acceptance.map((item,index)=>`<tr><td>A-${String(index+1).padStart(2,"0")}</td><td>${escapeHtml(item)}</td><td></td><td></td><td>□</td></tr>`).join("")}
      <tr><td>C-01</td><td>Client-specific</td><td></td><td></td><td>□</td></tr>
      <tr><td>C-02</td><td>Client-specific</td><td></td><td></td><td>□</td></tr>
    </tbody>
  </table>
  <div class="notice">FreshContext evaluates context integrity and decision readiness. It does not certify truth, compliance, model safety, or business outcomes.</div>
</section>
</body>
</html>
`;

fs.writeFileSync(path.join(output, "06_transaction_pack.html"), html);

console.log(JSON.stringify({
  ok: true,
  output,
  application,
  service: service.name,
  service_order_id: serviceOrderId,
  invoice_id: invoiceId,
  acceptance_id: acceptanceId,
  deposit_amount: depositAmount,
  currency
}, null, 2));
