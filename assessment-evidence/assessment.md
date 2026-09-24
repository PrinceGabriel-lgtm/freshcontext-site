# Supplier knowledge handoff

SYNTHETIC DEMONSTRATION | 2026-09-24T12:00:00Z | freshcontext-mcp@0.5.2

Five invented records for a bounded knowledge-workflow demonstration. No customer, source authentication or answer-quality experiment.

| Record | Decision | Freshness at retrieval | Provenance | Handoff |
|---|---|---|---|---|
| recent | use_first | 98 | complete | allowed with label |
| untraceable | use_first | 98 | unknown | review required |
| historical | use_as_background | 0 | complete | allowed with label |
| undated | needs_verification | unknown | partial | review required |
| failed | exclude | unknown | unknown | review required |

## Evidence

### recent

Source: synthetic:operating-note

Input SHA-256: 072f82b13d83b6c33ed722961c571cd695ef92beef1d034e340ca72dd043854d

Retrieval age at evaluation: 0 hours.

- Strong semantic match and current freshness for user_provided.
- source profile local_custom uses balanced date policy
- intent profile business_due_diligence selected

Action: Use this near the top of the context bundle.

### untraceable

Source: unknown

Input SHA-256: e84cd97ba94f4aba938714dddd7ab9bac234cd8920190f0cddce96a98482f008

Retrieval age at evaluation: 0 hours.

- Strong semantic match and current freshness for user_provided.
- source profile local_custom uses balanced date policy
- intent profile business_due_diligence selected

Action: Use this near the top of the context bundle.

### historical

Source: synthetic:policy-2019

Input SHA-256: 2596d97bc660b131a7e15f10cfadbfcec887542239818ff9882d3e33ba2aab2c

Retrieval age at evaluation: 0 hours.

- Relevant signal, but stale for user_provided.
- source profile local_custom uses balanced date policy
- intent profile business_due_diligence selected

Action: Use it for framing, history, or background rather than as the main current source.

### undated

Source: synthetic:implementation-note

Input SHA-256: bf00a9575a3f8f12c56aa1b0a110a347e0ed9b13e583e564411891870c05dcaf

Retrieval age at evaluation: 0 hours.

- Missing freshness data for user_provided; ranked mostly by semantic relevance.
- timestamp confidence is unknown; utility reduced to zero
- source profile local_custom uses balanced date policy
- intent profile business_due_diligence selected

Action: Verify the source details before citing it, acting on it, or sending it to a model as trusted context.

### failed

Source: synthetic:unavailable-record

Input SHA-256: a376270f3d8bfb918a7d55099023737453202a1de364124c2b0684f1a9fb09fb

Retrieval age at evaluation: 0 hours.

- Missing freshness data for user_provided; ranked mostly by semantic relevance.
- content looked like failed adapter output; status set to failed
- timestamp confidence is unknown; utility reduced to zero
- signal status is failed; utility reduced to zero
- source profile local_custom uses balanced date policy
- intent profile business_due_diligence selected

Action: Keep it out of the final context bundle unless a human explicitly reviews it.

## Review

Human review: REQUIRED. Customer acceptance: NOT RECORDED.

Changed records: none. Removed: none.

- Caller supplies dates, status and relevance; this run does not retrieve or authenticate sources.
- Core freshness is publication-to-retrieval, not necessarily publication-to-evaluation. Inspect retrieval_age_hours and review_flags before relying on a captured source as current.
- Metadata completeness and handoff-safe status do not prove truth, current validity, ownership or legal compliance.
- Known-old context may be allowed as background. No answer-quality or business-outcome improvement is measured.
- Profile settings are legacy engine behavior, not customer-validated calibration.
- This packet is unsigned. Hashes support byte comparison only; preserve a trusted copy separately.
- Interpretation, fit map, recommendation, walkthrough and acceptance require people.
