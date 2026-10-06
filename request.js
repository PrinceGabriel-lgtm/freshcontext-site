/* FreshContext request forms: the free Snapshot request (/snapshot), the audit
 * enquiry (/contact#audit), and the partner referral (/partners).
 *
 * Each form names its service in data-service and posts JSON to the private intake
 * Worker (intake.freshcontext.dev), behind a Cloudflare Turnstile check. The intake
 * accepts these short forms and stores the questions they do not ask as empty
 * answers. Partner referrals deliberately reuse the existing `audit` service contract;
 * a bounded source slug can be prefixed to the workflow text without widening the
 * intake API or adding a second data store.
 *
 * If Turnstile or the intake cannot be reached, the page prepares an email instead,
 * which the visitor chooses whether to send: nothing is lost and nothing is sent
 * without them.
 */
(function () {
  "use strict";

  var reasons = {
    rate_limited: "Too many requests from this connection. Please wait a minute and try again.",
    challenge_required: "Please complete the verification check above the button.",
    challenge_failed: "The verification check did not pass. Please try it again.",
    email_not_valid: "Please check the work email address.",
    missing_field: "Please fill in every field that isn't marked optional.",
    field_too_long: "One of the answers is longer than the form allows.",
    acknowledgement_required: "Please tick the box above the button.",
    help_centre_url_required: "Please give the public help-centre address, starting with https:// (for example https://help.yourcompany.com/)."
  };
  var titles = { snapshot: "Snapshot request", audit: "Audit enquiry" };
  var turnstileLoaded = null;

  function randomHex(bytes) {
    var values = new Uint8Array(bytes);
    window.crypto.getRandomValues(values);
    return Array.prototype.map.call(values, function (v) { return v.toString(16).padStart(2, "0"); }).join("").toUpperCase();
  }
  function today() {
    var d = new Date();
    return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, "0") + String(d.getUTCDate()).padStart(2, "0");
  }

  function sourceFromQuery(form) {
    var param = String(form.dataset.sourceParam || "").trim();
    if (!param) return "";
    var value = String(new URLSearchParams(window.location.search).get(param) || "").trim().toLowerCase();
    // Attribution is deliberately a short opaque campaign/partner slug, not arbitrary
    // query-string content. This keeps the intake record bounded and avoids using the
    // referral URL as a covert free-text field.
    return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value) ? value : "";
  }

  // One Turnstile script for the page, however many forms it has.
  function loadTurnstile() {
    if (turnstileLoaded) return turnstileLoaded;
    turnstileLoaded = new Promise(function (resolve, reject) {
      window.onFreshContextTurnstile = function () { resolve(window.turnstile); };
      var script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onFreshContextTurnstile";
      script.async = true;
      script.onerror = function () { reject(new Error("turnstile unavailable")); };
      document.head.appendChild(script);
    });
    return turnstileLoaded;
  }

  function setup(form) {
    var service = form.dataset.service;
    var title = form.dataset.title || titles[service] || "Enquiry";
    var source = sourceFromQuery(form);
    var card = form.parentElement;
    var done = card.querySelector("[data-done]");
    var help = form.querySelector("[data-help]");
    var challenge = form.querySelector("[data-challenge]");
    var submit = form.querySelector("[data-submit]");
    var label = submit.dataset.label;
    var intakeUrl = form.dataset.intakeUrl || "";
    var siteKey = form.dataset.turnstileSitekey || "";
    var online = Boolean(intakeUrl && siteKey && window.fetch && window.Promise);
    var widgetId = null;
    var sending = false;
    var reference = "FC-APP-" + today() + "-" + randomHex(3);

    function field(name) {
      var el = form.elements.namedItem(name);
      return el ? String(el.value || "").trim() : "";
    }

    // The intake's contract: the Snapshot's URL and note travel together in `workflow`.
    // Partner referral attribution is carried inside the same bounded workflow field so
    // no new backend schema, cookie, analytics identifier or third-party tracker is needed.
    function payload() {
      var workflow = field("workflow");
      if (service === "snapshot") {
        workflow = field("url");
        if (field("note")) workflow += "\n\nNote: " + field("note");
      }
      if (source) workflow = "Partner referral source: " + source + "\n\n" + workflow;
      return {
        service: service,
        company: field("company"),
        name: field("name"),
        email: field("email"),
        role: field("role"),
        workflow: workflow,
        acknowledgement: form.elements.namedItem("acknowledgement").checked,
        client_reference: reference,
        turnstile_token: window.turnstile && widgetId !== null ? window.turnstile.getResponse(widgetId) || "" : ""
      };
    }

    function say(text, isError) {
      help.textContent = text;
      help.classList.toggle("field-error", Boolean(isError));
    }

    function finish(ref, mailBody) {
      done.querySelector("[data-reference]").textContent = ref;
      var mail = done.querySelector("[data-mail-actions]");
      if (mailBody) {
        done.querySelector("[data-done-title]").textContent = "It couldn't be sent online.";
        done.querySelector("[data-done-text]").textContent =
          "Your " + title.toLowerCase() +
          " is ready as an email: open it, check it, and press send. Nothing has been sent yet.";
        done.querySelector("[data-mail]").href = "mailto:immanuel@freshcontext.dev?subject=" +
          encodeURIComponent("FreshContext " + title + " " + ref) + "&body=" + encodeURIComponent(mailBody);
        mail.hidden = false;
      }
      form.hidden = true;
      done.hidden = false;
      done.focus();
    }

    function emailDraft() {
      var p = payload();
      return [
        "FRESHCONTEXT " + title.toUpperCase(),
        "Reference: " + reference,
        "",
        "Name: " + p.name,
        "Work email: " + p.email,
        "Company: " + p.company,
        "Role: " + p.role,
        "",
        p.workflow
      ].join("\n");
    }

    function send() {
      if (sending) return;
      sending = true;
      submit.disabled = true;
      submit.textContent = "Sending…";
      fetch(intakeUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
        credentials: "omit"
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (res.status === 201 && body.reference) return finish(body.reference, null);
          var reason = reasons[body.error];
          if (reason && res.status < 500) return say(reason, true);
          finish(reference, emailDraft());
        });
      }, function () {
        finish(reference, emailDraft());
      }).then(function () {
        sending = false;
        submit.disabled = false;
        submit.textContent = label;
        if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (online) send();
      else finish(reference, emailDraft());
    });

    if (!online) {
      say("Online sending is unavailable here, so the form will prepare an email for you to send.");
      return;
    }
    challenge.hidden = false;
    loadTurnstile().then(function (turnstile) {
      widgetId = turnstile.render(challenge, {
        sitekey: siteKey,
        action: "commercial_application",
        // A widget that cannot run (blocked frame, unknown host) must not trap the visitor.
        "error-callback": function () {
          online = false;
          challenge.hidden = true;
          say("The verification check could not load, so the form will prepare an email for you to send instead.");
        }
      });
    }, function () {
      online = false;
      challenge.hidden = true;
      say("Online sending is unavailable right now, so the form will prepare an email for you to send.");
    });
  }

  function start() {
    Array.prototype.forEach.call(document.querySelectorAll("form[data-service]"), setup);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
