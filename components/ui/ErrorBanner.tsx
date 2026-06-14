export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{message}</div>;
}
