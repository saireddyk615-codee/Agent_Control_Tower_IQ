"use client";

import { CopyButton } from "@/components/ui/CopyButton";

export function CopyReadyField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <article className="panel overflow-hidden rounded-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">{label}</p>
        <CopyButton value={value} />
      </div>
      {multiline ? (
        <textarea
          aria-label={label}
          className="min-h-36 w-full resize-y bg-transparent p-4 text-sm leading-7 text-slate-300 outline-none"
          readOnly
          value={value}
        />
      ) : (
        <p className="select-all p-4 text-sm leading-6 text-slate-300">{value}</p>
      )}
    </article>
  );
}
