import type { ReactNode } from "react";
export function ResultPanel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">{title}</h2>{action}</div><div className="mt-3 text-sm leading-6 text-slate-600">{children}</div></section>;
}
