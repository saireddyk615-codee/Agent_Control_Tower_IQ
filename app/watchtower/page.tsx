"use client";
/* eslint-disable react-hooks/set-state-in-effect -- one-time portal session restoration is intentional */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePortalSession } from "@/components/providers/PortalSessionProvider";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { WatchtowerUserReport } from "@/types/security";
import type { EnrichResponse, FindingEnrichment } from "@/lib/foundry-iq/types";

const demoPath = "/Users/shivareddy/IdeaProjects/Workout App";

const checkOptions = [
  ["repo_safety",                "Repo safety"],
  ["agent_mcp_config",           "Agent / MCP config"],
  ["git_diff_scope",             "Git diff / scope creep"],
  ["secrets_sensitive_data",     "Secrets & sensitive data"],
  ["package_workflow_risks",     "Package & workflow risks"],
  ["output_firewall",            "Output firewall"],
  ["generate_repo_safety_files", "Generate safety files"],
  ["code_security_review",       "Code security review"],
] as const;

const allChecks   = checkOptions.map(([id]) => id);
const quickChecks = ["repo_safety", "secrets_sensitive_data", "git_diff_scope"];

const FILTERS = ["All", "Critical", "High", "Safe fixes", "Manual review"] as const;
type Filter = (typeof FILTERS)[number];

type FixOutcome = {
  ok?: boolean;
  message?: string;
  applied: { fixId: string; file: string; message: string }[];
  skipped: { fixId: string; reason: string }[];
  reportPath: string;
};

/* ── Animated scan progress banner ── */
function ScanProgressBanner({ isScanning }: { isScanning: boolean }) {
  if (!isScanning) return null;
  return (
    <div className="relative mb-4 overflow-hidden rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="wt-spin inline-block h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="wt-pulse text-sm font-semibold text-blue-800">
          Scanning… static analysis only — no code execution, no upload
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
        <div className="wt-scan-bar h-full rounded-full bg-blue-500" />
      </div>
    </div>
  );
}

/* ── Animated risk score arc ── */
function RiskScoreArc({ score }: { score: number }) {
  const r    = 42;
  const circ = 2 * Math.PI * r; // ≈ 264
  const offset = circ - (score / 100) * circ;
  const color  = score >= 75 ? "#ef4444" : score >= 45 ? "#f59e0b" : "#10b981";
  return (
    <div className="relative flex h-28 w-28 items-center justify-center shrink-0">
      <svg className="absolute inset-0 -rotate-90" height="112" viewBox="0 0 112 112" width="112">
        <circle cx="56" cy="56" fill="none" r={r} stroke="#e2e8f0" strokeWidth="8" />
        <circle
          className="wt-score-arc"
          cx="56" cy="56" fill="none" r={r}
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round" strokeWidth="8"
          style={{ "--score-offset": offset } as React.CSSProperties}
        />
      </svg>
      <div className="text-center">
        <div className="text-2xl font-bold" style={{ color }}>{score}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">/ 100</div>
      </div>
    </div>
  );
}

/* ── Decision + metrics banner ── */
function DecisionCard({ result }: { result: WatchtowerUserReport }) {
  const blocked  = /block|not_/i.test(result.decision);
  const safe     = /^safe/i.test(result.decision) && !blocked;
  const borderCls = safe ? "border-emerald-200 bg-emerald-50" : blocked ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50";
  const labelCls  = safe ? "text-emerald-800" : blocked ? "text-red-800" : "text-amber-800";
  const safeCount   = result.fixPlan.filter((f) => !f.humanApprovalRequired).length;
  const manualCount = result.fixPlan.filter((f) =>  f.humanApprovalRequired).length;

  return (
    <div className={`wt-fade-up rounded-2xl border p-5 shadow-sm ${borderCls}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest ${labelCls}`}>Scan decision</p>
          <h2 className={`mt-1 text-2xl font-bold ${labelCls}`}>{result.decision.replaceAll("_", " ")}</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-600">{result.shortRiskNote}</p>
          <div className="mt-3">
            <StatusBadge status={result.decision} />
          </div>
        </div>
        <RiskScoreArc score={result.riskScore} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Findings",      value: result.findings.length },
          { label: "Fix plan",      value: result.fixPlan.length },
          { label: "Safe auto-fix", value: safeCount },
          { label: "Manual review", value: manualCount },
        ].map(({ label, value }) => (
          <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-2.5 text-center backdrop-blur-sm" key={label}>
            <div className="text-xl font-bold text-slate-950">{value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Severity chip ── */
function SeverityChip({ severity }: { severity: string }) {
  const s = severity.toLowerCase();
  const cls =
    s === "critical" ? "bg-red-100 text-red-700 border-red-200"
    : s === "high"   ? "bg-orange-100 text-orange-700 border-orange-200"
    : s === "medium" ? "bg-amber-100 text-amber-700 border-amber-200"
    :                  "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {severity}
    </span>
  );
}

export default function WatchtowerPage() {
  const { session, hydrated, updateSession, updateWatchtower, clearSession } = usePortalSession();
  const restored = useRef(false);

  const [repoPath,     setRepoPath]     = useState("");
  const [preset,       setPreset]       = useState("quick");
  const [checks,       setChecks]       = useState<string[]>(quickChecks);
  const [result,       setResult]       = useState<WatchtowerUserReport | null>(null);
  const [selected,     setSelected]     = useState<string[]>([]);
  const [fixOutcome,   setFixOutcome]   = useState<FixOutcome | null>(null);
  const [patch,        setPatch]        = useState<{ patchPath: string; patchPreview: string; manualReviewRequired: true } | null>(null);
  const [filter,       setFilter]       = useState<Filter>("All");
  const [search,       setSearch]       = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [message,      setMessage]      = useState<string | null>(null);
  const [lastScanAt,   setLastScanAt]   = useState<string | null>(null);

  /* ── Foundry IQ enrichment state ── */
  const [iqEnrichments, setIqEnrichments] = useState<FindingEnrichment[]>([]);
  const [iqMode,        setIqMode]        = useState<"azure" | "mock" | null>(null);
  const [iqFallback,    setIqFallback]    = useState(false);
  const [iqError,       setIqError]       = useState<string | null>(null);

  const safeIds      = result?.fixPlan.filter((f) => !f.humanApprovalRequired).map((f) => f.id.replace(/^FIX-/, "")) ?? [];
  const manualIds    = result?.fixPlan.filter((f) =>  f.humanApprovalRequired).map((f) => f.id.replace(/^FIX-/, "")) ?? [];
  const selectedSafe = safeIds.filter((id) => selected.includes(id));
  const selectedManual = manualIds.filter((id) => selected.includes(id));

  const visible = useMemo(() => (result?.findings ?? []).filter((finding) => {
    const q = `${finding.file ?? ""} ${finding.title} ${finding.shortNote} ${finding.recommendation}`.toLowerCase();
    return (
      filter === "All" ||
      filter.toLowerCase() === finding.severity ||
      (filter === "Safe fixes"    && finding.safeFixAvailable) ||
      (filter === "Manual review" && finding.humanApprovalRequired)
    ) && (!search || q.includes(search.toLowerCase()));
  }), [filter, result, search]);

  /* ── Session restore ── */
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
    setPatch(saved.lastPatchPath
      ? { patchPath: saved.lastPatchPath, patchPreview: saved.lastPatchPreview ?? "Patch preview unavailable.", manualReviewRequired: true }
      : null);
    setError(saved.lastError ?? null);
    if (saved.isScanRunning) {
      setMessage("Previous scan was interrupted. Run scan again.");
      updateWatchtower({ isScanRunning: false });
    }
  }, [hydrated, session.watchtower, updateWatchtower]);

  /* ── Persist helpers ── */
  function persistRepoPath(v: string) { setRepoPath(v); updateWatchtower({ repoPath: v }); updateSession({ activeRepoPath: v || undefined }); }
  function persistChecks(v: string[])  { setChecks(v);  updateWatchtower({ selectedChecks: v }); }
  function persistSelected(v: string[]) { setSelected(v); updateWatchtower({ selectedFixIds: v }); }

  /* ── Action runner ── */
  async function run(name: string, action: () => Promise<void>) {
    if (activeAction) return;
    setActiveAction(name); setError(null); setMessage(null);
    try { await action(); }
    catch (err) {
      const msg = err instanceof Error ? err.message : "Watchtower request failed.";
      setError(msg); updateWatchtower({ lastError: msg, isScanRunning: false });
    } finally { setActiveAction(null); }
  }

  function normalizedPath() {
    const n = repoPath.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
    if (n !== repoPath) persistRepoPath(n);
    return n;
  }

  async function postJson(url: string, body: object) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const val = await res.json().catch(() => ({ error: "API returned an invalid response." }));
    if (!res.ok) return { error: val.error || "Watchtower request failed." };
    return val;
  }

  /* ── Core actions ── */
  async function scan() {
    updateWatchtower({ isScanRunning: true, startedAt: new Date().toISOString(), lastError: null });
    await run("scan", async () => {
      const payload = await postJson("/api/watchtower/ui-scan", { repoPath: normalizedPath(), checks });
      if ("error" in payload) { setError(payload.error); updateWatchtower({ lastError: payload.error, isScanRunning: false }); return; }
      const report = (payload.result ?? payload) as WatchtowerUserReport;
      setResult(report); persistSelected([]); setFixOutcome(null); setPatch(null);
      setLastScanAt(report.scannedAt);
      setIqEnrichments([]); setIqMode(null); setIqFallback(false); setIqError(null);
      setMessage("Scan completed — no source code was uploaded or executed.");
      updateWatchtower({
        repoPath: report.repoPath, selectedChecks: checks, selectedFixIds: [], lastResult: report,
        lastScanAt: report.scannedAt, lastJsonPath: report.reportPaths.json,
        lastMarkdownPath: report.reportPaths.markdown, lastPdfPath: report.reportPaths.pdf,
        lastPatchPath: undefined, lastPatchPreview: undefined, lastApplyFixesResult: undefined,
        lastError: null, isScanRunning: false, startedAt: undefined,
      });
      updateSession({ activeRepoPath: report.repoPath, lastDecision: report.decision, lastRiskScore: report.riskScore, lastFindingsCount: report.findings.length });
    });
    updateWatchtower({ isScanRunning: false });
  }

  async function applyFixes() {
    await run("fix", async () => {
      const payload = await postJson("/api/watchtower/apply-fixes", { repoPath: normalizedPath(), fixIds: selectedSafe.map((id) => `FIX-${id}`) });
      if ("error" in payload) { setError(payload.error); updateWatchtower({ lastError: payload.error }); return; }
      const outcome = payload as FixOutcome;
      setFixOutcome(outcome);
      updateWatchtower({ lastApplyFixesResult: { applied: outcome.applied, skipped: outcome.skipped }, lastError: null });
      if (outcome.ok === false) {
        setMessage(outcome.message ?? "No safe auto-fixes were selected.");
      } else {
        setMessage(outcome.message ?? `${outcome.applied.length} safe fix${outcome.applied.length !== 1 ? "es" : ""} applied — ${outcome.skipped.length} skipped. Re-scan to verify.`);
      }
    });
  }

  async function generatePatch() {
    await run("patch", async () => {
      const selectedManual = selected.filter((id) => manualIds.includes(id));
      const out = await postJson("/api/watchtower/generate-patch", {
        repoPath: normalizedPath(),
        fixIds: (selectedManual.length ? selectedManual : manualIds).map((id) => `FIX-${id}`),
      });
      if ("error" in out) { setError(out.error); updateWatchtower({ lastError: out.error }); return; }
      setPatch(out);
      updateWatchtower({ lastPatchPath: out.patchPath, lastPatchPreview: out.patchPreview, lastError: null });
      setMessage("No risky files were modified. Review this patch before applying manually.");
    });
  }

  async function downloadPdf() {
    await run("pdf", async () => {
      const res = await fetch("/api/watchtower/pdf-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoPath: normalizedPath(), foundryIqMode: iqMode, foundryIqEvidence: iqEnrichments }),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        setError(p.error || "PDF generation failed."); updateWatchtower({ lastError: p.error || "PDF generation failed." }); return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a"); a.href = url; a.download = "WATCHTOWER_SECURITY_REPORT.pdf"; a.click(); URL.revokeObjectURL(url);
      updateWatchtower({ lastPdfPath: result?.reportPaths.pdf ?? ".agent-control-tower/WATCHTOWER_SECURITY_REPORT.pdf", lastError: null });
      setMessage(`PDF downloaded: ${result?.reportPaths.pdf ?? "WATCHTOWER_SECURITY_REPORT.pdf"}`);
    });
  }

  function downloadJson() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "watchtower-report.json"; a.click(); URL.revokeObjectURL(url);
  }

  /* ── Foundry IQ enrichment ── */
  async function enrichWithIQ() {
    if (!result?.findings.length) return;
    await run("iq", async () => {
      setIqError(null);
      const payload = result.findings.map((f) => ({
        id:             f.id,
        title:          f.title,
        severity:       f.severity,
        category:       f.category,
        file:           f.file,
        evidence:       f.evidence,
        recommendedFix: f.recommendation,
      }));
      const res = await fetch("/api/foundry-iq/enrich", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findings: payload }),
      });
      const data = await res.json().catch(() => ({ ok: false, error: "Invalid response from enrichment API." })) as EnrichResponse & { error?: string };
      if (!res.ok || !data.ok) { setIqError(data.error ?? "Enrichment request failed."); return; }
      setIqEnrichments(data.enrichments);
      setIqMode(data.mode);
      setIqFallback(data.fallbackUsed);
      setMessage(data.mode === "azure"
        ? `Foundry IQ enrichment complete — Azure AI Search policy grounding active (${data.enrichments.length} findings enriched).`
        : `Foundry IQ enrichment complete — mock policy grounding active (${data.enrichments.length} findings enriched).`
      );
    });
  }

  function selectPreset(v: string) {
    setPreset(v);
    if (v === "quick")                       persistChecks(quickChecks);
    else if (v === "full")                   persistChecks(allChecks);
    else if (v === "secrets_sensitive_data") persistChecks(["secrets_sensitive_data"]);
    else if (v === "code_security_review")   persistChecks(["code_security_review"]);
    else                                     persistChecks(["repo_safety", "generate_repo_safety_files"]);
  }

  function resetUiSession() {
    clearSession(); restored.current = true;
    setRepoPath(""); setPreset("quick"); setChecks(quickChecks); setResult(null);
    setSelected([]); setFixOutcome(null); setPatch(null); setError(null); setLastScanAt(null);
    setMessage("Session cleared — project files were not modified.");
  }

  const fixStatusLabel = (id: string, safe: boolean) =>
    fixOutcome?.applied.some((x) => x.fixId === `FIX-${id}`) ? "Applied ✓"
    : fixOutcome?.skipped.some((x) => x.fixId === `FIX-${id}`) ? "Skipped"
    : safe ? "Can auto-fix" : "Manual review";

  const safeFixCount   = result?.fixPlan.filter((f) => !f.humanApprovalRequired).length ?? 0;
  const manualFixCount = result?.fixPlan.filter((f) =>  f.humanApprovalRequired).length ?? 0;
  const isScanning     = activeAction === "scan";
  const isEnriching    = activeAction === "iq";

  const noSafeFixesReason = safeFixCount === 0
    ? "No safe auto-fixes available. These findings require manual review or patch preview."
    : undefined;
  const selectedVisibleCount = visible.filter((finding) => selected.includes(finding.id)).length;

  return (
    <div>
      <PageHeader
        eyebrow="Local project security"
        title="Agent Watchtower"
        description="Scan your project → Review risks → Apply approved fixes → Download evidence"
        actions={
          <div className="flex items-center gap-2">
            {lastScanAt && (
              <span className="hidden text-xs text-slate-500 sm:block">
                Last scan: {new Date(lastScanAt).toLocaleString()}
              </span>
            )}
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              onClick={resetUiSession}
              type="button"
            >
              Clear Session
            </button>
          </div>
        }
      />

      {/* Scanning animation */}
      <ScanProgressBanner isScanning={isScanning} />

      {/* ── Foundry IQ mode badge ── */}
      {iqMode === "azure" && !iqFallback ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-sm font-semibold text-blue-800">Foundry IQ Mode Active</span>
          <span className="text-sm text-blue-700">— Azure AI Search policy grounding connected.</span>
        </div>
      ) : iqMode === "mock" ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-sm font-semibold text-amber-800">Mock IQ Mode</span>
          <span className="text-sm text-amber-700">— Azure credentials not configured or retrieval failed.</span>
        </div>
      ) : null}

      {/* ── Repo path ── */}
      <section className="wt-card p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_auto_auto]">
          <input
            aria-label="Repository path"
            className="studio-input"
            disabled={Boolean(activeAction)}
            onChange={(e) => persistRepoPath(e.target.value)}
            placeholder="/path/to/your/project  (spaces in path are supported)"
            value={repoPath}
          />
          <select
            aria-label="Scan preset"
            className="studio-input"
            disabled={Boolean(activeAction)}
            onChange={(e) => selectPreset(e.target.value)}
            value={preset}
          >
            <option value="quick">Quick Scan</option>
            <option value="full">Full Scan</option>
            <option value="secrets_sensitive_data">Secrets Only</option>
            <option value="code_security_review">Code Security</option>
            <option value="repo_setup">Repo Setup</option>
          </select>
          <ActionButton
            disabled={!repoPath.trim() || !checks.length || Boolean(activeAction)}
            isLoading={isScanning}
            label="Run Scan"
            loadingLabel="Scanning…"
            onClick={scan}
          />
          <ActionButton
            disabled={Boolean(activeAction)}
            label="Load Demo Project"
            onClick={() => { persistRepoPath(demoPath); setError(null); updateWatchtower({ lastError: null }); }}
            variant="secondary"
          />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Static local analysis only · No source upload · No code execution · No Azure/cloud credentials required
        </p>
      </section>

      {/* ── Checks ── */}
      <section className="wt-card mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-950">Checks</h2>
          <div className="flex flex-wrap gap-2">
            <ActionButton label="Select All" onClick={() => persistChecks(allChecks)} variant="secondary" />
            <ActionButton label="Clear All"  onClick={() => persistChecks([])}        variant="secondary" />
            <ActionButton label="Quick Scan" onClick={() => selectPreset("quick")}    variant="secondary" />
            <ActionButton label="Full Scan"  onClick={() => selectPreset("full")}     variant="secondary" />
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {checkOptions.map(([id, label]) => (
            <label
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 p-3 text-sm transition hover:border-blue-300 hover:bg-blue-50/50 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50"
              key={id}
            >
              <input
                aria-label={label}
                checked={checks.includes(id)}
                className="h-4 w-4 accent-blue-600"
                onChange={(e) => persistChecks(e.target.checked ? [...checks, id] : checks.filter((c) => c !== id))}
                type="checkbox"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* ── Feedback banners ── */}
      <div className="mt-4 space-y-2">
        <ErrorBanner message={error} />
        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700" role="status">
            {message}
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {!result ? (
        <div className="mt-5">
          <EmptyState
            description="Enter a local repo path, select checks, and click Run Scan. Results persist across all pages via localStorage."
            title="Ready for a local scan"
          />
        </div>
      ) : (
        <div className="mt-5 space-y-5">

          {/* Decision + score */}
          <DecisionCard result={result} />

          {/* ── Findings table ── */}
          <section className="wt-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${filter === f ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    key={f}
                    onClick={() => setFilter(f)}
                    type="button"
                  >
                    {f}
                  </button>
                ))}
              </div>
              <input
                aria-label="Search findings"
                className="studio-input xl:max-w-xs"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search file or risk…"
                value={search}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" style={{ minWidth: "700px" }}>
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-10 p-3">Sel</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Risk</th>
                    <th className="p-3">File</th>
                    <th className="p-3">Note</th>
                    <th className="p-3">Recommended fix</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((finding) => {
                    const isSelected = selected.includes(finding.id);
                    return (
                    <tr className={`align-top transition hover:bg-slate-50/70 ${isSelected ? "bg-blue-50/70 ring-1 ring-inset ring-blue-200" : ""}`} key={finding.id}>
                      <td className="p-3">
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-md p-1 hover:bg-blue-100" title={`Select ${finding.id}`}>
                          <input
                            aria-label={`Select finding ${finding.id}`}
                            checked={isSelected}
                            className="h-4 w-4 cursor-pointer accent-blue-600"
                            onChange={(e) => persistSelected(e.target.checked ? [...new Set([...selected, finding.id])] : selected.filter((id) => id !== finding.id))}
                            type="checkbox"
                          />
                        </label>
                      </td>
                      <td className="p-3"><SeverityChip severity={finding.severity} /></td>
                      <td className="max-w-[180px] p-3 font-semibold text-slate-900">{finding.title}</td>
                      <td className="max-w-[150px] p-3">
                        <span
                          className="block truncate font-mono text-xs text-slate-500"
                          title={`${finding.file ?? "repository"}${finding.line ? `:${finding.line}` : ""}`}
                        >
                          {finding.file ?? "repository"}{finding.line ? `:${finding.line}` : ""}
                        </span>
                      </td>
                      <td className="max-w-[200px] p-3 text-slate-600">{finding.shortNote}</td>
                      <td className="max-w-[200px] p-3 text-slate-600">{finding.recommendation}</td>
                      <td className="p-3">
                        <span className={`text-xs font-semibold ${fixOutcome?.applied.some((x) => x.fixId === `FIX-${finding.id}`) ? "text-emerald-700" : finding.safeFixAvailable ? "text-blue-700" : "text-amber-700"}`}>
                          {fixStatusLabel(finding.id, finding.safeFixAvailable)}
                        </span>
                        <div className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${finding.safeFixAvailable ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                          {finding.safeFixAvailable ? "Safe auto-fix" : "Manual review required"}
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
              {!visible.length && (
                <p className="p-6 text-center text-sm text-slate-500">No findings match the current filter.</p>
              )}
            </div>

            {/* Bulk action toolbar */}
            <div className="border-t border-slate-100 bg-slate-50/60 p-4">
              <div className="mb-3 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 sm:grid-cols-5">
                <span><strong className="text-slate-900">{selected.length}</strong> selected findings</span>
                <span><strong className="text-slate-900">{selectedSafe.length}</strong> selected safe fixes</span>
                <span><strong className="text-slate-900">{selectedManual.length}</strong> selected manual-review</span>
                <span><strong className="text-slate-900">{safeFixCount}</strong> safe fixes available</span>
                <span><strong className="text-slate-900">{manualFixCount}</strong> manual-review available</span>
              </div>
              {noSafeFixesReason && (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{noSafeFixesReason}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
              <ActionButton
                disabled={!visible.length || Boolean(activeAction)}
                label="Select All Findings"
                onClick={() => persistSelected([...new Set([...selected, ...visible.map((finding) => finding.id)])])}
                variant="secondary"
              />
              <ActionButton disabled={!selected.length} label="Clear Finding Selection" onClick={() => persistSelected([])} variant="secondary" />
              <div className="relative group">
                <ActionButton
                  disabled={!safeIds.length || Boolean(activeAction)}
                  label="Select All Safe Fixes"
                  onClick={() => persistSelected([...new Set([...selected, ...safeIds])])}
                  variant="secondary"
                />
                {noSafeFixesReason && (
                  <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 hidden w-72 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-600 shadow-lg group-hover:block">
                    {noSafeFixesReason}
                  </div>
                )}
              </div>
              <div className="relative group">
                <ActionButton
                  disabled={!selectedSafe.length || Boolean(activeAction) || safeFixCount === 0}
                  isLoading={activeAction === "fix"}
                  label="Fix Selected Safe Issues"
                  loadingLabel="Applying…"
                  onClick={applyFixes}
                />
                {noSafeFixesReason && (
                  <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 hidden w-72 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-600 shadow-lg group-hover:block">
                    {noSafeFixesReason}
                  </div>
                )}
              </div>
              <ActionButton disabled={!manualIds.length || Boolean(activeAction)} isLoading={activeAction === "patch"} label="Generate Patch for Review" loadingLabel="Generating…" onClick={generatePatch} variant="secondary" />
              <ActionButton disabled={Boolean(activeAction)} isLoading={activeAction === "pdf"} label="Download PDF Report" loadingLabel="Generating PDF…" onClick={downloadPdf} variant="secondary" />
              <ActionButton label="Download JSON" onClick={downloadJson} variant="secondary" />
              <ActionButton disabled={Boolean(activeAction)} label="Re-scan" onClick={scan} variant="secondary" />
              <ActionButton
                disabled={!result?.findings.length || Boolean(activeAction)}
                isLoading={isEnriching}
                label="Enrich with Foundry IQ"
                loadingLabel="Enriching…"
                onClick={enrichWithIQ}
                variant="secondary"
              />
              {selectedVisibleCount > 0 && (
                <span className="ml-1 text-xs font-semibold text-slate-500">
                  {selectedVisibleCount} visible finding{selectedVisibleCount !== 1 ? "s" : ""} selected
                </span>
              )}
              </div>
            </div>
          </section>

          {/* ── Fix plan cards ── */}
          <section className="wt-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-950">Fix Plan</h2>
              <p className="text-xs text-slate-500">{safeFixCount} safe auto-fix · {manualFixCount} manual review</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {result.fixPlan.map((fix) => (
                <article
                  className={`rounded-xl border p-4 transition hover:shadow-md ${fix.humanApprovalRequired ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
                  key={fix.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-950">{fix.title}</h3>
                    <StatusBadge status={fix.humanApprovalRequired ? "needs_review" : "safe"} />
                  </div>
                  {fix.file && (
                    <p className="mt-1.5 truncate font-mono text-xs text-slate-500">{fix.file}</p>
                  )}
                  <p className="mt-2 text-sm text-slate-700">{fix.recommendedFix}</p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-600">Show patch preview</summary>
                    <pre className="studio-preview mt-2 !max-h-40">{fix.safePatchPreview}</pre>
                  </details>
                  <p className={`mt-3 text-xs font-semibold ${fix.humanApprovalRequired ? "text-amber-700" : "text-emerald-700"}`}>
                    {fix.humanApprovalRequired ? "Manual review required — use patch preview" : "Safe auto-fix"}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* Safe fix outcome */}
          {fixOutcome && (
            <section className="wt-card p-5 wt-fade-up">
              <h2 className="font-semibold text-slate-950">Safe fix results</h2>
              <div className="mt-3 space-y-2">
                {fixOutcome.applied.map((x) => (
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" key={x.fixId}>
                    <span className="mt-0.5 shrink-0">✓</span>
                    <span><strong>{x.file}</strong> — {x.message}</span>
                  </div>
                ))}
                {fixOutcome.skipped.map((x) => (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" key={x.fixId}>
                    <span className="mt-0.5 shrink-0">⚠</span>
                    <span><strong>{x.fixId}</strong> — {x.reason}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm font-semibold text-blue-700">Re-scan to verify the applied fixes.</p>
            </section>
          )}

          {/* Patch preview */}
          {patch && (
            <section className="wt-card border-amber-200 bg-amber-50 p-5 wt-fade-up">
              <h2 className="font-semibold text-amber-900">Manual-review patch preview</h2>
              <p className="mt-1 text-xs text-amber-700">No risky files were modified. Review this diff before applying manually.</p>
              <p className="mt-2 break-all font-mono text-xs text-slate-600">{patch.patchPath}</p>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-amber-800">Show patch diff</summary>
                <pre className="studio-preview mt-3">{patch.patchPreview}</pre>
              </details>
            </section>
          )}

          {/* ── Foundry IQ enrichment panel ── */}
          {iqError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Foundry IQ enrichment error: {iqError}
            </div>
          )}
          {iqEnrichments.length > 0 && (
            <section className={`wt-card p-5 wt-fade-up ${iqMode === "azure" ? "border-blue-200 bg-blue-50/40" : "border-amber-100 bg-amber-50/40"}`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-950">Foundry IQ Policy Grounding</h2>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${iqMode === "azure" ? "border-blue-300 bg-blue-100 text-blue-800" : "border-amber-300 bg-amber-100 text-amber-800"}`}>
                    {iqMode === "azure" ? "Azure AI Search" : "Mock IQ"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{iqEnrichments.length} findings enriched</p>
              </div>
              <div className="space-y-4">
                {iqEnrichments.map((enrich) => {
                  const finding = result.findings.find((f) => f.id === enrich.findingId);
                  return (
                    <article className="rounded-xl border border-slate-200 bg-white p-4" key={enrich.findingId}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Finding</p>
                          <p className="font-semibold text-slate-950">{finding?.title ?? enrich.findingId}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${enrich.confidence === "high" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : enrich.confidence === "medium" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                          {enrich.confidence} confidence
                        </span>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">IQ Recommendation</p>
                        <p className="mt-1 text-sm leading-5 text-slate-700">{enrich.recommendation}</p>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rationale</p>
                        <p className="mt-1 text-sm leading-5 text-slate-600">{enrich.rationale}</p>
                      </div>
                      {enrich.citations.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policy citations</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {enrich.citations.map((c, i) => (
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs" key={`${c.source}-${i}`}>
                                <span className="font-semibold text-slate-800">{c.title}</span>
                                <span className="text-slate-400">·</span>
                                <span className="font-mono text-slate-500">{c.source}</span>
                                {c.score !== undefined && (
                                  <span className="text-slate-400">· score {c.score.toFixed(2)}</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Raw JSON (collapsed by default) */}
          <details className="wt-card p-5">
            <summary className="cursor-pointer font-semibold text-slate-950">Raw JSON response</summary>
            <pre className="studio-preview mt-3">{JSON.stringify(result, null, 2)}</pre>
          </details>

          {/* Report paths */}
          <details className="wt-card p-5">
            <summary className="cursor-pointer font-semibold text-slate-950">Report file paths</summary>
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-slate-500">Checks run: {result.checksRun.join(", ")}</p>
              {Object.entries(result.reportPaths).map(([key, val]) => (
                <p className="break-all font-mono text-xs text-slate-500" key={key}>
                  <span className="font-semibold">{key}:</span> {val}
                </p>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
