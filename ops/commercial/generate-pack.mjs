#!/usr/bin/env node

// RETIRED SAFETY BOUNDARY
//
// This generator was built around a September 2026 commercial catalog and incomplete draft
// transaction paper. FreshContext's current commercial offer, commencement-payment rules and
// legal/document-control boundary have since changed. Keeping executable generation here would
// allow an old service token or deposit default to produce a document that looks current.
//
// Transaction-document automation stays disabled until a current customer-facing agreement /
// order / SOW has been approved for external use and a versioned generator is deliberately
// reintroduced against that approved source. Do not replace this refusal with current prices alone:
// price accuracy does not cure incomplete legal terms or authority/versioning defects.

console.error([
  "FreshContext commercial pack generator is RETIRED and intentionally disabled.",
  "It must not generate or issue a Service Order, SOW, invoice pack or cover email.",
  "Use the current approved commercial workflow and transaction documents only after legal/commercial review.",
].join("\n"));
process.exit(1);
