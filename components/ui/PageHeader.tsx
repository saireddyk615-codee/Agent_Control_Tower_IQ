import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
    <div>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{eyebrow}</p> : null}
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
    {actions ? <div className="shrink-0">{actions}</div> : null}
  </header>;
}
