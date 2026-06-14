"use client";

import { useEffect, useState } from "react";
import { AttackReplayPanel } from "@/components/AttackReplayPanel";
import { DiffViewer } from "@/components/DiffViewer";
import { IssueCard } from "@/components/IssueCard";
import { MergeVerdictArtifacts } from "@/components/MergeVerdictArtifacts";
import { PolicyCitationPanel } from "@/components/PolicyCitationPanel";
import { PRReport } from "@/components/PRReport";
import { SecureMergePassport } from "@/components/SecureMergePassport";
import { SecurityCourtroom } from "@/components/SecurityCourtroom";
import { TraceabilityMatrix } from "@/components/TraceabilityMatrix";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FormField } from "@/components/ui/FormField";
import { MetricCard } from "@/components/ui/MetricCard";
import { ResultCard } from "@/components/ui/ResultCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StudioShell } from "@/components/ui/StudioShell";
import { demoCodeSamples } from "@/lib/demo/loadDemoCode";
import { buildProofPack } from "@/lib/report/buildProofPack";
import { MAX_CODE_LENGTH } from "@/lib/security/validateRequest";
import type { FixResult, MergeVerdictArtifactsResult, ScanResult } from "@/types/security";

async function apiPayload(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) as unknown : null; } catch { return text; }
}

function apiError(payload: unknown, fallback: string) {
  return payload && typeof payload === "object" && "error" in payload ? String(payload.error) : fallback;
}

function decodeUnicodeBase64(value: string) {
  const bytes = Uint8Array.from(atob(decodeURIComponent(value)), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function ScanWorkspace() {
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("app.js");
  const [selectedDemo, setSelectedDemo] = useState("javascript");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [prReport, setPRReport] = useState<{ reportMarkdown: string; summary: string } | null>(null);
  const [artifacts, setArtifacts] = useState<MergeVerdictArtifactsResult | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const proofPack = result && fixResult ? buildProofPack(result, fixResult) : null;

  useEffect(() => {
    const stored = window.localStorage.getItem("secureguard_selected_code");
    const prefix = "#secureguardCode=";
    const encoded = window.location.hash.startsWith(prefix) ? window.location.hash.slice(prefix.length) : "";
    if (!stored && !encoded) return;
    let importedCode = "";
    let importErrorMessage = "";
    try {
      const imported = stored || decodeUnicodeBase64(encoded);
      if (!imported.trim() || imported.length > MAX_CODE_LENGTH) throw new Error("Imported code is empty or too large.");
      importedCode = imported;
      window.localStorage.removeItem("secureguard_selected_code");
      if (encoded) window.history.replaceState(null, "", window.location.pathname);
    } catch (importError) {
      console.error("Browser Companion import failed:", importError);
      importErrorMessage = "Could not import selected code from the browser extension.";
    }
    const timer = window.setTimeout(() => {
      if (importErrorMessage) setError(importErrorMessage);
      else setCode(importedCode);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function runAction(actionName: string, fn: () => Promise<void>) {
    if (activeAction) return;
    setActiveAction(actionName); setError(null);
    try { await fn(); }
    catch (err) {
      console.error(`SecureGuard ${actionName} failed:`, err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setActiveAction(null); }
  }

  function clearOutputs() {
    setResult(null); setFixResult(null); setPRReport(null); setArtifacts(null); setError(null);
  }

  function loadDemo() {
    const demo = demoCodeSamples.find((sample) => sample.id === selectedDemo) ?? demoCodeSamples[0];
    setCode(demo.code); setFilename(demo.filename); clearOutputs();
  }

  async function scan() {
    await runAction("scan", async () => {
      setFixResult(null); setPRReport(null); setArtifacts(null);
      const response = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, filename }) });
      const payload = await apiPayload(response);
      if (!response.ok) throw new Error(apiError(payload, "Could not run security scan."));
      if (!payload || typeof payload !== "object" || !("issues" in payload)) throw new Error("The scan API returned an invalid response.");
      setResult(payload as ScanResult);
    });
  }

  async function generateFix() {
    if (!result) return;
    await runAction("fix", async () => {
      const response = await fetch("/api/fix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, issues: result.issues }) });
      const payload = await apiPayload(response);
      if (!response.ok) throw new Error(apiError(payload, "Could not generate safer fix."));
      if (!payload || typeof payload !== "object" || !("fixedCode" in payload)) throw new Error("The fix API returned an invalid response.");
      setFixResult(payload as FixResult); setPRReport(null); setArtifacts(null);
    });
  }

  async function generateReport() {
    if (!result || !fixResult || !proofPack) return;
    await runAction("report", async () => {
      const response = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scanResult: result, fixResult, attackReplays: proofPack.attackReplays }) });
      const payload = await apiPayload(response);
      if (!response.ok) throw new Error(apiError(payload, "Could not generate PR report."));
      if (!payload || typeof payload !== "object" || !("reportMarkdown" in payload)) throw new Error("The report API returned an invalid response.");
      setPRReport(payload as { reportMarkdown: string; summary: string });
    });
  }

  async function generateArtifacts() {
    if (!result) return;
    await runAction("artifacts", async () => {
      const response = await fetch("/api/artifacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scanResult: result, fixResult: fixResult ?? undefined }) });
      const payload = await apiPayload(response);
      if (!response.ok) throw new Error(apiError(payload, "Could not generate DevSecOps artifacts."));
      if (!payload || typeof payload !== "object" || !("sarifPreview" in payload)) throw new Error("The artifact API returned an invalid response.");
      setArtifacts(payload as MergeVerdictArtifactsResult);
    });
  }

  const currentStep = prReport ? 3 : fixResult ? 2 : result ? 2 : activeAction ? 1 : code ? 1 : 0;
  return <StudioShell
    currentStep={currentStep}
    description="Secondary mode for scanning vulnerable synthetic code with mock policy grounding."
    eyebrow="Agent Control Tower IQ"
    steps={["Input", "Scan", "Review", "Report"]}
    title="Code Security Review"
    left={<div className="panel space-y-4 rounded-xl p-5">
      <h2 className="font-semibold text-slate-950">Code input</h2>
      <FormField label="Filename"><input className="studio-input" disabled={Boolean(activeAction)} maxLength={240} onChange={(event) => { setFilename(event.target.value); clearOutputs(); }} value={filename} /></FormField>
      <FormField label="Demo / language"><select className="studio-input" disabled={Boolean(activeAction)} onChange={(event) => setSelectedDemo(event.target.value)} value={selectedDemo}>{demoCodeSamples.map((sample) => <option key={sample.id} value={sample.id}>{sample.label}</option>)}</select></FormField>
      <FormField label="Code" hint="Use synthetic or non-confidential code only."><textarea className="studio-textarea min-h-[30rem]" disabled={Boolean(activeAction)} maxLength={MAX_CODE_LENGTH} onChange={(event) => { setCode(event.target.value); clearOutputs(); }} placeholder="Load a demo or paste synthetic code here." spellCheck={false} value={code} /></FormField>
      <ErrorMessage message={error} />
      <div className="grid gap-3">
        <ActionButton disabled={Boolean(activeAction)} label="Load Demo" onClick={loadDemo} variant="secondary" />
        <ActionButton disabled={Boolean(activeAction) || !code.trim()} isLoading={activeAction === "scan"} label="Run Scan" loadingLabel="Running Scan..." onClick={scan} />
        {result ? <ActionButton disabled={Boolean(activeAction) || result.issues.length === 0} isLoading={activeAction === "fix"} label="Generate Safer Fix" loadingLabel="Generating Fix..." onClick={generateFix} variant="secondary" /> : null}
        {result && fixResult ? <ActionButton disabled={Boolean(activeAction)} isLoading={activeAction === "report"} label="Generate Report" loadingLabel="Generating Report..." onClick={generateReport} variant="secondary" /> : null}
      </div>
    </div>}
    right={!result ? <EmptyState description="Load a synthetic demo or paste non-confidential code." title="Run a scan to see findings, policy evidence, fixes, and reports." /> : <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard action={<StatusBadge status={result.mergeRecommendation} />} detail={result.summary} label="Risk Score" value={`${result.riskScore}/100`} />
        <MetricCard action={<StatusBadge status={`${result.iqMode} mode`} />} detail={<><span>{result.groundingSummary}</span><span className="mt-1 block font-mono text-xs">{result.iqProvider}</span></>} label="Policy Grounding" value={result.iqMode === "mock" ? "Mock IQ" : "Microsoft IQ"} />
      </div>
      <ResultCard title={`Findings (${result.issues.length})`}><div className="mt-2 space-y-3">{result.issues.map((issue) => <IssueCard issue={issue} key={issue.id} />)}</div></ResultCard>
      <details className="panel rounded-xl p-5"><summary className="cursor-pointer font-semibold text-white">Policy Evidence</summary><div className="mt-4 space-y-3">{result.issues.map((issue) => <PolicyCitationPanel iqMode={result.iqMode} issue={issue} key={issue.id} />)}</div></details>
      {fixResult ? <details className="panel rounded-xl p-5"><summary className="cursor-pointer font-semibold text-white">Safer Fix Preview</summary><div className="mt-4"><p className="mb-3 text-sm text-amber-200">Human review required. Modeled risk: {fixResult.riskScoreBefore} → {fixResult.riskScoreAfter}.</p><DiffViewer fixedCode={fixResult.fixedCode} originalCode={fixResult.originalCode} /></div></details> : null}
      {prReport ? <details className="panel rounded-xl p-5"><summary className="cursor-pointer font-semibold text-white">PR Report Preview</summary><div className="mt-4"><PRReport reportMarkdown={prReport.reportMarkdown} summary={prReport.summary} /></div></details> : null}
      <details className="panel rounded-xl p-5">
        <summary className="cursor-pointer font-semibold text-white">Advanced Security Courtroom and DevSecOps Artifacts</summary>
        <div className="mt-4 space-y-6">
          <SecurityCourtroom fix={fixResult} scan={result} />
          {proofPack ? <><AttackReplayPanel replays={proofPack.attackReplays} /><TraceabilityMatrix items={proofPack.traceability} /><SecureMergePassport passport={proofPack.mergePassport} /></> : <p className="text-sm text-slate-400">Generate a safer fix to create the Security Proof Pack.</p>}
          <ActionButton disabled={Boolean(activeAction)} isLoading={activeAction === "artifacts"} label="Generate DevSecOps Artifacts" loadingLabel="Generating Artifacts..." onClick={generateArtifacts} variant="secondary" />
          {artifacts ? <MergeVerdictArtifacts artifacts={artifacts} /> : null}
        </div>
      </details>
    </div>}
  />;
}
