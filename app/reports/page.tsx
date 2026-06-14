"use client";
/* eslint-disable react-hooks/set-state-in-effect -- one-time portal session restoration is intentional */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePortalSession } from "@/components/providers/PortalSessionProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { WatchtowerUserReport } from "@/types/security";
import type { EnrichResponse, FindingEnrichment } from "@/lib/foundry-iq/types";

export default function ReportsPage() {
  const { session, hydrated, updateSession, updateReports, updateWatchtower } = usePortalSession();
  const restored = useRef(false);

  const [repoPath, setRepoPath] = useState("");
  const [report,   setReport]   = useState<WatchtowerUserReport | null>(null);
  const [active,   setActive]   = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [message,  setMessage]  = useState<string | null>(null);
  const [iqEnrichments, setIqEnrichments] = useState<FindingEnrichment[]>([]);
  const [iqMode,        setIqMode]        = useState<"azure" | "mock" | null>(null);
  const [iqFallback,    setIqFallback]    = useState(false);

  /* ── Restore from session ── */
  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    const savedReport = (session.reports.lastLoadedReport ?? session.watchtower.lastResult) as WatchtowerUserReport | null;
    setRepoPath(session.reports.repoPath || session.activeRepoPath || session.watchtower.repoPath);
    setReport(savedReport);
    setError(session.reports.lastError ?? null);
    if (session.watchtower.lastResult && !session.reports.lastLoadedReport) {
      setMessage("Showing last Watchtower scan — load report to refresh from disk.");
    }
  }, [hydrated, session]);

  function changeRepoPath(v: string) {
    setRepoPath(v);
    updateReports({ repoPath: v });
    updateSession({ activeRepoPath: v || undefined });
  }

  async function load() {
    setActive("load"); setError(null); setMessage(null);
    try {
      const res = await fetch("/api/watchtower/latest-report", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoPath }),
      });
      const val = await res.json().catch(() => ({ error: "API returned an invalid response." }));
      if (!res.ok) throw new Error(val.error || "Could not load report.");
      const next = val as WatchtowerUserReport;
      setReport(next); setMessage("Latest local Watchtower report loaded.");
      updateReports({ repoPath: next.repoPath, lastLoadedReport: next, lastLoadedAt: new Date().toISOString(), lastPdfPath: next.reportPaths.pdf, lastError: null });
      updateSession({ activeRepoPath: next.repoPath, lastDecision: next.decision, lastRiskScore: next.riskScore, lastFindingsCount: next.findings.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not load report.";
      setError(msg); updateReports({ lastError: msg });
    } finally { setActive(null); }
  }

  async function pdf() {
    setActive("pdf"); setError(null); setMessage(null);
    try {
      const res = await fetch("/api/watchtower/pdf-report", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoPath, foundryIqMode: iqMode, foundryIqEvidence: iqEnrichments }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "PDF generation failed.");
      const pdfPath = res.headers.get("X-Watchtower-PDF-Path") ?? report?.reportPaths.pdf;
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a"); a.href = url; a.download = "WATCHTOWER_SECURITY_REPORT.pdf"; a.click(); URL.revokeObjectURL(url);
      updateReports({ lastPdfPath: pdfPath, lastError: null });
      if (repoPath === session.watchtower.repoPath) updateWatchtower({ lastPdfPath: pdfPath });
      setMessage(`PDF downloaded${pdfPath ? `: ${pdfPath}` : "."}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not generate PDF.";
      setError(msg); updateReports({ lastError: msg });
    } finally { setActive(null); }
  }

  async function enrich() {
    if (!report?.findings.length) return;
    setActive("iq"); setError(null); setMessage(null);
    try {
      const payload = report.findings.map((f) => ({
        id: f.id, title: f.title, severity: f.severity, category: f.category,
        file: f.file, evidence: f.evidence, recommendedFix: f.recommendation,
      }));
      const res = await fetch("/api/foundry-iq/enrich", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ findings: payload }),
      });
      const data = await res.json().catch(() => ({ ok: false })) as EnrichResponse & { error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Enrichment failed.");
      setIqEnrichments(data.enrichments);
      setIqMode(data.mode);
      setIqFallback(data.fallbackUsed);
      setMessage(data.mode === "azure" && !data.fallbackUsed
        ? `Foundry IQ enrichment complete — Azure AI Search mode, ${data.enrichments.length} findings enriched.`
        : `Foundry IQ enrichment complete — Mock IQ Mode. Azure credentials not configured or retrieval failed.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Enrichment failed.";
      setError(msg);
      setIqFallback(true);
    } finally { setActive(null); }
  }

  const safeFixCount   = report?.fixPlan.filter((f) => !f.humanApprovalRequired).length ?? 0;
  const manualFixCount = report?.fixPlan.filter((f) =>  f.humanApprovalRequired).length ?? 0;
  const blocked = report ? /block|not_/i.test(report.decision) : false;
  const safe    = report ? /^safe/i.test(report.decision) && !blocked : false;
  const riskColor = safe ? "#10b981" : blocked ? "#ef4444" : "#f59e0b";

  return (
    <div>
      <PageHeader
        eyebrow="Local security evidence"
        title="Reports"
        description="View the latest Watchtower report for a local repository and export a PDF evidence pack."
        actions={
          <Link
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            href="/watchtower"
          >
            ← Back to Watchtower
          </Link>
        }
      />

      {/* ── Controls ── */}
      <section className="wt-card p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <input
            aria-label="Repository path"
            className="studio-input"
            disabled={Boolean(active)}
            onChange={(e) => changeRepoPath(e.target.value)}
            placeholder="/path/to/repository"
            value={repoPath}
          />
          <ActionButton disabled={!repoPath || Boolean(active)} isLoading={active === "load"} label="Load Latest Report" onClick={load} />
          <ActionButton disabled={!repoPath || Boolean(active)} isLoading={active === "pdf"} label="Download PDF" onClick={pdf} variant="secondary" />
          <ActionButton disabled={!report?.findings.length || Boolean(active)} isLoading={active === "iq"} label="Enrich with Foundry IQ" loadingLabel="Enriching…" onClick={enrich} variant="secondary" />
        </div>
        <div className="mt-3 space-y-2">
          <ErrorBanner message={error} />
          {message && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
              {message}
            </p>
          )}
        </div>
      </section>

      {/* ── Report display ── */}
      {!report ? (
        <div className="mt-5">
          <EmptyState
            description="Enter a repo path and click Load Latest Report, or go to Watchtower and run a scan first."
            title="No report loaded"
          />
        </div>
      ) : (
        <div className="mt-5 space-y-5 wt-fade-up">

          {/* Summary banner */}
          <div className={`rounded-2xl border p-5 shadow-sm ${safe ? "border-emerald-200 bg-emerald-50" : blocked ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: riskColor }}>Decision</p>
                <h2 className="mt-1 text-2xl font-bold" style={{ color: riskColor }}>{report.decision.replaceAll("_", " ")}</h2>
                <p className="mt-1 text-sm text-slate-600">{report.shortRiskNote}</p>
                <div className="mt-3"><StatusBadge status={report.decision} /></div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold" style={{ color: riskColor }}>{report.riskScore}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Risk score / 100</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Findings",      value: report.findings.length },
                { label: "Fix plan",      value: report.fixPlan.length },
                { label: "Safe auto-fix", value: safeFixCount },
                { label: "Manual review", value: manualFixCount },
              ].map(({ label, value }) => (
                <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-2.5 text-center" key={label}>
                  <div className="text-xl font-bold text-slate-950">{value}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Findings */}
          <section className="wt-card p-5">
            <h2 className="mb-3 font-semibold text-slate-950">Findings</h2>
            {report.findings.length === 0 ? (
              <p className="text-sm text-slate-500">No findings.</p>
            ) : (
              <div className="space-y-3">
                {report.findings.map((finding) => {
                  const sev = finding.severity.toLowerCase();
                  const cls = sev === "critical" ? "border-red-200 bg-red-50"
                    : sev === "high"   ? "border-orange-200 bg-orange-50"
                    : sev === "medium" ? "border-amber-200 bg-amber-50"
                    :                   "border-slate-200 bg-slate-50";
                  return (
                    <article className={`rounded-lg border p-3 ${cls}`} key={finding.id}>
                      <div className="flex flex-wrap items-start gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
                          {finding.severity}
                        </span>
                        <strong className="text-sm text-slate-900">{finding.title}</strong>
                      </div>
                      {finding.file && (
                        <p className="mt-1 truncate font-mono text-xs text-slate-500">{finding.file}{finding.line ? `:${finding.line}` : ""}</p>
                      )}
                      <p className="mt-1 text-sm text-slate-600">{finding.recommendation}</p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Fix plan */}
          <section className="wt-card p-5">
            <h2 className="mb-3 font-semibold text-slate-950">Fix Plan</h2>
            {report.fixPlan.length === 0 ? (
              <p className="text-sm text-slate-500">No fixes planned.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {report.fixPlan.map((fix) => (
                  <article
                    className={`rounded-xl border p-4 ${fix.humanApprovalRequired ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
                    key={fix.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <strong className="text-sm text-slate-900">{fix.title}</strong>
                      <StatusBadge status={fix.humanApprovalRequired ? "needs_review" : "safe"} />
                    </div>
                    {fix.file && <p className="mt-1 truncate font-mono text-xs text-slate-500">{fix.file}</p>}
                    <p className="mt-2 text-sm text-slate-700">{fix.recommendedFix}</p>
                    <p className={`mt-2 text-xs font-semibold ${fix.humanApprovalRequired ? "text-amber-700" : "text-emerald-700"}`}>
                      {fix.humanApprovalRequired ? "Manual review required" : "Safe auto-fix"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ── Foundry IQ enrichment ── */}
          {iqEnrichments.length > 0 && (
            <section className={`wt-card p-5 wt-fade-up ${iqMode === "azure" ? "border-blue-200 bg-blue-50/40" : "border-amber-100"}`}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="font-semibold text-slate-950">Foundry IQ Policy Grounding</h2>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${iqMode === "azure" && !iqFallback ? "border-blue-300 bg-blue-100 text-blue-800" : "border-amber-300 bg-amber-100 text-amber-800"}`}>
                  {iqMode === "azure" && !iqFallback ? "Foundry IQ Mode Active" : "Mock IQ Mode — Azure credentials not configured or retrieval failed."}
                </span>
              </div>
              <div className="space-y-3">
                {iqEnrichments.map((enrich) => {
                  const finding = report.findings.find((f) => f.id === enrich.findingId);
                  return (
                    <article className="rounded-xl border border-slate-200 bg-white p-4" key={enrich.findingId}>
                      <p className="font-semibold text-slate-900">{finding?.title ?? enrich.findingId}</p>
                      <p className="mt-1 text-sm text-slate-700">{enrich.recommendation}</p>
                      {enrich.citations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {enrich.citations.map((c, i) => (
                            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600" key={`${c.source}-${i}`}>
                              {c.title} · <span className="font-mono">{c.source}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Report paths */}
          <section className="wt-card p-5">
            <h2 className="mb-3 font-semibold text-slate-950">Report file paths</h2>
            <div className="space-y-1.5">
              {Object.entries(report.reportPaths).map(([key, val]) => (
                <p className="break-all font-mono text-xs text-slate-500" key={key}>
                  <span className="font-semibold text-slate-700">{key}:</span> {val}
                </p>
              ))}
            </div>
            <div className="mt-4">
              <ActionButton disabled={!repoPath || Boolean(active)} isLoading={active === "pdf"} label="Download PDF Report" onClick={pdf} variant="secondary" />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
