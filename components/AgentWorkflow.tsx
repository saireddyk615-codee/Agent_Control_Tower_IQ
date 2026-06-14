const explanation = [
  {
    label: "Problem",
    title: "Faster code can mean faster risk",
    body: "AI coding tools help developers ship faster, but insecure code can reach production faster too.",
    color: "text-red-300",
  },
  {
    label: "Solution",
    title: "A security courtroom before merge",
    body: "Red Team, Blue Team, Policy Judge, Compliance Clerk, and Release Gate agents argue one reviewable case.",
    color: "text-blue-300",
  },
  {
    label: "Outcome",
    title: "A policy-grounded merge verdict",
    body: "A Merge Verdict Pack gives reviewers the final decision, evidence, controls, and required actions.",
    color: "text-emerald-300",
  },
];

const winningSignals = [
  ["Not just vulnerability detection", "The workflow ends in a defensible merge verdict."],
  ["Multi-agent courtroom workflow", "Five specialized roles argue the security case."],
  ["Policy-grounded citations", "Every finding links back to trusted evidence."],
  ["Compliance impact", "Maps findings to enterprise security frameworks."],
  ["Human-review-first", "No auto-merge and explicit residual risk."],
  ["Merge Verdict Pack", "PR comment, CI/CD gate, SARIF, checklist, and final verdict."],
];

const packArtifacts = [
  "Security Findings",
  "Policy Evidence",
  "Safe Attack Replay",
  "Safer Fix Diff",
  "Traceability Matrix",
  "Secure Merge Passport",
  "PR Review Comment",
  "CI/CD Gate Result",
  "SARIF Preview",
  "Compliance Mapping",
];

export function AgentWorkflow() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-7 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            The 10-second explanation
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {explanation.map((item) => (
              <article className="panel rounded-2xl p-6" key={item.label}>
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${item.color}`}>
                  {item.label}
                </p>
                <h2 className="mt-3 text-xl font-semibold text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-24 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            Why this is different
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            A courtroom workflow, not another scanner
          </h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {winningSignals.map(([title, body]) => (
              <article className="panel rounded-2xl p-5" key={title}>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="panel rounded-3xl p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Merge Verdict Pack
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Everything the release gate needs to decide
          </h2>
          <p className="mt-4 leading-7 text-slate-400">
            The product does not stop at alerts. It packages security reasoning into a complete
            review and delivery handoff.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {packArtifacts.map((artifact, index) => (
              <div
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-slate-300"
                key={artifact}
              >
                <span className="text-xs font-bold text-blue-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {artifact}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
