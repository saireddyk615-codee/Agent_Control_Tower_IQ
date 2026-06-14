import Link from "next/link";
import { PRReport } from "@/components/PRReport";

const sampleReport = `# SecureGuard-LM IQ - Pull Request Security Review

## Review Summary
- **IQ grounding mode:** Foundry IQ-compatible mock grounding
- **Risk score before:** 91/100
- **Risk score after:** 27/100
- **Merge recommendation:** Review required
- **Issues found / fixed:** 5 / 5

## Key Findings
- Critical SQL injection risk grounded in Secure Coding Policy Sections 5.1 and 5.2.
- Hardcoded JWT secret grounded in Secrets Management Policy Sections 1.1-1.3.
- Weak CORS, missing input validation, and unsafe file upload controls require remediation.

## Secure Merge Passport
- Policy evidence attached: Yes
- Safe attack replay completed: Yes
- Validation status: passed with warnings
- Human review required: Yes

## Safety Disclaimer
This report was generated using synthetic demo code and synthetic security policy documents. SecureGuard-LM IQ does not auto-merge code. All generated fixes require developer review before production use.`;

const benefits = [
  {
    title: "Evidence reviewers can verify",
    body: "Every finding is connected to trusted policy sections, code locations, and clear remediation guidance.",
  },
  {
    title: "Human review stays central",
    body: "Residual risk, validation warnings, and merge recommendations make reviewer responsibility explicit.",
  },
  {
    title: "Ready for team workflows",
    body: "The Markdown artifact can be used as a pull request comment, security review record, or audit handoff.",
  },
];

export default function ReportPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-16">
      <section className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
          Merge Verdict Pack preview
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          A policy-grounded verdict teams can review and enforce
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-400">
          The Merge Verdict Pack combines courtroom arguments, policy-grounded evidence,
          remediation proof, a release-gate verdict, PR review copy, CI/CD gate context, SARIF
          preview, compliance mapping, and reviewer actions.
        </p>
        <Link
          className="mt-8 inline-flex rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400"
          href="/scan"
        >
          Start Security Courtroom
        </Link>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {benefits.map((benefit) => (
          <article className="panel rounded-2xl p-5" key={benefit.title}>
            <h2 className="font-semibold text-white">{benefit.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{benefit.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-12">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            GitHub-style artifact preview
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Pull request security review</h2>
        </div>
        <PRReport
          reportMarkdown={sampleReport}
          summary="Sample enterprise review artifact generated from synthetic demo data and synthetic security policies."
        />
      </section>
    </main>
  );
}
