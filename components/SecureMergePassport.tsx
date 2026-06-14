import type { SecureMergePassport as SecureMergePassportData } from "@/types/security";

const passportFields: Array<{
  key: keyof SecureMergePassportData;
  label: string;
}> = [
  { key: "riskScoreBefore", label: "Risk Score Before" },
  { key: "riskScoreAfter", label: "Risk Score After" },
  { key: "issuesFound", label: "Issues Found" },
  { key: "issuesFixed", label: "Issues Fixed" },
  { key: "humanReviewRequired", label: "Human Review Required" },
  { key: "policyEvidenceAttached", label: "Policy Evidence Attached" },
  { key: "attackReplayCompleted", label: "Attack Replay Completed" },
  { key: "validationStatus", label: "Validation Status" },
];

const formatValue = (value: SecureMergePassportData[keyof SecureMergePassportData]) => {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
};

export function SecureMergePassport({ passport }: { passport: SecureMergePassportData }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-blue-300/25 bg-gradient-to-br from-blue-500/15 via-[#0d1729] to-emerald-500/10 p-6 shadow-2xl shadow-blue-950/40 sm:p-8">
      <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">
              Security Proof Pack
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Secure Merge Passport
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Policy-grounded evidence of detection, remediation, simulated validation, and
              remaining reviewer responsibility.
            </p>
          </div>
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-bold text-amber-100">
            {passport.finalMergeRecommendation}
          </span>
        </div>

        <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {passportFields.map((field) => (
            <div className="rounded-xl border border-white/10 bg-black/15 p-4" key={field.key}>
              <dt className="text-xs uppercase tracking-wide text-slate-500">{field.label}</dt>
              <dd className="mt-2 font-semibold text-white">{formatValue(passport[field.key])}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <p className="text-sm text-slate-400">
            Final merge recommendation based on modeled residual risk and required human review.
          </p>
          <p className="text-lg font-semibold text-amber-200">{passport.finalMergeRecommendation}</p>
        </div>
      </div>
    </section>
  );
}
