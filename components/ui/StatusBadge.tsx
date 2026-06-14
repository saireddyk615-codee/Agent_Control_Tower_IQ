export function StatusBadge({ status }: { status: string }) {
  const blocked = /block|not_|do_not|critical/i.test(status);
  const approved = /approve|ready|safe(?:_to)?|passed/i.test(status) && !blocked;
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
        approved
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : blocked
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
