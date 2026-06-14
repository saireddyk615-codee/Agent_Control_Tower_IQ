"use client";

import { useEffect, useRef, useState } from "react";
import { usePortalSession } from "@/components/providers/PortalSessionProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import type { ProjectRiskComparisonResult } from "@/lib/watchtower/projectComparison";

const demoPaths = [
  "/Users/shivareddy/IdeaProjects/RoVora1/stealth-resume-ace",
  "/Users/shivareddy/IdeaProjects/Workout App",
  "/Users/shivareddy/IdeaProjects/SecureGuard-LM IQ",
].join("\n");
type ComparisonResponse = ProjectRiskComparisonResult & { reportPaths: { markdownPath: string; jsonPath: string } };

export default function ComparePage() {
  const { session, hydrated, updateCompare } = usePortalSession();
  const restored = useRef(false);
  const [paths, setPaths] = useState("");
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    setPaths(session.compare.repoPaths.join("\n"));
    setResult(session.compare.lastComparison as ComparisonResponse | null);
    setError(session.compare.lastError ?? null);
  }, [hydrated, session.compare]);

  function changePaths(value: string) {
    setPaths(value);
    updateCompare({ repoPaths: value.split("\n").map((path) => path.trim()).filter(Boolean) });
  }

  async function compare() {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const repoPaths = paths.split("\n").map((path) => path.trim()).filter(Boolean);
      const response = await fetch("/api/watchtower/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoPaths }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "Project comparison failed.");
      setResult(value);
      updateCompare({ repoPaths, lastComparison: value, lastComparedAt: new Date().toISOString(), lastError: null });
    } catch (value) {
      console.error("Watchtower comparison failed", value);
      const nextError = value instanceof Error ? value.message : "Project comparison failed.";
      setError(nextError); updateCompare({ lastError: nextError });
    } finally { setLoading(false); }
  }

  function download() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = "PROJECT_RISK_COMPARISON_REPORT.json"; link.click(); URL.revokeObjectURL(url);
  }

  const specificCount = result?.projectSpecificRisks.reduce((sum, project) => sum + project.risks.length, 0) ?? 0;
  return <div>
    <PageHeader eyebrow="Local-only portfolio analysis" title="Compare Projects" description="Compare real Watchtower reports across local projects to separate repeated baseline issues, project-specific risks, scanner noise, safe fixes, and manual-review work." />
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="text-sm font-semibold" htmlFor="repo-paths">Repo paths, one per line</label>
      <textarea className="studio-input mt-2 min-h-36 font-mono text-xs" id="repo-paths" onChange={(event) => changePaths(event.target.value)} placeholder="/path/to/project-one&#10;/path/to/project-two" value={paths} />
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton disabled={!paths.trim() || loading} isLoading={loading} label="Compare Projects" loadingLabel="Comparing..." onClick={compare} />
        <ActionButton disabled={loading} label="Load Demo Comparison" onClick={() => changePaths(demoPaths)} variant="secondary" />
        <ActionButton disabled={!result} label="Download Comparison Report" onClick={download} variant="secondary" />
      </div>
      <p className="mt-3 text-xs text-slate-500">Reads existing local Watchtower JSON reports. Missing reports are skipped unless an API caller explicitly requests a scan.</p>
    </section>
    <div className="mt-4"><ErrorBanner message={error} /></div>
    {!result ? <div className="mt-5"><EmptyState description="Load the demo paths or enter local project paths, then compare their existing Watchtower reports." title="Ready to compare project risks" /></div> : <div className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Projects compared" value={result.projectsCompared.length} />
        <MetricCard label="Repeated risks" value={result.repeatedRisks.length} />
        <MetricCard label="Project-specific risks" value={specificCount} />
        <MetricCard label="Likely false positives" value={result.likelyFalsePositives.length} />
        <MetricCard label="Shared safe fixes" value={result.sharedSafeFixes.length} />
        <MetricCard label="Manual review required" value={result.manualReviewRequired.length} />
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Executive summary</h2><p className="mt-2 text-sm leading-6 text-slate-600">{result.executiveSummary}</p>{result.missingReports.map((item) => <p className="mt-2 text-sm text-amber-700" key={item.reportPath}>Skipped {item.projectName}: {item.reason}</p>)}</section>
      <ComparisonList title="Repeated risks" values={result.repeatedRisks.map((risk) => `${risk.title} · ${risk.classification} · ${risk.appearsInProjects.join(", ")}`)} />
      <ComparisonList title="Project-specific risks" values={result.projectSpecificRisks.flatMap((project) => project.risks.map((risk) => `${project.projectName}: ${risk.title} · ${risk.severity}`))} />
      <ComparisonList title="Likely false positives" values={result.likelyFalsePositives.map((risk) => `${risk.projectName}: ${risk.title} · ${risk.reason}`)} />
      <ComparisonList title="Shared safe fixes" values={result.sharedSafeFixes.map((fix) => `${fix.title} · ${fix.projects.join(", ")}`)} />
      <ComparisonList title="Manual review required" values={result.manualReviewRequired.map((risk) => `${risk.projectName}: ${risk.title}`)} />
      <p className="break-all text-xs text-slate-500">Reports written: {result.reportPaths.markdownPath} and {result.reportPaths.jsonPath}</p>
    </div>}
  </div>;
}

function ComparisonList({ title, values }: { title: string; values: string[] }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">{title}</h2>{values.length ? <ul className="mt-3 space-y-2 text-sm text-slate-600">{values.map((value, index) => <li className="rounded-lg bg-slate-50 p-3" key={`${value}-${index}`}>{value}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">None found.</p>}</section>;
}
