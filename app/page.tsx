import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Home() {
  return <div>
    <PageHeader eyebrow="Local-first AI project security" title="Agent Control Tower IQ" description="One professional Watchtower workflow for scanning AI-generated projects, reviewing risks, applying approved safety fixes, and exporting evidence." />
    <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm sm:p-9">
      <h2 className="max-w-4xl text-2xl font-semibold leading-9 text-slate-950">Scan project → Review risks → Download PDF → Apply safe fixes → Re-scan</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Watchtower performs static local analysis. It does not upload source code, execute scanned projects, or apply high-risk changes without human approval.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-500" href="/watchtower">Open Watchtower</Link>
        <Link className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50" href="/integrations">View IDE Extension</Link>
      </div>
    </section>
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Live test proof</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">CLI, local scan engine, reports, safe fixes, and VS Code extension verified together</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">The live test scans two real local projects, generates JSON, Markdown, and PDF reports, verifies approved safety-file fixes, and confirms source and workflow files are not auto-modified.</p>
    </section>
  </div>;
}
