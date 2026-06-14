"use client";
/* eslint-disable react-hooks/set-state-in-effect -- one-time portal session restoration is intentional */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePortalSession } from "@/components/providers/PortalSessionProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { WatchtowerUserReport } from "@/types/security";

export default function ReportsPage() {
  const { session, hydrated, updateSession, updateReports, updateWatchtower } = usePortalSession();
  const restored = useRef(false);
  const [repoPath, setRepoPath] = useState("");
  const [report, setReport] = useState<WatchtowerUserReport | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    const savedReport = (session.reports.lastLoadedReport ?? session.watchtower.lastResult) as WatchtowerUserReport | null;
    setRepoPath(session.reports.repoPath || session.activeRepoPath || session.watchtower.repoPath);
    setReport(savedReport);
    setError(session.reports.lastError ?? null);
    if (session.watchtower.lastResult) setMessage("Loaded from last Watchtower session");
  }, [hydrated, session]);

  function changeRepoPath(value: string) {
    setRepoPath(value);
    updateReports({ repoPath: value });
    updateSession({ activeRepoPath: value || undefined });
  }
  async function load() {
    setActive("load"); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/watchtower/latest-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoPath }) });
      const value = await response.json().catch(() => ({ error: "The latest-report API returned an invalid response." }));
      if (!response.ok) throw new Error(value.error || "Could not load report.");
      const next = value as WatchtowerUserReport;
      setReport(next); setMessage("Latest local Watchtower report loaded.");
      updateReports({ repoPath: next.repoPath, lastLoadedReport: next, lastLoadedAt: new Date().toISOString(), lastPdfPath: next.reportPaths.pdf, lastError: null });
      updateSession({ activeRepoPath: next.repoPath, lastDecision: next.decision, lastRiskScore: next.riskScore, lastFindingsCount: next.findings.length });
    } catch (value) {
      const nextError = value instanceof Error ? value.message : "Could not load report.";
      setError(nextError); updateReports({ lastError: nextError });
    } finally { setActive(null); }
  }
  async function pdf() {
    setActive("pdf"); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/watchtower/pdf-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoPath }) });
      if (!response.ok) throw new Error((await response.json()).error);
      const pdfPath = response.headers.get("X-Watchtower-PDF-Path") ?? report?.reportPaths.pdf;
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = "WATCHTOWER_SECURITY_REPORT.pdf"; link.click(); URL.revokeObjectURL(url);
      updateReports({ lastPdfPath: pdfPath, lastError: null });
      if (repoPath === session.watchtower.repoPath) updateWatchtower({ lastPdfPath: pdfPath });
      setMessage(`PDF report generated and downloaded${pdfPath ? `: ${pdfPath}` : "."}`);
    } catch (value) {
      const nextError = value instanceof Error ? value.message : "Could not generate PDF.";
      setError(nextError); updateReports({ lastError: nextError });
    } finally { setActive(null); }
  }
  return <div><PageHeader actions={<Link className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50" href="/watchtower">Back to Watchtower</Link>} eyebrow="Local security evidence" title="Reports" description="Load the latest Watchtower report for a local repository and export its PDF evidence pack." />
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]"><input aria-label="Repo path" className="studio-input" onChange={(event) => changeRepoPath(event.target.value)} placeholder="/path/to/repository" value={repoPath} /><ActionButton disabled={!repoPath || Boolean(active)} isLoading={active === "load"} label="Load Latest Report" onClick={load} /><ActionButton disabled={!repoPath || Boolean(active)} isLoading={active === "pdf"} label="Download PDF" onClick={pdf} variant="secondary" /></div><div className="mt-3"><ErrorBanner message={error} />{message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">{message}</p> : null}</div></section>
    {report ? <div className="mt-5 space-y-5"><div className="grid gap-3 sm:grid-cols-4"><MetricCard action={<StatusBadge status={report.decision} />} label="Decision" value={report.decision.replaceAll("_", " ")} /><MetricCard label="Risk score" value={`${report.riskScore}/100`} /><MetricCard label="Findings" value={report.findings.length} /><MetricCard label="Fix plan" value={report.fixPlan.length} /></div><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Latest findings and fix plan</h2>{report.findings.map((finding) => <p className="mt-3 text-sm text-slate-600" key={finding.id}><strong className="text-slate-900">{finding.title}</strong> · {finding.file}: {finding.recommendation}</p>)}<h2 className="mt-6 font-semibold">Fix Plan</h2>{report.fixPlan.map((fix) => <p className="mt-3 text-sm text-slate-600" key={fix.id}><strong className="text-slate-900">{fix.title}</strong> · {fix.file}: {fix.recommendedFix} <span className={fix.humanApprovalRequired ? "text-amber-700" : "text-emerald-700"}>({fix.humanApprovalRequired ? "manual review" : "safe auto-fix"})</span></p>)}<h2 className="mt-6 font-semibold">Report file paths</h2>{Object.values(report.reportPaths).map((path) => <p className="mt-2 break-all font-mono text-xs text-slate-600" key={path}>{path}</p>)}</section></div> : null}
  </div>;
}
