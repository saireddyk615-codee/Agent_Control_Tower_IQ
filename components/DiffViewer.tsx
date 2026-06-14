export function DiffViewer({
  originalCode,
  fixedCode,
}: {
  originalCode: string;
  fixedCode: string;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="panel min-h-[520px] overflow-hidden rounded-2xl border-red-400/15">
        <div className="border-b border-red-400/15 bg-red-400/5 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">Before</p>
          <h3 className="mt-1 font-semibold text-white">Vulnerable Code</h3>
        </div>
        <pre className="max-h-[680px] overflow-auto whitespace-pre p-5 font-mono text-[12px] leading-6 text-slate-300">
          {originalCode}
        </pre>
      </section>

      <section className="panel min-h-[520px] overflow-hidden rounded-2xl border-emerald-400/15">
        <div className="border-b border-emerald-400/15 bg-emerald-400/5 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">After</p>
          <h3 className="mt-1 font-semibold text-white">SecureGuard Suggested Fix</h3>
        </div>
        <pre className="max-h-[680px] overflow-auto whitespace-pre p-5 font-mono text-[12px] leading-6 text-slate-300">
          {fixedCode}
        </pre>
      </section>
    </div>
  );
}
