import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type * as vscode from "vscode";

export type WatchtowerSeverity = "critical" | "high" | "medium" | "low";

export interface WatchtowerCliFinding {
  id: string;
  severity: WatchtowerSeverity;
  category: string;
  file?: string;
  line?: number;
  evidence?: string;
  title: string;
  explanation: string;
  recommendation: string;
  safeFixAvailable?: boolean;
}

export interface WatchtowerCliResult {
  decision: "safe" | "needs_review" | "blocked";
  riskScore: number;
  checksRun: string[];
  findings: WatchtowerCliFinding[];
  fixPlan: { id?: string; title: string; file?: string; recommendedFix: string; humanApprovalRequired: boolean; safePatchPreview?: string }[];
  artifacts: { path: string; description: string }[];
  summary: string;
  timestamp?: string;
  cliCommand?: string;
}

async function exists(path: string) {
  try { await access(path); return true; } catch { return false; }
}

export async function findWatchtowerCli(workspacePath: string, extensionPath: string) {
  const candidates = [
    join(workspacePath, "cli", "watchtower.mjs"),
    resolve(extensionPath, "..", "cli", "watchtower.mjs"),
    join(extensionPath, "cli", "watchtower.mjs"),
  ];
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  throw new Error("Watchtower CLI not found. Run npm install in Agent Control Tower IQ project.");
}

export function parseWatchtowerResult(value: string): WatchtowerCliResult {
  const parsed = JSON.parse(value) as Partial<WatchtowerCliResult>;
  if (!["safe", "needs_review", "blocked"].includes(parsed.decision ?? "") || !Array.isArray(parsed.findings)) {
    throw new Error("Watchtower CLI returned an invalid result.");
  }
  return {
    decision: parsed.decision as WatchtowerCliResult["decision"],
    riskScore: typeof parsed.riskScore === "number" ? parsed.riskScore : 0,
    checksRun: Array.isArray(parsed.checksRun) ? parsed.checksRun : [],
    findings: parsed.findings,
    fixPlan: Array.isArray(parsed.fixPlan) ? parsed.fixPlan : [],
    artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : "Agent Watchtower scan complete.",
    timestamp: parsed.timestamp,
  };
}

export async function runWatchtowerScan(options: {
  workspacePath: string;
  extensionPath: string;
  checks: "quick" | "full" | string;
  applySafeFixes?: boolean;
  output?: vscode.OutputChannel;
}): Promise<WatchtowerCliResult> {
  const cli = await findWatchtowerCli(options.workspacePath, options.extensionPath);
  const args = [cli, "scan", "--repo", options.workspacePath, "--checks", options.checks, ...(options.applySafeFixes ? ["--apply-safe-fixes"] : []), "--output", "json"];
  const command = `node ${args.map((item) => JSON.stringify(item)).join(" ")}`;
  options.output?.appendLine(`Scan started: ${options.checks}`);
  const stdout = await new Promise<string>((resolvePromise, reject) => {
    const child = spawn(process.execPath, args, { cwd: dirname(cli), shell: false });
    let output = "";
    let error = "";
    child.stdout.on("data", (data: Buffer) => { output += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { error += data.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise(output.trim()) : reject(new Error(error.trim() || `Watchtower CLI exited with code ${code}.`)));
  });
  try {
    return { ...parseWatchtowerResult(stdout), cliCommand: command };
  } catch {
    const fallback = await readFile(join(options.workspacePath, ".agent-control-tower", "watchtower-latest.json"), "utf8");
    const raw = JSON.parse(fallback) as {
      decision: WatchtowerCliResult["decision"]; riskScore: number; checksRun?: string[]; findings: WatchtowerCliFinding[];
      generatedArtifacts?: { path: string; description: string }[]; summary: string; generatedAt?: string;
    };
    return {
      decision: raw.decision, riskScore: raw.riskScore, checksRun: raw.checksRun ?? [], findings: raw.findings.map((finding) => ({ ...finding, title: finding.title ?? finding.explanation })),
      fixPlan: raw.findings.map((finding) => ({ title: finding.title ?? finding.explanation, file: finding.file, recommendedFix: finding.recommendation, humanApprovalRequired: ["critical", "high"].includes(finding.severity) })),
      artifacts: raw.generatedArtifacts ?? [], summary: raw.summary, timestamp: raw.generatedAt, cliCommand: command,
    };
  }
}

export async function runWatchtowerCommand(workspacePath: string, extensionPath: string, command: "install-hook") {
  const cli = await findWatchtowerCli(workspacePath, extensionPath);
  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn(process.execPath, [cli, command, "--repo", workspacePath], { cwd: dirname(cli), shell: false });
    let output = "";
    let error = "";
    child.stdout.on("data", (data: Buffer) => { output += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { error += data.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise(output.trim()) : reject(new Error(error.trim() || `Watchtower CLI exited with code ${code}.`)));
  });
}
