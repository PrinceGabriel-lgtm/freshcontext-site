# FreshContext Commercial Pack Generator — RETIRED

**Status: RETIRED / DO NOT USE FOR CUSTOMER PAPER.**

This directory contains historical internal tooling from an earlier FreshContext commercial offer. It is excluded from Cloudflare static assets, but exclusion from the website does not make the old commercial assumptions safe to use.

The prior generator combined a September 2026 service catalog with draft Service Order, invoice, acceptance and cover-email material. FreshContext's current package names, prices, delivery targets and commencement-payment rules have changed, and automatic customer transaction-document issuance remains blocked until a current agreement/order/SOW is approved for external use.

`generate-pack.mjs` therefore **fails closed intentionally**. `catalog.json` is retained only as a machine-readable retirement marker and is not a quoting or contracting authority.

## Why it is disabled

The historical tool could create paper that looked current while relying on stale commercial assumptions, including earlier package naming and deposit defaults. Updating prices alone would not make the generated Service Order legally complete. The historical draft deliberately left governing law, tax/VAT treatment, registration details, confidentiality mechanics, warranty/liability terms, disputes and other transaction terms unresolved.

That combination creates avoidable contract, authority and litigation risk. The safe boundary is to disable generation rather than silently modernize only the numbers.

## Current operating boundary

- Public commercial references are published at `https://freshcontext.dev/pricing`.
- A public price/package page is not itself an executed contract.
- A current customer-facing agreement/order/SOW must be approved before automated transaction-paper issuance is restored.
- Customer authority, scope, data/source rights, legal/security review and payment terms must be resolved through the current commercial workflow.
- Proof of payment is not confirmation of cleared funds.
- Work does not begin until the required signed terms and actual cleared commencement payment are recorded under the approved workflow.

## Reintroduction requirements

Do not re-enable this generator by deleting the refusal or merely updating `catalog.json`. A replacement must, at minimum:

1. consume a versioned approved commercial catalog;
2. bind the generated artifact to that exact catalog and transaction-template version;
3. use a current externally approved agreement/order/SOW source;
4. enforce pricing floors and authorized payment schedules;
5. fail closed on legal/security/custom-scope exceptions;
6. preserve immutable content hashes and approval evidence;
7. distinguish draft preparation from formal issue;
8. have tests proving stale applications or old service tokens cannot silently adopt current terms.

Historical FreshContext code already released under the MIT License remains subject to those historical rights. This retirement does not change those grants.
