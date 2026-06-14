"use client";

import { useEffect, useRef, useState } from "react";
import { usePortalSession } from "@/components/providers/PortalSessionProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import type { ProjectRiskComparisonResult } from "@/lib/watchtower/projectComparison";

const demoPaths = [
  "/Users/shivareddy/IdeaProjects/RoVora1/stealth-resume-ace",
  "/Users/shivareddy/IdeaProjects/Workout App",
  "/Users/shivareddy/IdeaProjects/SecureGuard-LM IQ",
].join("\n");

type ComparisonResponse = ProjectRiskComparisonResult & {
  reportPaths: { markdownPath: string; jsonPath: string };
};

function MetricPill({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className={`text-2xl font-bold ${accent ?? "text-slate-950"}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function RiskList({ title, items, accent }: { title: string; items: string[]; accent?: string }) {
  if (!items.length) return null;
  return (
    <section className="wt-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${accent ?? "border-slate-200 text-slate-600"}`}>
          {items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700" key={`${item}-${i}`}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ComparePage() {
  const { session, hydrated, updateCompare } = usePortalSession();
  const restored = useRef(false);

  const [paths,   setPaths]   = useState("");
  const [result,  setResult]  = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    setPaths(session.compare.repoPaths.join("\n"));
    setResult(session.compare.lastComparison as ComparisonResponse | null);
    setError(session.compare.lastError ?? null);
  }, [hydrated, session.compare]);

  function changePaths(v: string) {
    setPaths(v);
    updateCompare({ repoPaths: v.split("\n").map((p) => p.trim()).filter(Boolean) });
  }

  async function compare() {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const repoPaths = paths.split("\n").map((p) => p.trim()).filter(Boolean);
      const res = await fetch("/api/watchtower/compare", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoPaths }),
      });
      const val = await res.json();
      if (!res.ok) throw new Error(val.error || "Project comparison failed.");
      setResult(val);
      updateCompare({ repoPaths, lastComparison: val, lastComparedAt: new Date().toISOString(), lastError: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Project comparison failed.";
      setError(msg); updateCompare({ lastError: msg });
    } finally { setLoading(false); }
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "PROJECT_RISK_COMPARISON_REPORT.json"; a.click(); URL.revokeObjectURL(url);
  }

  const specificCount = result?.projectSpecificRisks.reduce((sum, p) => sum + p.risks.length, 0) ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Local-only portfolio analysis"
        title="Compare Projects"
        description="Compare Watchtower reports across local projects — separate repeated baseline issues from project-specific risks."
      />

      {/* ── Input ── */}
      <section className="wt-card p-5">
        <label className="text-sm font-semibold text-slate-900" htmlFor="repo-paths">
          Repo paths — one per line
        </label>
        <textarea
          className="studio-textarea mt-2 font-mono text-xs"
          id="repo-paths"
          onChange={(e) => changePaths(e.target.value)}
          placeholder="/path/to/project-one&#10;/path/to/project-two&#10;/Users/name/IdeaProjects/Workout App"
          style={{ minHeight: "120px" }}
          value={paths}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton disabled={!paths.trim() || loading} isLoading={loading} label="Compare Projects" loadingLabel="Comparing…" onClick={compare} />
          <ActionButton disabled={loading} label="Load Demo Paths" onClick={() => changePaths(demoPaths)} variant="secondary" />
          <ActionButton disabled={!result} label="Download JSON Report" onClick={download} variant="secondary" />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Reads existing local Watchtower JSON reports. Missing reports are skipped. No code is uploaded or executed.
        </p>
      </section>

      <div className="mt-4"><ErrorBanner message={error} /></div>

      {/* ── Empty state ── */}
      {!result ? (
        <div className="mt-5">
          <EmptyState
            description="Load the demo paths or enter local project paths (one per line), then click Compare Projects."
            title="Ready to compare project risks"
          />
        </div>
      ) : (
        <div className="mt-5 space-y-5 wt-fade-up">

          {/* Metrics row */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricPill label="Projects compared"        value={result.projectsCompared.length} />
            <MetricPill label="Repeated baseline risks"  value={result.repeatedRisks.length}    accent="text-amber-700" />
            <MetricPill label="Project-specific risks"   value={specificCount}                  accent="text-red-600" />
            <MetricPill label="Likely false positives"   value={result.likelyFalsePositives.length} />
            <MetricPill label="Shared safe fixes"        value={result.sharedSafeFixes.length}  accent="text-emerald-700" />
            <MetricPill label="Manual review required"   value={result.manualReviewRequired.length} accent="text-amber-700" />
          </div>

          {/* Executive summary */}
          <section className="wt-card p-5">
            <h2 className="mb-2 font-semibold text-slate-950">Executive summary</h2>
            <p className="text-sm leading-6 text-slate-600">{result.executiveSummary}</p>
            {result.missingReports.map((item) => (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" key={item.reportPath}>
                Skipped <strong>{item.projectName}</strong>: {item.reason}
              </div>
            ))}
          </section>

          <RiskList
            title="Repeated baseline risks (across all projects)"
            items={result.repeatedRisks.map((r) => `${r.title} · ${r.classification} · ${r.appearsInProjects.join(", ")}`)}
            accent="border-amber-300 bg-amber-50 text-amber-800"
          />
          <RiskList
            title="Project-specific risks"
            items={result.projectSpecificRisks.flatMap((p) => p.risks.map((r) => `${p.projectName}: ${r.title} · ${r.severity}`))}
            accent="border-red-200 bg-red-50 text-red-800"
          />
          <RiskList
            title="Likely false positives"
            items={result.likelyFalsePositives.map((r) => `${r.projectName}: ${r.title} · ${r.reason}`)}
          />
          <RiskList
            title="Shared safe fixes"
            items={result.sharedSafeFixes.map((f) => `${f.title} · ${f.projects.join(", ")}`)}
            accent="border-emerald-200 bg-emerald-50 text-emerald-800"
          />
          <RiskList
            title="Manual review required"
            items={result.manualReviewRequired.map((r) => `${r.projectName}: ${r.title}`)}
            accent="border-amber-200 bg-amber-50 text-amber-800"
          />

          {/* Report paths */}
          {result.reportPaths && (
            <section className="wt-card p-5">
              <h2 className="mb-2 font-semibold text-slate-950">Comparison report written</h2>
              <p className="break-all font-mono text-xs text-slate-500">{result.reportPaths.markdownPath}</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-500">{result.reportPaths.jsonPath}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
