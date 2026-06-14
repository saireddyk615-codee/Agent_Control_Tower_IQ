import type { ScanResult } from "@/types/security";

const nistByIssue: Record<string, string> = {
  "SQL Injection Risk": "PW.7.1",
  "Hardcoded Secret": "PW.4.1",
  "Weak CORS Configuration": "PW.8.2",
  "Missing Input Validation": "PW.7.1",
  "Unsafe File Upload": "PW.8.1",
};

export function ComplianceMapping({ scan }: { scan: ScanResult }) {
  return (
    <section className="panel overflow-x-auto rounded-2xl">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
          Compliance mapping
        </p>
        <h3 className="mt-2 font-semibold text-white">Security findings mapped to review controls</h3>
      </div>
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.025] text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-4">Finding</th>
            <th className="px-4 py-4">OWASP</th>
            <th className="px-4 py-4">CWE</th>
            <th className="px-4 py-4">NIST SSDF</th>
            <th className="px-4 py-4">SOC 2 / Secure SDLC</th>
            <th className="px-4 py-4">ISO 27001</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-slate-300">
          {scan.issues.map((issue) => (
            <tr key={issue.id}>
              <td className="px-4 py-4 font-semibold text-white">{issue.title}</td>
              <td className="px-4 py-4">{issue.owasp}</td>
              <td className="px-4 py-4">{issue.cwe}</td>
              <td className="px-4 py-4">{nistByIssue[issue.title] ?? "PW.7.1"}</td>
              <td className="px-4 py-4">Change Management / Security Monitoring</td>
              <td className="px-4 py-4">Secure Development Lifecycle</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
