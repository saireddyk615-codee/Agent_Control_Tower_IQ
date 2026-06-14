import type { IQMode, SecurityIssue } from "@/types/security";

export function PolicyCitationPanel({ issue, iqMode }: { issue: SecurityIssue; iqMode: IQMode }) {
  return (
    <article className="panel overflow-hidden rounded-xl">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
          Supports finding
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-white">{issue.title}</h3>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {issue.citations.length} {issue.citations.length === 1 ? "citation" : "citations"}
          </span>
        </div>
      </div>

      {issue.citations.length > 0 ? (
        <div className="divide-y divide-slate-200">
          {issue.citations.map((citation) => (
            <div className="p-4" key={`${issue.id}-${citation.policyId}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{citation.policyName}</p>
                  <p className="mt-1 text-sm text-blue-200">
                    {citation.section} - {citation.title}
                  </p>
                </div>
                <span className="rounded-md border border-white/10 bg-white/[0.025] px-2 py-1 font-mono text-[11px] text-slate-500">
                  {citation.policyId}
                </span>
              </div>
              <p className="mt-4 border-l-2 border-blue-400/40 pl-4 text-sm leading-6 text-slate-400">
                {citation.excerpt}
              </p>
              <p className="mt-4 font-mono text-[11px] text-slate-600">{citation.sourcePath}</p>
              <p className="mt-2 font-mono text-[11px] text-slate-600">
                Provider: {citation.provider}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5 text-sm leading-6 text-slate-400">
          {iqMode === "real"
            ? "No policy evidence was returned. Configure the Microsoft Foundry project, agent, and knowledge base to enable retrieval."
            : "No matching synthetic policy evidence was found for this issue."}
        </div>
      )}
    </article>
  );
}
