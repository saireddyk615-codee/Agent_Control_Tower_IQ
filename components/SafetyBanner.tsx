export function SafetyBanner() {
  return (
    <aside className="mb-4" aria-label="Safety notice">
      <div className="flex w-full items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        <p>
          This demo uses synthetic vulnerable code and synthetic policy documents. Do not upload
          confidential information or private source code.
        </p>
      </div>
    </aside>
  );
}
