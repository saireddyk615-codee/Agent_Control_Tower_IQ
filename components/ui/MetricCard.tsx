import type { ReactNode } from "react";

export function MetricCard({ label, value, detail, action }: { label: string; value: ReactNode; detail?: ReactNode; action?: ReactNode }) {
  return <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>{action}</div>
    <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
    {detail ? <div className="mt-2 text-sm leading-5 text-slate-600">{detail}</div> : null}
  </article>;
}
