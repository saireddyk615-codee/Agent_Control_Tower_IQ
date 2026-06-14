import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

const features = [
  {
    icon: "🔍",
    title: "Static local analysis",
    body: "No source code upload. No project code execution. No Azure or cloud credentials required.",
  },
  {
    icon: "🛡️",
    title: "8 security checks",
    body: "Repo safety, secrets detection, MCP/agent config, git scope, package risks, output firewall, and more.",
  },
  {
    icon: "📄",
    title: "PDF + JSON evidence",
    body: "Generate signed-off PDF reports and machine-readable JSON for every scan.",
  },
  {
    icon: "✅",
    title: "Safe auto-fix",
    body: "Approved guardrail fixes applied automatically. Risky changes stay as patch previews for human review.",
  },
  {
    icon: "🔌",
    title: "VS Code + CLI",
    body: "Run from the editor command palette, from the terminal, or as a Git pre-commit gate.",
  },
  {
    icon: "💾",
    title: "Persistent session",
    body: "Scan results persist in localStorage — navigate between pages without losing your last scan.",
  },
];

export default function Home() {
  return (
    <div>
      <PageHeader
        eyebrow="Local-first AI project security"
        title="Agent Control Tower IQ"
        description="One professional Watchtower workflow — scan AI-generated projects, review risks, apply approved fixes, and export evidence."
      />

      {/* Hero CTA */}
      <section className="wt-card p-6 sm:p-9">
        <h2 className="max-w-4xl text-2xl font-semibold leading-9 text-slate-950">
          Scan project → Review risks → Download PDF → Apply safe fixes → Re-scan
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Watchtower performs static local analysis. It does not upload source code, execute scanned
          projects, or apply high-risk changes without human approval.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition"
            href="/watchtower"
          >
            Open Watchtower
          </Link>
          <Link
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            href="/reports"
          >
            View Reports
          </Link>
          <Link
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            href="/integrations"
          >
            IDE Extension
          </Link>
        </div>
      </section>

      {/* Features grid */}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon, title, body }) => (
          <article className="wt-card p-5" key={title}>
            <div className="mb-3 text-2xl">{icon}</div>
            <h3 className="font-semibold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
          </article>
        ))}
      </section>

      {/* Live proof */}
      <section className="mt-5 wt-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Live test proof</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          CLI, local scan engine, reports, safe fixes, and VS Code extension verified together
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The live test scans two real local projects, generates JSON, Markdown, and PDF reports,
          verifies approved safety-file fixes, and confirms source and workflow files are not auto-modified.
        </p>
        <div className="mt-4">
          <Link
            className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 transition"
            href="/submission"
          >
            View submission →
          </Link>
        </div>
      </section>
    </div>
  );
}
