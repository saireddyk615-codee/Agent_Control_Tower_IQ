import type { FixResult, ScanResult } from "@/types/security";

export function RiskReductionSummary({ scan, fix }: { scan: ScanResult; fix: FixResult }) {
  const reduction =
    fix.riskScoreBefore > 0
      ? Math.round(((fix.riskScoreBefore - fix.riskScoreAfter) / fix.riskScoreBefore) * 100)
      : 0;
  const criticalBefore = scan.issues.filter((issue) => issue.severity === "critical").length;
  const highBefore = scan.issues.filter((issue) => issue.severity === "high").length;

  const metrics = [
    ["Risk before", `${fix.riskScoreBefore}/100`, "text-red-300"],
    ["Risk after", `${fix.riskScoreAfter}/100`, "text-emerald-300"],
    ["Risk reduction", `${reduction}%`, "text-blue-300"],
    ["Critical before / after", `${criticalBefore} / 0`, "text-white"],
    ["High before / after", `${highBefore} / 0 suggested`, "text-white"],
    ["Human review items", `${fix.fixes.length}`, "text-amber-200"],
  ];

  return (
    <section className="panel rounded-2xl p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
        Risk reduction summary
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value, color]) => (
          <div className="rounded-xl border border-white/10 bg-black/15 p-4" key={label}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-2 text-xl font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Residual risk is modeled for the deterministic demo. All suggested fixes still require
        developer review.
      </p>
    </section>
  );
}
