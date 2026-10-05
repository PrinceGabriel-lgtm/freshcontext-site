(() => {
  "use strict";

  const scenarios = {
    version: {
      task: {
        question: "Can a Pro workspace on v3.4 export audit logs as CSV?",
        product: "Northstar Cloud",
        plan: "Pro",
        version: "v3.4",
        region: "EU",
        date: "2026-10-05"
      },
      answer: "Yes. Pro workspaces can export audit logs as CSV.",
      source: {
        name: "Admin guide v3.1 — audit exports",
        claim: "The retrieved article says Pro includes CSV audit export. A current v3.4 release note says audit-log export moved to Enterprise.",
        published: "2026-04-15; superseded by 2026-10-01 release note",
        scope: "Northstar Cloud v3.1; Pro; all regions",
        provenance: "Synthetic first-party documentation fixture"
      },
      checks: [
        ["Identity", "PASS", "The source describes the same product and audit-log feature."],
        ["Version", "FAIL", "The carried answer is scoped to v3.1 while the task is explicitly v3.4."],
        ["Plan", "FAIL", "The current v3.4 authority places export on Enterprise, not Pro."],
        ["Geography", "PASS", "No regional difference is asserted for this feature."],
        ["Time", "FAIL", "A later authoritative release note changes the applicable product state."],
        ["Provenance", "PASS", "The fixture preserves the source role and publication dates used for review."]
      ],
      verdict: "CHANGED",
      summary: "The answer remains topically relevant, but the version and plan boundaries no longer fit the decision being made.",
      next: "Hold the carried answer. Use the current v3.4 authority or escalate if the customer environment differs from the documented release state."
    },
    region: {
      task: {
        question: "How long are support transcripts retained for an EU Pro workspace?",
        product: "Northstar Cloud",
        plan: "Pro",
        version: "v3.4",
        region: "EU",
        date: "2026-10-05"
      },
      answer: "Support transcripts are retained for 90 days.",
      source: {
        name: "Support retention policy — US",
        claim: "The retrieved policy states 90 days for US workspaces. The EU policy states 30 days for the same plan.",
        published: "2026-09-20",
        scope: "Northstar Cloud; Pro; United States",
        provenance: "Synthetic first-party policy fixture"
      },
      checks: [
        ["Identity", "PASS", "The policy concerns the same product and support-transcript data."],
        ["Version", "PASS", "The policy applies to the current service version."],
        ["Plan", "PASS", "The policy explicitly covers Pro."],
        ["Geography", "FAIL", "The supplied context is scoped to the United States while the task is for the EU."],
        ["Time", "PASS", "Both regional policies are current at the decision date."],
        ["Provenance", "PASS", "The regional policy identity is explicit rather than inferred from semantic similarity."]
      ],
      verdict: "CHANGED",
      summary: "The answer is relevant to retention policy, but it belongs to the wrong geography and would produce the wrong operational answer for the EU customer.",
      next: "Reject the US-scoped answer for this task and use the EU authority before responding or acting."
    },
    conflict: {
      task: {
        question: "Can Enterprise admins export a complete 12-month audit log?",
        product: "Northstar Cloud",
        plan: "Enterprise",
        version: "v3.4",
        region: "Global",
        date: "2026-10-05"
      },
      answer: "Yes. Enterprise admins can export a complete 12-month audit log.",
      source: {
        name: "Two current authoritative sources",
        claim: "The admin guide says 12-month export is available. The current data-governance policy says downloadable exports are limited to 90 days while 12 months remains view-only.",
        published: "2026-10-02 and 2026-10-03",
        scope: "Northstar Cloud v3.4; Enterprise; global",
        provenance: "Two synthetic first-party authority fixtures"
      },
      checks: [
        ["Identity", "PASS", "Both sources concern the same product capability."],
        ["Version", "PASS", "Both sources are scoped to v3.4."],
        ["Plan", "PASS", "Both sources explicitly cover Enterprise."],
        ["Geography", "PASS", "Neither source introduces a conflicting regional boundary."],
        ["Time", "PASS", "Both sources are current at the decision date."],
        ["Authority conflict", "REVIEW", "Two current first-party sources disagree on export depth; relevance cannot resolve that conflict."]
      ],
      verdict: "UNRESOLVED",
      summary: "The context matches the task, but the available authorities conflict. Choosing either answer automatically would manufacture certainty.",
      next: "Escalate the source conflict for adjudication. Preserve both authorities and do not silently select the answer that happens to rank higher."
    },
    current: {
      task: {
        question: "Can an Enterprise workspace on v3.4 export audit logs as CSV?",
        product: "Northstar Cloud",
        plan: "Enterprise",
        version: "v3.4",
        region: "EU",
        date: "2026-10-05"
      },
      answer: "Yes. Enterprise workspaces on v3.4 can export audit logs as CSV.",
      source: {
        name: "Admin guide v3.4 — audit exports",
        claim: "Audit-log CSV export is available to Enterprise workspaces on v3.4.",
        published: "2026-10-01",
        scope: "Northstar Cloud v3.4; Enterprise; all regions",
        provenance: "Synthetic first-party documentation fixture"
      },
      checks: [
        ["Identity", "PASS", "The source describes the exact product capability being asked about."],
        ["Version", "PASS", "The source and task are both scoped to v3.4."],
        ["Plan", "PASS", "The source explicitly grants the capability to Enterprise."],
        ["Geography", "PASS", "The source applies across regions, including the EU task context."],
        ["Time", "PASS", "The source is current at the stated decision date."],
        ["Provenance", "PASS", "The source role, publication date and applicability scope are explicit."]
      ],
      verdict: "CURRENT",
      summary: "The supported claim matches the task across identity, version, plan, geography, time and provenance boundaries.",
      next: "The context is appropriate to rely on for this bounded task, subject to the normal caveat that source integrity does not guarantee source truth."
    }
  };

  const byId = (id) => document.getElementById(id);
  const checksBody = byId("checks-body");
  const recordNode = byId("evidence-record");
  const scenarioButtons = [...document.querySelectorAll("[data-scenario]")];
  const copyButton = byId("copy-record");

  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = value;
  }

  function renderChecks(checks) {
    checksBody.replaceChildren();
    for (const [boundary, state, reason] of checks) {
      const row = document.createElement("tr");
      const boundaryCell = document.createElement("td");
      const stateCell = document.createElement("td");
      const reasonCell = document.createElement("td");
      const stateLabel = document.createElement("span");

      boundaryCell.textContent = boundary;
      stateLabel.className = "proof-check-state";
      stateLabel.dataset.state = state;
      stateLabel.textContent = state;
      stateCell.append(stateLabel);
      reasonCell.textContent = reason;
      row.append(boundaryCell, stateCell, reasonCell);
      checksBody.append(row);
    }
  }

  function buildRecord(key, scenario) {
    return {
      demo: "FreshContext public synthetic proof",
      scenario: key,
      decision_date: scenario.task.date,
      task: {
        question: scenario.task.question,
        product: scenario.task.product,
        plan: scenario.task.plan,
        version: scenario.task.version,
        region: scenario.task.region
      },
      supplied_context: {
        answer: scenario.answer,
        source: scenario.source.name,
        source_scope: scenario.source.scope,
        published: scenario.source.published,
        provenance: scenario.source.provenance
      },
      checks: scenario.checks.map(([boundary, state, reason]) => ({ boundary, state, reason })),
      verdict: scenario.verdict,
      disposition: scenario.next,
      limitation: "Synthetic browser-side demonstration; not a customer audit or production FreshContext execution."
    };
  }

  function render(key) {
    const scenario = scenarios[key];
    if (!scenario) return;

    for (const button of scenarioButtons) {
      const active = button.dataset.scenario === key;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }

    setText("task-question", scenario.task.question);
    setText("task-product", scenario.task.product);
    setText("task-plan", scenario.task.plan);
    setText("task-version", scenario.task.version);
    setText("task-region", scenario.task.region);
    setText("task-date", scenario.task.date);
    setText("carried-answer", scenario.answer);
    setText("source-name", scenario.source.name);
    setText("source-claim", scenario.source.claim);
    setText("source-published", scenario.source.published);
    setText("source-scope", scenario.source.scope);
    setText("source-provenance", scenario.source.provenance);
    setText("verdict-state", scenario.verdict);
    setText("verdict-summary", scenario.summary);
    setText("verdict-next", scenario.next);

    const verdictState = byId("verdict-state");
    verdictState.dataset.state = scenario.verdict;

    renderChecks(scenario.checks);
    recordNode.textContent = JSON.stringify(buildRecord(key, scenario), null, 2);
  }

  for (const button of scenarioButtons) {
    button.addEventListener("click", () => render(button.dataset.scenario));
  }

  copyButton.addEventListener("click", async () => {
    const value = recordNode.textContent || "";
    try {
      await navigator.clipboard.writeText(value);
      copyButton.textContent = "Copied";
    } catch {
      copyButton.textContent = "Copy unavailable";
    }
    window.setTimeout(() => { copyButton.textContent = "Copy record"; }, 1400);
  });

  render("version");
})();
