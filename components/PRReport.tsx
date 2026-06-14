"use client";

import { useRef } from "react";
import { CopyButton } from "@/components/ui/CopyButton";

export function PRReport({
  reportMarkdown,
  summary,
}: {
  reportMarkdown: string;
  summary: string;
}) {
  const reportRef = useRef<HTMLTextAreaElement>(null);

  return (
    <section className="panel min-h-[760px] overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            PR security artifact
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">Pull Request Security Review</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{summary}</p>
        </div>
        <CopyButton value={reportMarkdown} />
      </div>
      <textarea
        aria-label="PR report markdown"
        className="min-h-[640px] w-full resize-y bg-transparent p-5 font-mono text-[12px] leading-6 text-slate-300 outline-none"
        readOnly
        ref={reportRef}
        value={reportMarkdown}
      />
      <p className="border-t border-white/10 px-5 py-4 text-xs text-slate-500">
        Use this as a PR comment or security review artifact.
      </p>
    </section>
  );
}
