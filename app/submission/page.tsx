import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

const demoFlow = [
  "Open Watchtower and enter your project path (or click Load Demo Project).",
  "Select checks — choose Quick Scan or Full Scan, or pick individual checks.",
  "Click Run Scan and watch findings populate in real time.",
  "Review the decision, risk score, findings table, and recommended fixes.",
  "Select safe fixes and click Fix Selected Safe Issues.",
  "Click Generate Patch for Review to preview manual-review changes.",
  "Click Download PDF Report to export the evidence pack.",
  "Click Re-scan to confirm fixes reduced risk.",
];

export default function SubmissionPage() {
  return <div>
    <PageHeader
      actions={<Link className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-500" href="/watchtower">Open Watchtower</Link>}
      eyebrow="Foundry IQ Hackathon submission"
      title="Agent Control Tower IQ"
      description="Foundry IQ Watchtower for AI-generated projects — scan risks, review findings, apply safe fixes, and export PDF evidence."
    />
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="One-line pitch">
        <p className="text-sm leading-6 text-slate-600">A Foundry IQ-ready Watchtower for AI-generated projects that scans repo risks, agent configs, diffs, secrets, outputs, and code security issues, then gives developers one final decision, recommended fixes, safe-fix approval, patch previews, and PDF reports.</p>
      </Section>

      <Section title="Problem">
        <p className="text-sm leading-6 text-slate-600">AI-assisted coding accelerates delivery, but insecure or misconfigured AI-generated projects can reach production faster than teams can review them. Teams need a structured final-review layer that is explainable, policy-grounded, and safe for human approval.</p>
      </Section>

      <Section title="Solution — Agent Watchtower">
        <p className="text-sm leading-6 text-slate-600">Agent Watchtower performs local static analysis of any project. It checks repo safety files, agent and MCP configurations, git diff scope creep, secrets and sensitive data, package and workflow risks, output hygiene, and code security — then produces one consolidated decision, a scored risk report, and an approved fix plan.</p>
      </Section>

      <Section title="Foundry IQ integration">
        <p className="text-sm leading-6 text-slate-600">This MVP includes a Foundry IQ integration layer with mock fallback. The default demo runs without Azure credentials. The architecture supports real Foundry IQ / Azure AI Search retrieval when configured via <code className="rounded bg-slate-100 px-1 text-xs">.env.local</code>. Source code is never uploaded by default.</p>
      </Section>

      <Section title="Demo flow">
        <ol className="space-y-2 text-sm leading-6 text-slate-600">
          {demoFlow.map((item, index) => (
            <li key={item}><span className="mr-2 font-semibold text-blue-700">{index + 1}.</span>{item}</li>
          ))}
        </ol>
      </Section>

      <Section title="What the scanner produces">
        <ul className="space-y-1.5 text-sm leading-6 text-slate-600">
          <li>• Final decision: <strong>safe</strong>, <strong>needs_review</strong>, or <strong>blocked</strong></li>
          <li>• Risk score (0–100) with short risk note</li>
          <li>• Findings table with severity, file, and recommended fix</li>
          <li>• Fix plan cards — safe auto-fix or manual review</li>
          <li>• Patch preview for manual-review changes</li>
          <li>• PDF evidence report and JSON export</li>
        </ul>
      </Section>

      <Section title="Limitations">
        <ul className="space-y-1.5 text-sm leading-6 text-slate-600">
          <li>• Static local analysis only — no source upload, no runtime execution.</li>
          <li>• Safe auto-fixes are limited to security file generation and low-risk config changes.</li>
          <li>• Risky code changes always require human review via patch preview.</li>
          <li>• Foundry IQ retrieval uses mock policy documents in the default demo.</li>
          <li>• Human judgment remains the final gate before any production change.</li>
        </ul>
      </Section>

      <Section title="CLI usage">
        <pre className="studio-preview text-xs">npm run watchtower -- scan --repo /path/to/project{"\n"}npm run watchtower -- watch --repo /path/to/project{"\n"}npm run live:test</pre>
      </Section>
    </div>
  </div>;
}
