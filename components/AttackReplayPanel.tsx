import type { AttackReplay } from "@/types/security";

export function AttackReplayPanel({ replays }: { replays: AttackReplay[] }) {
  return (
    <div>
      <div className="mb-5 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
        Attack replay is a safe simulation for educational validation only. No real systems are
        targeted.
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {replays.map((replay) => (
          <article className="panel min-h-[460px] overflow-hidden rounded-2xl" key={replay.issueId}>
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-300">
                Safe attack replay
              </p>
              <h3 className="mt-2 font-semibold text-white">{replay.issueTitle}</h3>
            </div>
            <dl className="space-y-4 p-5 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Simulated input
                </dt>
                <dd className="mt-2 rounded-lg border border-red-400/15 bg-red-400/5 p-3 font-mono text-red-100">
                  {replay.attackInput}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Before fix
                </dt>
                <dd className="mt-1 leading-6 text-slate-300">{replay.beforeFix}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Risk
                </dt>
                <dd className="mt-1 leading-6 text-slate-400">{replay.risk}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  After fix
                </dt>
                <dd className="mt-1 leading-6 text-emerald-200">{replay.afterFix}</dd>
              </div>
              <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Validation result
                </dt>
                <dd className="mt-1 leading-6 text-emerald-100">{replay.result}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
