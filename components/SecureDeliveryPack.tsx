import { MergeVerdictPack } from "@/components/MergeVerdictPack";
import { RiskReductionSummary } from "@/components/RiskReductionSummary";
import type { FixResult, ScanResult } from "@/types/security";

export function SecureDeliveryPack({
  scan,
  fix,
}: {
  scan: ScanResult;
  fix: FixResult;
}) {
  return (
    <section className="mt-12" id="merge-verdict-pack">
      <div className="rounded-3xl border border-blue-300/20 bg-gradient-to-br from-blue-500/15 via-[#0a1222] to-emerald-500/10 p-7 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">
          Courtroom exhibits
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          From arguments and evidence to a merge verdict
        </h2>
        <p className="mt-4 max-w-4xl leading-7 text-slate-400">
          SecureGuard-LM IQ packages the final decision, blocking issues, risk reduction, and
          reviewer responsibility into one Merge Verdict Pack.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            "Merge Verdict",
            "Reviewer Checklist",
            "Human Review Decision",
            "Risk Reduction",
          ].map((artifact) => (
            <span
              className="rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1 text-xs font-semibold text-blue-100"
              key={artifact}
            >
              {artifact}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <MergeVerdictPack fix={fix} scan={scan} />
        <RiskReductionSummary fix={fix} scan={scan} />
      </div>
    </section>
  );
}
