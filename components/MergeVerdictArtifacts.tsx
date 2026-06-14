"use client";

import { CopyButton } from "@/components/ui/CopyButton";
import { DownloadButton } from "@/components/ui/DownloadButton";
import type { MergeVerdictArtifactsResult } from "@/types/security";

export function MergeVerdictArtifacts({
  artifacts,
}: {
  artifacts: MergeVerdictArtifactsResult;
}) {
  const sarif = JSON.stringify(artifacts.sarifPreview, null, 2);

  return (
    <section className="mt-12" id="merge-verdict-artifact-pack">
      <div className="rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-500/15 via-[#0a1222] to-blue-500/10 p-7 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
          Merge Verdict Artifact Pack
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Merge-ready outputs for DevSecOps workflows
        </h2>
        <p className="mt-4 max-w-4xl leading-7 text-slate-400">
          Copy these artifacts into pull requests, CI/CD reviews, security evidence, and compliance
          handoffs. SecureGuard-LM IQ turns security findings into merge-ready decision artifacts.
        </p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ArtifactCard
          actions={<CopyButton value={artifacts.prReviewComment} />}
          content={artifacts.prReviewComment}
          title="GitHub-style PR Review Comment"
        />
        <ArtifactCard
          actions={<CopyButton value={artifacts.cicdGateSummary} />}
          content={artifacts.cicdGateSummary}
          title="CI/CD Gate Summary"
        />
        <ArtifactCard
          actions={<CopyButton value={artifacts.securityCourtroomSummary} />}
          content={artifacts.securityCourtroomSummary}
          title="Security Courtroom Summary"
        />
        <ArtifactCard
          actions={<CopyButton value={artifacts.complianceEvidenceSummary} />}
          content={artifacts.complianceEvidenceSummary}
          title="Compliance Evidence Summary"
        />
      </div>

      <section className="panel mt-6 overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              SARIF Preview
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              This is a SARIF-style preview for demo purposes. Future versions can upload SARIF to
              GitHub Advanced Security or Azure DevOps pipelines.
            </p>
          </div>
          <div className="flex gap-2">
            <CopyButton value={sarif} />
            <DownloadButton content={sarif} filename="secureguard-results.sarif.json" label="Download SARIF" />
          </div>
        </div>
        <pre className="max-h-[500px] overflow-auto p-5 font-mono text-[12px] leading-6 text-slate-300">
          {sarif}
        </pre>
      </section>

      <section className="panel mt-6 rounded-2xl p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
          Reviewer Checklist
        </p>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {artifacts.reviewerChecklist.map((item) => (
            <li className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-slate-300" key={item}>
              □ {item}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

function ArtifactCard({
  title,
  content,
  actions,
}: {
  title: string;
  content: string;
  actions: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <h3 className="font-semibold text-white">{title}</h3>
        {actions}
      </div>
      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap p-5 font-mono text-[12px] leading-6 text-slate-300">
        {content}
      </pre>
    </section>
  );
}
