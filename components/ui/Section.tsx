import type { ReactNode } from "react";
export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">{title ? <h2 className="font-semibold text-slate-950">{title}</h2> : null}<div className={title ? "mt-3" : ""}>{children}</div></section>;
}
