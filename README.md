# FreshContext Site

Static public site for FreshContext.

Production:
https://freshcontext.dev/

Key pages:
- /
- /contact
- /spec
- /context-integrity
- /context-integrity-demo
- /privacy
- /terms
- /accessibility

This repo contains only the static public site. It does not contain FreshContext MCP runtime code, Worker secrets, feed workers, Ops Pulse, or private deployment credentials.

## How it deploys

A push to `main` runs `.github/workflows/verify.yml`. HTML validation, the axe
accessibility suite and the schema mirror check run first; **production deploys only
if they pass.** That ordering is the point — see the comment at the top of that file
for what it was before and why it changed.

Cloudflare Workers Builds is still connected, but its production branch is parked at
`cloudflare-production-parked` so it no longer deploys `main`. What it still does is
build every pull request into a preview URL, which is worth keeping: the checks prove
a page validates, but somebody still has to look at a contrast or layout change.

**Do not point Cloudflare's production branch back at `main`.** It re-creates a race
where the deploy lands ahead of the checks, and it looks like tidying up.

## Which commit is live

    curl https://freshcontext.dev/build.json

Written by the deploy job immediately before upload, so it answers for the version
actually being served rather than for the last run that happened to finish. The same
file is what the smoke test reads to prove a deploy landed, which is why it is
generated rather than committed.

## Checks, locally

    npm ci
    npm run check          # html-validate + axe
    npm run check:html
    npm run check:a11y

`npx wrangler deploy --dry-run` validates `wrangler.jsonc` and prints what would be
uploaded without touching production. `.assetsignore` decides that set, and it names
what it excludes rather than relying on Cloudflare skipping dot-entries by default.
