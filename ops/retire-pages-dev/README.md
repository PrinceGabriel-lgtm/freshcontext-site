# Retiring freshcontext-site.pages.dev

The old Cloudflare Pages project `freshcontext-site` still serves a three-month-old copy of
the site at freshcontext-site.pages.dev. It has **no Git connection**, so nothing pushed to
this repository reaches it. This folder is its final deployment: every path redirects (301)
to the same path on https://freshcontext.dev. `index.html` is only a fallback for a client
that ignores the redirect.

`ops/` is in `.assetsignore`, so none of this is ever served by the real site.

## Deploy it once (about two minutes)
1. Download this folder (`ops/retire-pages-dev`: `_redirects` and `index.html`).
2. Cloudflare → Workers & Pages → **freshcontext-site** (the Pages project, marked
   freshcontext-site.pages.dev) → **Create deployment** → Production → upload the folder.
3. Open https://freshcontext-site.pages.dev/privacy: it should land on
   https://freshcontext.dev/privacy.

Rollback: Deployments → an older deployment → **Rollback to this deployment**.

## Why not just delete the project
Deleting it makes every old link and search result a dead page. The redirect sends them to
the right page instead. Once search engines have moved on (a few months), deleting the
project is fine.
