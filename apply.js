/* FreshContext commercial application helper.
 *
 * This page intentionally has no application backend yet. It prepares a
 * structured, trackable email locally in the visitor's browser. Nothing leaves
 * the page until the visitor chooses to send that email.
 */
(function () {
  "use strict";

  var form = document.getElementById("commercial-application");
  if (!form) return;

  var prepared = document.getElementById("prepared-application");
  var referenceEl = document.getElementById("application-reference");
  var serviceEl = document.getElementById("application-service");
  var summaryEl = document.getElementById("application-summary");
  var emailLink = document.getElementById("application-email");
  var printButton = document.getElementById("application-print");
  var serviceSelect = document.getElementById("service");

  var services = {
    "assessment": "Context Integrity Assessment",
    "single-workflow": "Single-Workflow Integration",
    "private-multi": "Private / Multi-Workflow Implementation",
    "build-to-spec": "Build-to-Spec Implementation"
  };

  function randomHex(bytes) {
    var values = new Uint8Array(bytes);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(values);
    } else {
      for (var i = 0; i < values.length; i += 1) {
        values[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.prototype.map.call(values, function (value) {
      return value.toString(16).padStart(2, "0");
    }).join("").toUpperCase();
  }

  function applicationReference() {
    if (form.dataset.applicationReference) return form.dataset.applicationReference;

    var now = new Date();
    var date = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, "0"),
      String(now.getUTCDate()).padStart(2, "0")
    ].join("");

    var reference = "FC-APP-" + date + "-" + randomHex(3);
    form.dataset.applicationReference = reference;
    return reference;
  }

  function value(name) {
    var field = form.elements.namedItem(name);
    return field ? String(field.value || "").trim() : "";
  }

  function buildSummary(reference) {
    var serviceKey = value("service");
    var serviceName = services[serviceKey] || serviceKey;

    return [
      "FRESHCONTEXT COMMERCIAL APPLICATION",
      "",
      "Application reference: " + reference,
      "Service: " + serviceName,
      "",
      "APPLICANT",
      "Company / organisation: " + value("company"),
      "Name: " + value("name"),
      "Work email: " + value("email"),
      "Role: " + value("role"),
      "",
      "WORKFLOW",
      "Workflow:",
      value("workflow"),
      "",
      "Current stack:",
      value("stack"),
      "",
      "Context failure / risk:",
      value("failure"),
      "",
      "Acceptance target:",
      value("acceptance"),
      "",
      "CONSTRAINTS",
      "Timeline: " + value("timeline"),
      "Environment: " + value("environment"),
      "Data sensitivity: " + value("sensitivity"),
      "Commercial authority: " + value("authority"),
      "",
      "COMMERCIAL ACKNOWLEDGEMENT",
      "This application is non-binding. Work begins only after the required commercial agreement is signed and any commencement deposit stated on the issued invoice has cleared.",
      "",
      "Prepared at: " + new Date().toISOString()
    ].join("\n");
  }

  function prepare() {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var reference = applicationReference();
    var serviceName = services[value("service")] || value("service");
    var summary = buildSummary(reference);
    var subject = "FreshContext application " + reference + " — " + serviceName;

    referenceEl.textContent = reference;
    serviceEl.textContent = serviceName;
    summaryEl.textContent = summary;
    emailLink.href = "mailto:immanuel@freshcontext.dev?subject=" +
      encodeURIComponent(subject) + "&body=" + encodeURIComponent(summary);

    prepared.hidden = false;
    prepared.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  var requestedService = new URLSearchParams(window.location.search).get("service");
  if (requestedService && services[requestedService]) {
    serviceSelect.value = requestedService;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    prepare();
  });

  if (printButton) {
    printButton.addEventListener("click", function () {
      window.print();
    });
  }
})();
