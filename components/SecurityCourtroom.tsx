import type { FixResult, ScanResult } from "@/types/security";

const roles = [
  {
    agent: "Red Team Agent",
    title: "Risk Argument",
    purpose: "Explains how the issue could be abused using safe simulated reasoning.",
    color: "border-red-400/20 bg-red-400/5 text-red-300",
  },
  {
    agent: "Blue Team Agent",
    title: "Fix Argument",
    purpose: "Explains how the suggested remediation reduces risk.",
    color: "border-emerald-400/20 bg-emerald-400/5 text-emerald-300",
  },
  {
    agent: "Policy Judge Agent",
    title: "Policy Evidence",
    purpose: "Uses Foundry IQ-compatible policy citations to support the decision.",
    color: "border-blue-400/20 bg-blue-400/5 text-blue-300",
  },
  {
    agent: "Compliance Clerk Agent",
    title: "Compliance Impact",
    purpose: "Maps findings to OWASP, CWE, NIST SSDF, SOC 2 / Secure SDLC, and ISO 27001.",
    color: "border-violet-400/20 bg-violet-400/5 text-violet-300",
  },
  {
    agent: "Release Gate Agent",
    title: "Merge Verdict",
    purpose: "Decides Approve with caution, Review required, or Block until fixed.",
    color: "border-amber-400/20 bg-amber-400/5 text-amber-300",
  },
];

export function SecurityCourtroom({ scan, fix }: { scan: ScanResult; fix?: FixResult | null }) {
  const language = scan.detectedLanguage ?? "generic";
  const evidenceCount = scan.issues.reduce((count, issue) => count + issue.citations.length, 0);
  const highRiskCount = scan.issues.filter(
    (issue) => issue.severity === "critical" || issue.severity === "high",
  ).length;
  const verdict = fix ? "Review required" : scan.mergeRecommendation;
  const roleResults = [
    `${highRiskCount} critical/high ${language} arguments prepared from ${scan.issues.length} findings.`,
    fix
      ? `${fix.fixes.length} ${language}-specific remediation arguments generated; modeled risk is ${fix.riskScoreAfter}/100.`
      : `Awaiting ${language}-specific remediation guidance before the defense presents its argument.`,
    `${evidenceCount} policy citations admitted as evidence.`,
    `${scan.issues.length} findings mapped across enterprise security frameworks.`,
    `Current release-gate verdict: ${verdict}.`,
  ];

  return (
    <section className="mt-10">
      <div className="mb-6 max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
          Security Courtroom
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Five agents argue the case before merge
        </h2>
        <p className="mt-4 leading-7 text-slate-400">
          Red-team risk, blue-team remediation, policy evidence, compliance impact, and the release
          gate are presented as one reviewable reasoning chain.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {roles.map((role, index) => (
          <article className={`rounded-2xl border p-5 ${role.color}`} key={role.agent}>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]">{role.agent}</p>
            <h3 className="mt-3 text-lg font-semibold text-white">{role.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{role.purpose}</p>
            <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-300">
              {roleResults[index]}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
