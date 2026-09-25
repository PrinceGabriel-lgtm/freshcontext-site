/* FreshContext commercial application helper.
 *
 * When the form carries an intake URL and a Turnstile site key, the application is
 * submitted to intake.freshcontext.dev and the page shows the reference FreshContext
 * assigned. Without that configuration, or if submission fails, it falls back to
 * preparing a structured email locally, which the visitor chooses whether to send.
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
  var submitButton = document.getElementById("application-submit");
  var help = document.getElementById("application-help");
  var challenge = document.getElementById("application-challenge");
  var intakeUrl = form.dataset.intakeUrl || "";
  var siteKey = form.dataset.turnstileSitekey || "";
  var online = Boolean(intakeUrl && siteKey);
  var widgetId = null;
  var sending = false;

  // Human-readable explanations for the intake's reason codes.
  var reasons = {
    rate_limited: "Too many submissions from this connection. Please wait a minute and try again.",
    challenge_required: "Please complete the verification check above the button.",
    challenge_failed: "The verification check did not pass. Please try it again.",
    email_not_valid: "Please check the work email address.",
    missing_field: "Please complete every field.",
    field_too_long: "One of the answers is longer than the form allows.",
    acknowledgement_required: "Please confirm the commercial acknowledgement."
  };

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

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function prepare() {
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

  function payload() {
    var data = {};
    ["service", "company", "name", "email", "role", "workflow", "stack", "failure", "acceptance",
      "timeline", "environment", "sensitivity", "authority"].forEach(function (name) {
      data[name] = value(name);
    });
    data.acknowledgement = form.elements.namedItem("acknowledgement").checked;
    data.client_reference = applicationReference();
    data.turnstile_token = window.turnstile && widgetId !== null ? window.turnstile.getResponse(widgetId) || "" : "";
    return data;
  }

  function showReceived(result) {
    prepare();
    referenceEl.textContent = result.reference;
    summaryEl.textContent = buildSummary(result.reference);
    setText("prepared-title", "Application received.");
    setText("prepared-sub", "FreshContext has your application. Keep this reference for any later service order, invoice, payment reference or acceptance record.");
    setText("prepared-state", "Received");
    setText("application-status", "received " + new Date(result.received_at).toUTCString());
    document.getElementById("application-email-actions").hidden = true;
    var next = document.getElementById("application-next");
    if (next) next.innerHTML = "<strong>Next gate:</strong> FreshContext reviews fit and scope, then replies to your work email. Receipt is not an engagement: work begins only after an accepted scope, a signed agreement and any stated deposit.";
    form.hidden = true;
  }

  function showFallback(message) {
    prepare();
    setText("prepared-title", "Your application could not be submitted online.");
    setText("prepared-sub", message + " You can still send it by email: the draft below contains everything you entered.");
    setText("prepared-state", "Not submitted");
  }

  function submitOnline() {
    if (sending) return;
    sending = true;
    submitButton.disabled = true;
    submitButton.textContent = "Submitting…";
    fetch(intakeUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
      credentials: "omit"
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (res.status === 201 && body.reference) return showReceived(body);
        var reason = reasons[body.error];
        if (reason && res.status !== 503 && res.status !== 500) {
          help.textContent = reason;
          help.classList.add("field-error");
          return;
        }
        showFallback("The application service is unavailable right now.");
      });
    }, function () {
      showFallback("The application service could not be reached.");
    }).then(function () {
      sending = false;
      submitButton.disabled = false;
      submitButton.textContent = "Submit application";
      if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    });
  }

  // Loads the Turnstile widget only when the online path is configured.
  function startOnline() {
    submitButton.textContent = "Submit application";
    help.textContent = "Submitting sends these answers to FreshContext over HTTPS. A Cloudflare Turnstile check helps keep automated submissions out. See the privacy page for how applications are stored and when they are deleted.";
    challenge.hidden = false;
    window.onFreshContextTurnstile = function () {
      widgetId = window.turnstile.render(challenge, { sitekey: siteKey, action: "commercial_application" });
    };
    var script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onFreshContextTurnstile";
    script.async = true;
    script.onerror = function () {
      online = false;
      challenge.hidden = true;
      submitButton.textContent = "Prepare application";
      help.textContent = "Online submission is unavailable, so this page will prepare an email for you to send instead.";
    };
    document.head.appendChild(script);
  }

  var requestedService = new URLSearchParams(window.location.search).get("service");
  if (requestedService && services[requestedService]) {
    serviceSelect.value = requestedService;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (online) submitOnline();
    else prepare();
  });

  if (online) startOnline();

  if (printButton) {
    printButton.addEventListener("click", function () {
      window.print();
    });
  }
})();
