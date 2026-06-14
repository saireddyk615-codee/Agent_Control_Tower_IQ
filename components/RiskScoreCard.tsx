import type { ScanResult } from "@/types/security";

const recommendationStyles: Record<ScanResult["mergeRecommendation"], string> = {
  "Approve with caution": "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  "Review required": "border-amber-400/25 bg-amber-400/10 text-amber-200",
  "Block until fixed": "border-red-400/25 bg-red-400/10 text-red-200",
};

export function RiskScoreCard({ result }: { result: ScanResult }) {
  const scoreColor =
    result.riskScore > 70
      ? "text-red-300"
      : result.riskScore > 30
        ? "text-amber-300"
        : "text-emerald-300";

  return (
    <section className="panel min-h-52 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            Reasoned risk score
          </p>
          <p className={`mt-3 text-5xl font-semibold tracking-tight ${scoreColor}`}>
            {result.riskScore}
            <span className="text-base font-medium text-slate-500">/100</span>
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${recommendationStyles[result.mergeRecommendation]}`}
        >
          {result.mergeRecommendation}
        </span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-400 to-red-500"
          style={{ width: `${result.riskScore}%` }}
        />
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-400">{result.summary}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        IQ mode: {result.iqMode}
      </p>
    </section>
  );
}
