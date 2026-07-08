// Single source of version truth. This site sells staleness detection, so it must never
// hardcode a package version (staleness law). At page load, fetch the currently published
// freshcontext-mcp version from npm and inject it into every [data-npm-version] element.
// On failure, the "latest" placeholder is left in place — never a stale number.
(function () {
  var els = document.querySelectorAll("[data-npm-version]");
  if (!els.length) return;
  fetch("https://registry.npmjs.org/freshcontext-mcp/latest")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (d && typeof d.version === "string") {
        els.forEach(function (el) { el.textContent = d.version; });
      }
    })
    .catch(function () { /* keep the placeholder */ });
})();
