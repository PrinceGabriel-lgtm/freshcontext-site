/* FreshContext — shared site behaviour.
 *
 * Everything the public site does at runtime is in this file. It replaces
 * version.js and the two inline onclick handlers that used to sit in
 * index.html, because `script-src 'self'` cannot hold while any inline
 * handler remains.
 *
 * Two behaviours, both progressive: if this file never loads, every page still
 * renders and every command is still readable and selectable by hand.
 */
(function () {
  "use strict";

  /* ── published version ──────────────────────────────────────────────────
   * The site sells staleness detection, so it must never hardcode a package
   * version. Every [data-npm-version] element is filled from the registry at
   * load. On any failure the "latest" placeholder stays — a placeholder is
   * honest, a stale number is not.
   *
   * This is the only outbound request the site makes, which is what lets the
   * CSP name registry.npmjs.org specifically instead of allowing https:.
   */
  function versions() {
    var els = document.querySelectorAll("[data-npm-version]");
    if (!els.length) return;
    fetch("https://registry.npmjs.org/freshcontext-mcp/latest", { mode: "cors" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || typeof d.version !== "string") return;
        Array.prototype.forEach.call(els, function (el) { el.textContent = d.version; });
      })
      .catch(function () { /* placeholder stands */ });
  }

  /* ── copy to clipboard ──────────────────────────────────────────────────
   * Delegated, so a button added later needs no wiring. The text comes from
   * the <pre> inside the same .cmd block rather than from an attribute, so the
   * thing copied is by construction the thing displayed — they cannot drift.
   */
  function copying() {
    document.addEventListener("click", function (ev) {
      var btn = ev.target.closest ? ev.target.closest(".copy") : null;
      if (!btn) return;

      var block = btn.closest(".cmd");
      var pre = block && block.querySelector("pre");
      if (!pre) return;

      var text = pre.textContent.trim();
      var done = function (ok) {
        var was = btn.textContent;
        btn.textContent = ok ? "Copied" : "Select and copy";
        window.setTimeout(function () { btn.textContent = was; }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });
  }

  function start() { versions(); copying(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
