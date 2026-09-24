# Website-Only Review Release

This change publishes browser-facing presentation and explicitly synthetic evidence only.
It does not publish a private engine, intake server, customer data or receiving-bank details.

No MIT licence grant is made for these new first-party commercial website additions.
Existing historical MIT and third-party rights remain unchanged. Public source visibility
is not a representation of exclusive ownership or a withdrawal of earlier rights.

The five-record packet is a fixed-time evaluation with Core 0.5.2, not a live source check,
customer case study, independent review or certification. Its manifest is unsigned.
The JSON inputs and outputs are included; internal source-state inventories are not.

## Do Not Merge Before Release Approval

This repository can deploy production on main. This PR is a review artifact, not permission
to deploy or activate collection. The form requires a separately approved private receiver.
Without it, submission stays disabled with an email fallback. The existing live application
path remains unchanged while this PR is open.

Before release: approve privacy language, provision and test the receiving service, establish
restricted operator access, verify inbox receipt and retention, inspect desktop/mobile UI,
and obtain the owner's final deployment approval. No bank information belongs in this repo.

## Checks

HTML validation covers the nested evidence page. Tests verify exact artifact hashes and CSP
hashes, request failure behavior, retry identity, acknowledgement, accessibility and mobile
overflow. Browser tests use synthetic fixtures and mocked request responses; they are not
proof of the production receiver or of email delivery.
