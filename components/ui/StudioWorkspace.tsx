import type { ReactNode } from "react";

export function StudioWorkspace({ left, right }: { left: ReactNode; right: ReactNode }) {
  return <div className="studio-workspace grid min-w-0 gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
    <section className="studio-workspace-left min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{left}</section>
    <section className="studio-workspace-right min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{right}</section>
  </div>;
}
