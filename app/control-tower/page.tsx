import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

const modes = [
  ["Agent Watchtower", "/watchtower", "One-click local project scan and realtime monitoring for AI-generated changes."],
  ["Agent Preflight", "/agent-safety", "Check a task, context, and requested tools before an agent runs."],
  ["Repo Guardian", "/repo-guardian", "Assess whether a repository is ready for bounded agent work."],
  ["Diff Guard", "/diff-guard", "Inspect agent-generated changes for scope creep and risky side effects."],
  ["Output Firewall", "/output-firewall", "Sanitize agent output before it is published or shared."],
  ["Safe Handoff", "/safe-handoff", "Pass only the minimum safe context to the next agent."],
  ["Code Review", "/scan", "Scan synthetic vulnerable code with mock policy grounding."],
] as const;

export default function ControlTowerPage() {
  return <div>
    <PageHeader eyebrow="Overview" title="Agent Control Tower IQ" description="Safety operating system for AI agents." />
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><p className="max-w-4xl text-base font-semibold leading-7 text-slate-950">Make sure AI agents see only what they should, do only what they are allowed to do, and submit only safe output.</p></section>
    <section className="mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Agent Watchtower</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Agent Watchtower automates the separate safety modes into one local project monitor. It checks repo safety, agent/MCP configs, package scripts, GitHub workflows, secrets, internal URLs, git diffs, scope creep, and generated safety artifacts.</p>
      <p className="mt-3 font-semibold text-blue-700">One run. One project. Continuous safety monitoring for AI-generated code.</p>
      <pre className="studio-preview mt-4">npm run watchtower -- scan --repo .{"\n"}npm run watchtower -- watch --repo .{"\n"}npm run watchtower -- install-hook --repo .{"\n"}npm run watchtower -- report --repo .</pre>
      <Link className="mt-4 inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-500" href="/watchtower">Open Watchtower</Link>
    </section>
    <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {modes.map(([title, href, description]) => <article className="flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={href}><h2 className="text-lg font-semibold text-slate-950">{title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{description}</p><Link className="mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700" href={href}>Open</Link></article>)}
    </section>
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">VS Code Extension</h2><p className="mt-2 text-sm leading-6 text-slate-600">The VS Code extension wraps the local Watchtower CLI so developers can run scans from the editor.</p><ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><li>Agent Watchtower: Run Full Scan</li><li>Agent Watchtower: Start Watch Mode</li><li>Agent Watchtower: Open Dashboard</li><li>Agent Watchtower: Install Pre-Commit Gate</li></ul></section>
  </div>;
}
