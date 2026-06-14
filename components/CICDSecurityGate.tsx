import type { FixResult, ScanResult } from "@/types/security";

export function CICDSecurityGate({ scan, fix }: { scan: ScanResult; fix: FixResult }) {
  return (
    <section className="panel rounded-2xl p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
        CI/CD Security Gate Result
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-red-400/20 bg-red-400/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Before fix</h3>
            <span className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-bold uppercase text-red-200">
              Failed
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Critical/high findings detected across {scan.issues.length} supported checks.
          </p>
          <p className="mt-3 text-sm font-semibold text-red-200">Action: Block merge</p>
        </article>
        <article className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">After fix</h3>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase text-amber-200">
              Passed with warnings
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Suggested fixes generated but human review required. Modeled risk is now{" "}
            {fix.riskScoreAfter}/100.
          </p>
          <p className="mt-3 text-sm font-semibold text-amber-200">
            Action: Allow reviewer approval only
          </p>
        </article>
      </div>
    </section>
  );
}
