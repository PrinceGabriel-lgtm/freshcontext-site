// Retires the old Cloudflare Pages copy of this site.
//
// This repository deploys twice: as the `freshcontext-site` Worker behind
// freshcontext.dev (wrangler.jsonc), and, still connected from before that move,
// to a Cloudflare Pages project on *.pages.dev. Two live copies of one site split
// search ranking and links, and the stale one can show old terms or privacy text.
//
// Pages runs this file on every request; the Worker never does (it serves static
// assets only, and .assetsignore keeps this folder out of its bundle). So every
// *.pages.dev request, previews included, is sent permanently to the same path on
// the real domain, and freshcontext.dev itself is untouched.
const CANONICAL = "https://freshcontext.dev";

function target(url) {
  const u = new URL(url);
  if (!u.hostname.endsWith(".pages.dev")) return null;
  return `${CANONICAL}${u.pathname}${u.search}`;
}

export async function onRequest({ request, next }) {
  const to = target(request.url);
  return to ? Response.redirect(to, 301) : next();
}
