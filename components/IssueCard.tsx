import type { SecurityIssue, Severity } from "@/types/security";

const severityStyles: Record<Severity, string> = {
  critical: "border-red-400/30 bg-red-400/10 text-red-200",
  high: "border-orange-400/30 bg-orange-400/10 text-orange-200",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  low: "border-blue-400/30 bg-blue-400/10 text-blue-200",
};

export function IssueCard({ issue }: { issue: SecurityIssue }) {
  const confidence = issue.confidence
    ? `${issue.confidence[0].toUpperCase()}${issue.confidence.slice(1)}`
    : issue.title === "Weak CORS Configuration" || issue.title === "Unsafe File Upload"
      ? "Medium"
      : "High";
  const humanReviewRequired = issue.severity === "critical" || issue.severity === "high";

  return (
    <article className="panel rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {issue.category}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">{issue.title}</h3>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${severityStyles[issue.severity]}`}
        >
          {issue.severity}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-300">
            What happened?
          </p>
          <p className="mt-2 text-sm leading-5 text-slate-700">{issue.description}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
            Why it matters
          </p>
          <p className="mt-2 text-sm leading-5 text-slate-700">{issue.recommendation}</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Location</dt>
          <dd className="mt-1 font-mono text-slate-200">{issue.location}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">CWE</dt>
          <dd className="mt-1 text-slate-200">{issue.cwe}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">OWASP</dt>
          <dd className="mt-1 text-slate-200">{issue.owasp}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
          Suggested fix
        </p>
        <p className="mt-2 text-sm leading-6 text-blue-100">{issue.suggestedFix}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {issue.language ? (
          <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold uppercase text-violet-200">
            {issue.language}
          </span>
        ) : null}
        <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-200">
          Confidence: {confidence}
        </span>
        {issue.policyTopic ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
            Policy topic: {issue.policyTopic}
          </span>
        ) : null}
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
          Policy evidence: {issue.citations.length}
        </span>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            humanReviewRequired
              ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
          }`}
        >
          Human review: {humanReviewRequired ? "Required" : "Recommended"}
        </span>
      </div>
      {issue.evidenceSnippet ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Evidence snippet</p>
          <code className="mt-2 block break-words text-xs leading-5 text-slate-300">
            {issue.evidenceSnippet}
          </code>
        </div>
      ) : null}
    </article>
  );
}
