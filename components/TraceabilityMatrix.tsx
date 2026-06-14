import type { TraceabilityItem } from "@/types/security";

export function TraceabilityMatrix({ items }: { items: TraceabilityItem[] }) {
  return (
    <div className="panel overflow-x-auto rounded-2xl">
      <table className="min-w-[1200px] w-full border-collapse text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-4 font-semibold">Issue</th>
            <th className="px-4 py-4 font-semibold">Severity</th>
            <th className="px-4 py-4 font-semibold">Code Location</th>
            <th className="px-4 py-4 font-semibold">Policy Citation</th>
            <th className="px-4 py-4 font-semibold">Generated Fix</th>
            <th className="px-4 py-4 font-semibold">Validation Status</th>
            <th className="px-4 py-4 font-semibold">Human Review Required</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {items.map((item) => (
            <tr className="align-top text-slate-300" key={item.issue}>
              <td className="px-4 py-4 font-semibold text-white">{item.issue}</td>
              <td className="px-4 py-4">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs uppercase">
                  {item.severity}
                </span>
              </td>
              <td className="px-4 py-4 font-mono text-xs">{item.codeLocation}</td>
              <td className="max-w-xs px-4 py-4">
                <p className="text-blue-200">{item.policyCitation}</p>
                {item.additionalPolicyCitations.length > 0 ? (
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Also: {item.additionalPolicyCitations.join("; ")}
                  </p>
                ) : null}
              </td>
              <td className="max-w-sm px-4 py-4 leading-6 text-slate-400">{item.generatedFix}</td>
              <td className="px-4 py-4 text-emerald-200">{item.validationStatus}</td>
              <td className="px-4 py-4">
                <span
                  className={
                    item.humanReviewRequired
                      ? "font-semibold text-amber-200"
                      : "font-semibold text-emerald-200"
                  }
                >
                  {item.humanReviewRequired ? "Yes" : "No"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
