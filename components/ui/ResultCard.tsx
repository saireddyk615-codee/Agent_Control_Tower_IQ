import type { ReactNode } from "react";

export function ResultCard({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        {action}
      </div>
      <div className="mt-3 min-w-0 text-sm leading-6 text-slate-600">{children}</div>
    </section>
  );
}
