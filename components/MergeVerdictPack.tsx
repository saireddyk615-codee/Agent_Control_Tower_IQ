import type { FixResult, ScanResult } from "@/types/security";

const reviewerChecklist = [
  "Verify generated patch compiles",
  "Confirm upload file types are business-approved",
  "Add security regression tests",
  "Review policy evidence before merge",
];

export function MergeVerdictPack({ scan, fix }: { scan: ScanResult; fix?: FixResult | null }) {
  const blockingIssues = scan.issues.filter(
    (issue) => issue.severity === "critical" || issue.severity === "high",
  );
  const policyEvidenceCount = scan.issues.reduce(
    (count, issue) => count + issue.citations.length,
    0,
  );
  const riskAfter = fix?.riskScoreAfter ?? scan.riskScore;
  const reduction =
    fix && fix.riskScoreBefore > 0
      ? Math.round(((fix.riskScoreBefore - fix.riskScoreAfter) / fix.riskScoreBefore) * 100)
      : 0;

  let verdict = "Block until fixed";
  let reason = "Critical or high severity findings require remediation before merge.";
  if (fix && riskAfter > 70) {
    reason = "Modeled residual risk remains above the release threshold.";
  } else if (fix?.humanReviewRequired) {
    verdict = "Review required";
    reason = "Suggested fixes reduced risk, but the generated patch and controls require human review.";
  } else if (fix && riskAfter <= 30 && blockingIssues.length === 0) {
    verdict = "Approve with caution";
    reason = "Modeled residual risk is low and no high-risk issue remains.";
  }

  const fields = [
    ["Risk score before", `${scan.riskScore}/100`],
    ["Risk score after", `${riskAfter}/100`],
    ["Risk reduction", `${reduction}%`],
    ["Blocking issues", `${blockingIssues.length}`],
    ["Policy evidence", `${policyEvidenceCount} citations`],
    ["Compliance mappings", `${scan.issues.length * 5}`],
    ["Human review required", fix?.humanReviewRequired === false ? "No" : "Yes"],
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-500/10 via-[#0c1424] to-blue-500/10 p-7 sm:p-9">
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
              Merge Verdict Pack
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">{verdict}</h2>
            <p className="mt-4 leading-7 text-slate-400">{reason}</p>
          </div>
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-bold text-amber-100">
            Final verdict
          </span>
        </div>

        <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {fields.map(([label, value]) => (
            <div className="rounded-xl border border-white/10 bg-black/15 p-4" key={label}>
              <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-2 font-semibold text-white">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-red-400/15 bg-red-400/5 p-5">
            <h3 className="font-semibold text-white">Blocking issues before fix</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              {blockingIssues.map((issue) => (
                <li key={issue.id}>• {issue.title}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-blue-400/15 bg-blue-400/5 p-5">
            <h3 className="font-semibold text-white">Reviewer checklist</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              {reviewerChecklist.map((item) => (
                <li key={item}>□ {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
