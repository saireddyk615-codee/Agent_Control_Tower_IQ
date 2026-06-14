import type { FixResult, ScanResult, SecureMergePassport } from "@/types/security";

export function PRReviewComment({
  scan,
  fix,
  passport,
}: {
  scan: ScanResult;
  fix: FixResult;
  passport: SecureMergePassport;
}) {
  const priorityFixes = scan.issues
    .filter((issue) => issue.severity === "critical" || issue.severity === "high")
    .slice(0, 3)
    .map((issue) => {
      const generated = fix.fixes.find((item) => item.issueId === issue.id);
      return `${issue.title} — ${generated?.changeSummary ?? issue.suggestedFix}`;
    });
  const evidence = scan.issues
    .flatMap((issue) => issue.citations.slice(0, 1))
    .slice(0, 3)
    .map((citation) => `${citation.policyName} ${citation.section}`);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117]">
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-4">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-500 text-xs font-bold">
          SG
        </span>
        <div>
          <p className="text-sm font-semibold text-white">secureguard-lm-iq bot</p>
          <p className="text-xs text-slate-500">GitHub-style PR review comment</p>
        </div>
      </div>
      <div className="space-y-5 p-5 text-sm leading-6 text-slate-300">
        <div>
          <h3 className="text-lg font-semibold text-white">
            SecureGuard-LM IQ Security Courtroom Review
          </h3>
          <p className="mt-2">
            Final Verdict:{" "}
            <strong className="text-amber-200">{passport.finalMergeRecommendation}</strong>
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Critical / High Findings</p>
          <ul className="mt-2 space-y-1 text-slate-400">
            {priorityFixes.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Policy Evidence</p>
          <ul className="mt-2 space-y-1 text-slate-400">
            {evidence.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Reviewer Checklist</p>
          <ul className="mt-2 space-y-1 text-slate-400">
            <li>□ Verify generated patch compiles</li>
            <li>□ Confirm upload file types are business-approved</li>
            <li>□ Add security regression tests</li>
            <li>□ Review policy evidence before merge</li>
          </ul>
        </div>
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-amber-100/80">
          <strong className="text-amber-100">Reviewer Note:</strong> Generated fixes require human
          review before production use.
        </div>
      </div>
    </section>
  );
}
