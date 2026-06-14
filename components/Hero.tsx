import Link from "next/link";

const badges = [
  "Microsoft IQ-ready",
  "Security Courtroom",
  "Multi-Agent Reasoning",
  "Policy-Grounded",
  "Human Review Safe",
];

const deliveryArtifacts = [
  ["01", "Argue", "Red Team risk case"],
  ["02", "Defend", "Blue Team remediation"],
  ["03", "Judge", "Policy and compliance evidence"],
  ["04", "Verdict", "Release-gate merge decision"],
];

export function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16 pt-16 lg:pb-24 lg:pt-24">
      <div className="grid gap-12 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                className="rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1 text-xs font-semibold text-blue-100"
                key={badge}
              >
                {badge}
              </span>
            ))}
          </div>
          <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
            SecureGuard-LM <span className="text-blue-400">IQ</span>
          </h1>
          <p className="mt-5 text-xl font-medium text-slate-200 sm:text-2xl">
            Security Courtroom for AI-Generated Code
          </p>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-400 sm:text-lg">
            Put every risky code change on trial before merge. SecureGuard-LM IQ combines red-team
            reasoning, blue-team remediation, policy-grounded evidence, compliance mapping, and
            release-gate decisions into one merge verdict workflow.
          </p>
          <p className="mt-6 border-l-2 border-blue-400 pl-4 text-lg font-semibold text-blue-100">
            From vulnerability detection to policy-grounded merge verdict.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              className="rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
              href="/scan"
            >
              Start Security Courtroom
            </Link>
            <Link
              className="rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              href="/report"
            >
              View Merge Verdict Pack
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-blue-300/20 bg-gradient-to-br from-blue-500/20 via-[#0b1425] to-emerald-500/10 p-6 shadow-2xl shadow-blue-950/50">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-400/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                  Security Courtroom
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Five agents. One merge verdict.
                </h2>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Demo ready
              </span>
            </div>
            <div className="mt-7 space-y-3">
              {deliveryArtifacts.map(([number, action, outcome]) => (
                <div
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/15 p-4"
                  key={number}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-xs font-bold text-blue-200">
                    {number}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{action}</p>
                    <p className="mt-1 text-sm text-slate-400">{outcome}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ["91", "Risk before"],
                ["27", "Risk after"],
                ["70%", "Reduction"],
              ].map(([value, label]) => (
                <div className="rounded-xl border border-white/10 bg-black/15 p-3" key={label}>
                  <p className="text-xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
