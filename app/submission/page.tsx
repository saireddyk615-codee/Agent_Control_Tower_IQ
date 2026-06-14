import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

const demo = ["Open Agent Preflight and load the risky synthetic task.", "Run preflight and review redaction, risk, blocked tools, and run permit.", "Open Diff Guard and block the risky agent-generated diff.", "Open Output Firewall and show sanitized publish-safe output.", "Open Code Review for policy-grounded vulnerable-code analysis."];

export default function SubmissionPage() {
  return <div>
    <PageHeader actions={<Link className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-500" href="/agent-safety">Run Demo</Link>} eyebrow="Hackathon submission" title="Agent Control Tower IQ" description="Safety operating system for AI agents." />
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Project summary"><p className="text-sm leading-6 text-slate-600">Agent Control Tower IQ is a local-first safety operating system that reviews agent context, permissions, generated changes, final output, and multi-agent handoffs before risky work reaches a repository or public submission.</p></Section>
      <Section title="Agent Watchtower"><p className="text-sm leading-6 text-slate-600">Agent Watchtower automates Agent Control Tower IQ into a single local project monitor. Instead of manually opening separate pages, developers can run one scan or start watch mode from the CLI or VS Code extension. Watchtower checks repo safety, agent configs, MCP risks, git diffs, package scripts, GitHub workflows, secrets, scope creep, and generated safety artifacts before AI-generated changes enter the project.</p></Section>
      <Section title="What problem it solves"><p className="text-sm leading-6 text-slate-600">AI agents can receive excessive context, request broad tools, expand scope, leak sensitive information, and produce unsafe output. This product makes those risks visible and reviewable before impact.</p></Section>
      <Section title="What makes it different"><p className="text-sm leading-6 text-slate-600">It connects preflight controls, repo readiness, diff inspection, output sanitization, safe handoffs, and policy-grounded code review in one judge-friendly workflow.</p></Section>
      <Section title="Mock IQ mode disclosure"><p className="text-sm leading-6 text-slate-600">The demo uses a Foundry IQ-compatible mock provider and synthetic policy documents. No Azure credentials are required. Real Microsoft Foundry IQ retrieval is only used when explicitly configured.</p></Section>
      <Section title="Demo flow"><ol className="space-y-2 text-sm leading-6 text-slate-600">{demo.map((item, index) => <li key={item}><span className="mr-2 font-semibold text-blue-700">{index + 1}.</span>{item}</li>)}</ol></Section>
      <Section title="Limitations"><ul className="space-y-2 text-sm leading-6 text-slate-600"><li>• Simulations and demo data are local and synthetic.</li><li>• The product does not execute or runtime-enforce agent tools.</li><li>• MCP quarantine and GitHub workflows are represented as review artifacts, not live integrations.</li><li>• Human review remains required.</li></ul></Section>
    </div>
  </div>;
}
