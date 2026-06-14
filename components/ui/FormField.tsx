import type { ReactNode } from "react";

export function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block">
    <span className="block text-sm font-medium text-slate-800">{label}</span>
    {hint ? <span className="mt-1 block text-xs leading-5 text-slate-500">{hint}</span> : null}
    <span className="mt-2 block">{children}</span>
  </label>;
}
