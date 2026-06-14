"use client";
/* eslint-disable react-hooks/set-state-in-effect -- one-time portal session restoration is intentional */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePortalSession } from "@/components/providers/PortalSessionProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { WatchtowerUserReport } from "@/types/security";

const demoPath = "/Users/shivareddy/IdeaProjects/Workout App";
const checkOptions = [
  ["repo_safety", "Repo safety"], ["agent_mcp_config", "Agent/MCP config risks"], ["git_diff_scope", "Git diff / scope creep"],
  ["secrets_sensitive_data", "Secrets and sensitive data"], ["package_workflow_risks", "Package and workflow risks"], ["output_firewall", "Output firewall"],
  ["generate_repo_safety_files", "Generate repo safety files"], ["code_security_review", "Code security review"],
] as const;
const allChecks = checkOptions.map(([id]) => id);
const quickChecks = ["repo_safety", "secrets_sensitive_data", "git_diff_scope"];
const filters = ["All", "Critical", "High", "Safe fixes", "Manual review"] as const;
type FixOutcome = { applied: { fixId: string; file: string; message: string }[]; skipped: { fixId: string; reason: string }[]; reportPath: string };

export default function WatchtowerPage() {
  const { session, hydrated, updateSession, updateWatchtower, clearSession } = usePortalSession();
  const restored = useRef(false);
  const [repoPath, setRepoPath] = useState("");
  const [preset, setPreset] = useState("quick");
  const [checks, setChecks] = useState<string[]>(quickChecks);
  const [result, setResult] = useState<WatchtowerUserReport | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [fixOutcome, setFixOutcome] = useState<FixOutcome | null>(null);
  const [patch, setPatch] = useState<{ patchPath: string; patchPreview: string; manualReviewRequired: true } | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [search, setSearch] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);
  const safeIds = result?.fixPlan.filter((fix) => !fix.humanApprovalRequired).map((fix) => fix.id.replace(/^FIX-/, "")) ?? [];
  const manualIds = result?.fixPlan.filter((fix) => fix.humanApprovalRequired).map((fix) => fix.id.replace(/^FIX-/, "")) ?? [];
  const selectedSafe = safeIds.filter((id) => selected.includes(id));
  const visible = useMemo(() => (result?.findings ?? []).filter((finding) => {
    const query = `${finding.file ?? ""} ${finding.title} ${finding.shortNote} ${finding.recommendation}`.toLowerCase();
    return (filter === "All" || filter.toLowerCase() === finding.severity || (filter === "Safe fixes" && finding.safeFixAvailable) || (filter === "Manual review" && finding.humanApprovalRequired)) && (!search || query.includes(search.toLowerCase()));
  }), [filter, result, search]);

  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    const saved = session.watchtower;
    setRepoPath(saved.repoPath);
    setChecks(saved.selectedChecks.length ? saved.selectedChecks : quickChecks);
    setPreset(saved.selectedChecks.length === allChecks.length ? "full" : "quick");
    setSelected(saved.selectedFixIds);
    setResult(saved.lastResult as WatchtowerUserReport | null);
    setLastScanAt(saved.lastScanAt);
    setFixOutcome(saved.lastApplyFixesResult ? { ...saved.lastApplyFixesResult, reportPath: "" } : null);
    setPatch(saved.lastPatchPath ? { patchPath: saved.lastPatchPath, patchPreview: saved.lastPatchPreview ?? "Patch preview was not retained in this compact session.", manualReviewRequired: true } : null);
    setError(saved.lastError ?? null);
    if (saved.isScanRunning) {
      setMessage("Previous scan was interrupted. Run scan again.");
      updateWatchtower({ isScanRunning: false });
    }
  }, [hydrated, session.watchtower, updateWatchtower]);

  function persistRepoPath(value: string) {
    setRepoPath(value);
    updateWatchtower({ repoPath: value });
    updateSession({ activeRepoPath: value || undefined });
  }
  function persistChecks(value: string[]) {
    setChecks(value);
    updateWatchtower({ selectedChecks: value });
  }
  function persistSelected(value: string[]) {
    setSelected(value);
    updateWatchtower({ selectedFixIds: value });
  }

  async function run(name: string, action: () => Promise<void>) {
    if (activeAction) return;
    setActiveAction(name); setError(null); setMessage(null);
    try { await action(); } catch (value) {
      console.warn(`Watchtower ${name} request failed`, value);
      const nextError = value instanceof Error ? value.message : "The local Watchtower request failed.";
      setError(nextError);
      updateWatchtower({ lastError: nextError, isScanRunning: false });
    } finally { setActiveAction(null); }
  }
  function normalizedRepoPath() {
    const normalized = repoPath.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
    if (normalized !== repoPath) persistRepoPath(normalized);
    return normalized;
  }
  async function postJson(url: string, body: object) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const value = await response.json().catch(() => ({ error: "The local Watchtower API returned an invalid response." }));
    if (!response.ok) return { error: value.error || "The local Watchtower request failed." };
    return value;
  }
  async function scan() {
    updateWatchtower({ isScanRunning: true, startedAt: new Date().toISOString(), lastError: null });
    await run("scan", async () => {
      const payload = await postJson("/api/watchtower/ui-scan", { repoPath: normalizedRepoPath(), checks });
      if ("error" in payload) { setError(payload.error); updateWatchtower({ lastError: payload.error, isScanRunning: false }); return; }
      const report = (payload.result ?? payload) as WatchtowerUserReport;
      setResult(report); persistSelected([]); setFixOutcome(null); setPatch(null); setLastScanAt(report.scannedAt); setMessage("Local Watchtower scan completed.");
      updateWatchtower({ repoPath: report.repoPath, selectedChecks: checks, selectedFixIds: [], lastResult: report, lastScanAt: report.scannedAt, lastJsonPath: report.reportPaths.json, lastMarkdownPath: report.reportPaths.markdown, lastPdfPath: report.reportPaths.pdf, lastPatchPath: undefined, lastPatchPreview: undefined, lastApplyFixesResult: undefined, lastError: null, isScanRunning: false, startedAt: undefined });
      updateSession({ activeRepoPath: report.repoPath, lastDecision: report.decision, lastRiskScore: report.riskScore, lastFindingsCount: report.findings.length });
    });
    updateWatchtower({ isScanRunning: false });
  }
  async function applyFixes() {
    await run("fix", async () => {
      const payload = await postJson("/api/watchtower/apply-fixes", { repoPath: normalizedRepoPath(), fixIds: selectedSafe.map((id) => `FIX-${id}`) });
      if ("error" in payload) { setError(payload.error); updateWatchtower({ lastError: payload.error }); return; }
      const outcome = payload as FixOutcome;
      setFixOutcome(outcome); updateWatchtower({ lastApplyFixesResult: { applied: outcome.applied, skipped: outcome.skipped }, lastError: null }); setMessage(`${outcome.applied.length} safe fixes applied. ${outcome.skipped.length} skipped. Re-scan to verify.`);
    });
  }
  async function generatePatch() {
    await run("patch", async () => {
      const selectedManual = selected.filter((id) => manualIds.includes(id));
      const output = await postJson("/api/watchtower/generate-patch", { repoPath: normalizedRepoPath(), fixIds: (selectedManual.length ? selectedManual : manualIds).map((id) => `FIX-${id}`) });
      if ("error" in output) { setError(output.error); updateWatchtower({ lastError: output.error }); return; }
      setPatch(output); updateWatchtower({ lastPatchPath: output.patchPath, lastPatchPreview: output.patchPreview, lastError: null }); setMessage("Manual-review patch preview generated. No risky files were modified.");
    });
  }
  async function downloadPdf() {
    await run("pdf", async () => {
      const response = await fetch("/api/watchtower/pdf-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoPath: normalizedRepoPath() }) });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); setError(payload.error || "PDF report generation failed."); updateWatchtower({ lastError: payload.error || "PDF report generation failed." }); return; }
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = "WATCHTOWER_SECURITY_REPORT.pdf"; link.click(); URL.revokeObjectURL(url);
      updateWatchtower({ lastPdfPath: result?.reportPaths.pdf ?? ".agent-control-tower/WATCHTOWER_SECURITY_REPORT.pdf", lastError: null });
      setMessage(`PDF report generated and downloaded: ${result?.reportPaths.pdf ?? ".agent-control-tower/WATCHTOWER_SECURITY_REPORT.pdf"}`);
    });
  }
  function selectPreset(value: string) {
    setPreset(value);
    if (value === "quick") persistChecks(quickChecks);
    else if (value === "full") persistChecks(allChecks);
    else if (value === "secrets_sensitive_data") persistChecks(["secrets_sensitive_data"]);
    else if (value === "code_security_review") persistChecks(["code_security_review"]);
    else persistChecks(["repo_safety", "generate_repo_safety_files"]);
  }
  function resetUiSession() {
    clearSession();
    restored.current = true;
    setRepoPath(""); setPreset("quick"); setChecks(quickChecks); setResult(null); setSelected([]); setFixOutcome(null); setPatch(null); setError(null); setMessage("Portal UI session cleared. Project files were not deleted."); setLastScanAt(null);
  }
  function downloadJson() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "watchtower-user-report.json"; link.click(); URL.revokeObjectURL(url);
  }
  const fixStatus = (id: string, safe: boolean) => fixOutcome?.applied.some((item) => item.fixId === `FIX-${id}`) ? "Already fixed" : fixOutcome?.skipped.some((item) => item.fixId === `FIX-${id}`) ? "Skipped" : safe ? "Can auto-fix" : "Manual review required";
  const safeFixCount = result?.fixPlan.filter((fix) => !fix.humanApprovalRequired).length ?? 0;
  const manualFixCount = result?.fixPlan.filter((fix) => fix.humanApprovalRequired).length ?? 0;

  return <div>
    <PageHeader eyebrow="Local project security" title="Agent Watchtower" description="Scan project → Review risks → Download report → Apply safe fixes → Re-scan" />
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm"><span>{lastScanAt ? `Last scan: ${new Date(lastScanAt).toLocaleString()}` : "No scan saved in this portal session."}</span><ActionButton label="Clear Session" onClick={resetUiSession} variant="secondary" /></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]">
        <input aria-label="Repo path" className="studio-input" disabled={Boolean(activeAction)} onChange={(event) => persistRepoPath(event.target.value)} placeholder="/path/to/project" value={repoPath} />
        <select aria-label="Scan preset" className="studio-input" disabled={Boolean(activeAction)} onChange={(event) => selectPreset(event.target.value)} value={preset}><option value="quick">Quick Scan</option><option value="full">Full Scan</option><option value="secrets_sensitive_data">Secrets Only</option><option value="code_security_review">Code Security</option><option value="repo_setup">Repo Setup</option></select>
        <ActionButton disabled={!repoPath.trim() || !checks.length || Boolean(activeAction)} isLoading={activeAction === "scan"} label="Run Scan" loadingLabel="Scanning..." onClick={scan} />
        <ActionButton disabled={Boolean(activeAction)} label="Load Demo Project" onClick={() => { persistRepoPath(demoPath); setError(null); updateWatchtower({ lastError: null }); }} variant="secondary" />
      </div><p className="mt-3 text-xs text-slate-500">Local scan only. No source upload. No project code execution.</p>
    </section>
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Checks</h2><div className="flex flex-wrap gap-2"><ActionButton label="Select All" onClick={() => persistChecks(allChecks)} variant="secondary" /><ActionButton label="Clear All" onClick={() => persistChecks([])} variant="secondary" /><ActionButton label="Quick Scan" onClick={() => selectPreset("quick")} variant="secondary" /><ActionButton label="Full Scan" onClick={() => selectPreset("full")} variant="secondary" /></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{checkOptions.map(([id, label]) => <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm" key={id}><input aria-label={label} checked={checks.includes(id)} onChange={(event) => persistChecks(event.target.checked ? [...checks, id] : checks.filter((check) => check !== id))} type="checkbox" />{label}</label>)}</div>
    </section>
    <div className="mt-4"><ErrorBanner message={error} />{message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">{message}</div> : null}</div>
    {!result ? <div className="mt-5"><EmptyState description="Enter any valid local repo path, select checks, and run a real Watchtower scan." title="Ready for a local scan" /></div> : <div className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><MetricCard action={<StatusBadge status={result.decision} />} detail={result.shortRiskNote} label="Decision" value={result.decision.replaceAll("_", " ")} /><MetricCard label="Risk score" value={`${result.riskScore}/100`} /><MetricCard label="Findings" value={result.findings.length} /><MetricCard label="Fixes" value={result.fixPlan.length} /><MetricCard label="Safe fixes" value={safeFixCount} /><MetricCard label="Manual review" value={manualFixCount} /></div>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap gap-2">{filters.map((item) => <button className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === item ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`} key={item} onClick={() => setFilter(item)} type="button">{item}</button>)}</div><input aria-label="Search findings" className="studio-input xl:max-w-xs" onChange={(event) => setSearch(event.target.value)} placeholder="Search file or risk" value={search} /></div>
        <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Select", "Severity", "Risk", "File", "Short note", "Recommended fix", "Fix status"].map((title) => <th className="p-3" key={title}>{title}</th>)}</tr></thead><tbody>{visible.map((finding) => <tr className="border-t border-slate-100 align-top" key={finding.id}><td className="p-3"><input aria-label={`Select finding ${finding.id}`} checked={selected.includes(finding.id)} onChange={(event) => persistSelected(event.target.checked ? [...new Set([...selected, finding.id])] : selected.filter((id) => id !== finding.id))} type="checkbox" /></td><td className="p-3"><StatusBadge status={finding.severity} /></td><td className="p-3 font-semibold">{finding.title}</td><td className="p-3 font-mono text-xs">{finding.file ?? "repository"}{finding.line ? `:${finding.line}` : ""}</td><td className="p-3 text-slate-600">{finding.shortNote}</td><td className="p-3 text-slate-600">{finding.recommendation}</td><td className="p-3 text-xs font-semibold">{fixStatus(finding.id, finding.safeFixAvailable)}</td></tr>)}</tbody></table>{!visible.length ? <p className="p-6 text-center text-sm text-slate-500">No findings match the current filters.</p> : null}</div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 p-4"><ActionButton disabled={!safeIds.length} label="Select All Safe Fixes" onClick={() => persistSelected([...new Set([...selected, ...safeIds])])} variant="secondary" /><ActionButton disabled={!selected.length} label="Clear Fix Selection" onClick={() => persistSelected([])} variant="secondary" /><ActionButton disabled={!selectedSafe.length || Boolean(activeAction)} isLoading={activeAction === "fix"} label="Fix Selected Safe Issues" loadingLabel="Applying..." onClick={applyFixes} /><ActionButton disabled={!manualIds.length || Boolean(activeAction)} isLoading={activeAction === "patch"} label="Generate Patch for Review" loadingLabel="Generating..." onClick={generatePatch} variant="secondary" /><ActionButton disabled={Boolean(activeAction)} isLoading={activeAction === "pdf"} label="Download PDF Report" loadingLabel="Generating PDF..." onClick={downloadPdf} variant="secondary" /><ActionButton label="Download JSON" onClick={downloadJson} variant="secondary" /><ActionButton disabled={Boolean(activeAction)} label="Re-scan" onClick={scan} variant="secondary" /><span className="text-xs font-semibold text-slate-500">{selectedSafe.length} safe fixes selected</span></div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Fix Plan</h2><p className="text-xs text-slate-500">{safeFixCount} safe auto-fix · {manualFixCount} manual review</p></div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">{result.fixPlan.map((fix) => <article className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={fix.id}><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-950">{fix.title}</h3><StatusBadge status={fix.humanApprovalRequired ? "needs_review" : "safe"} /></div><p className="mt-2 font-mono text-xs text-slate-500">{fix.file ?? "repository"}</p><p className="mt-3 text-sm text-slate-700">{fix.recommendedFix}</p><p className="mt-3 rounded-lg bg-white p-3 text-xs leading-5 text-slate-600">{fix.safePatchPreview}</p><p className={`mt-3 text-xs font-semibold ${fix.humanApprovalRequired ? "text-amber-700" : "text-emerald-700"}`}>{fix.humanApprovalRequired ? "Manual review required" : "Safe auto-fix"}</p></article>)}</div>
      </section>
      {fixOutcome ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Safe fix result</h2>{fixOutcome.applied.map((item) => <p className="mt-2 text-sm text-emerald-700" key={item.fixId}>Applied: {item.file} — {item.message}</p>)}{fixOutcome.skipped.map((item) => <p className="mt-2 text-sm text-amber-700" key={item.fixId}>Skipped: {item.fixId} — {item.reason}</p>)}<p className="mt-4 text-sm font-semibold text-blue-700">Re-scan to verify.</p></section> : null}
      {patch ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-semibold">Manual-review patch preview</h2><p className="mt-3 break-all text-sm">{patch.patchPath}</p><details className="mt-4 rounded-xl border border-amber-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">Patch preview</summary><pre className="studio-preview mt-3">{patch.patchPreview}</pre></details></section> : null}
      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer font-semibold">Raw JSON</summary><pre className="studio-preview mt-3">{JSON.stringify(result, null, 2)}</pre></details>
      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer font-semibold">Developer debug</summary><p className="mt-3 text-sm text-slate-600">Checks: {result.checksRun.join(", ")}</p><p className="mt-2 break-all text-xs text-slate-500">JSON: {result.reportPaths.json}</p><p className="mt-2 break-all text-xs text-slate-500">Markdown: {result.reportPaths.markdown}</p><p className="mt-2 break-all text-xs text-slate-500">PDF: {result.reportPaths.pdf}</p></details>
    </div>}
  </div>;
}
