# FreshContext Commercial Pack Generator

Internal operating tool for turning a qualified FreshContext application into a draft transaction pack in under a minute.

The generator is intentionally **not** part of the public website. The `ops/` directory is excluded from Cloudflare static assets.

## What it creates

For a qualified application such as `FC-APP-20260921-A1B2C3`, it generates:

- `00_manifest.json` — machine-readable commercial record
- `01_service_order.md` — draft Service Order / SOW
- `02_invoice.md` — draft commencement invoice
- `03_acceptance_schedule.md` — service-specific acceptance schedule
- `04_kickoff_checklist.md` — READY_TO_START gate
- `05_cover_email.txt` — client cover email
- `06_transaction_pack.html` — printable combined Service Order + Invoice + Acceptance Schedule

## Example

```bash
node ops/commercial/generate-pack.mjs \
  --application FC-APP-20260921-A1B2C3 \
  --service single-workflow \
  --client "Example Systems (Pty) Ltd" \
  --client-email "buyer@example.com" \
  --supplier "Immanuel Gabriel" \
  --fee 4000 \
  --currency USD \
  --scope "Integrate FreshContext into the client support RAG staging workflow."
```

Default output:

```text
commercial-packs/FC-APP-20260921-A1B2C3/
```

That directory is gitignored and must not be committed.

## Operational sequence

1. Application email arrives.
2. Run the qualification checklist.
3. Confirm exact scope, fee, contracting party, acceptance owner, and data handling.
4. Generate the pack.
5. Review every generated document.
6. Complete jurisdiction-specific legal/tax fields.
7. Formally issue the Service Order and invoice.
8. Obtain required signatures.
9. Verify commencement payment as **cleared funds**.
10. Move the matter to `READY_TO_START`.
11. Begin work.
12. Test against the acceptance schedule.
13. Record acceptance, issue final invoice, close out.

## State machine

```text
APPLICATION_RECEIVED
  -> QUALIFIED
  -> SCOPE_APPROVED
  -> CONTRACT_SENT
  -> SIGNED
  -> DEPOSIT_PENDING
  -> DEPOSIT_CLEARED
  -> READY_TO_START
  -> IN_PROGRESS
  -> ACCEPTANCE_PENDING
  -> ACCEPTED
  -> FINAL_PAYMENT_DUE
  -> CLOSED
```

Alternative states: `CLARIFICATION_REQUIRED`, `DECLINED`, `PAUSED`, `CANCELLED`, `DISPUTED`.

## Safety / legal boundary

This is an operational drafting tool, **not a legal-decision engine**.

It deliberately leaves governing law, tax/VAT treatment, registration details, bank details, warranty/liability terms, confidentiality mechanics, dispute terms, and other jurisdiction-specific terms incomplete for review before formal issue.

Historical FreshContext code already released under MIT remains subject to those historical rights. The generator does not create exclusivity, assignment, or transfer of ownership.

Never put banking credentials, API keys, passwords, regulated records, or sensitive client production data into command-line arguments or committed files.
