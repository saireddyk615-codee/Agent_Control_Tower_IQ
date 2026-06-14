#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { compareProjectRisks, writeProjectRiskComparisonReports } from "../lib/watchtower/projectComparison.ts";
import { installWatchtowerPreCommitHook } from "../lib/watchtower/gitHookInstaller.ts";
import { applyWatchtowerSafeFixes } from "../lib/watchtower/safeFixEngine.ts";
import { runWatchtowerOnce } from "../lib/watchtower/watchtowerEngine.ts";
import { validateWatchtowerRepoPath } from "../lib/watchtower/watchtowerValidation.ts";
import { startWatchtowerWatcher } from "../lib/watchtower/watchtowerWatcher.ts";

const args = process.argv.slice(2);
const command = !args[0] || args[0].startsWith("--") ? "scan" : args[0];
const value = (name, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const repoPath = resolve(value("--repo", "."));
const checkValue = value("--checks", "full");
const checks = checkValue === "quick"
  ? ["repo_safety", "secrets_sensitive_data", "git_diff_scope"]
  : checkValue === "full"
    ? ["repo_safety", "secrets_sensitive_data", "git_diff_scope", "code_security_review"]
    : checkValue.split(",").map((item) => item.trim()).filter(Boolean);
const output = value("--output", "text");
const config = {
  repoPath,
  projectName: value("--project", basename(repoPath)),
  watchMode: command === "watch",
  installGitHook: command === "install-hook",
  allowedFiles: value("--allowed").split(",").map((item) => item.trim()).filter(Boolean),
  blockedFiles: value("--blocked").split(",").map((item) => item.trim()).filter(Boolean),
  blockedTools: ["shell", "deploy", "publish", "credential-access"],
  approvalRequiredTools: ["write", "network", "dependency-install"],
  riskThreshold: 70,
  checks,
};

function cliResult(result) {
  return {
    decision: result.decision,
    riskScore: result.riskScore,
    checksRun: result.checksRun ?? checks,
    findings: result.findings.map((finding) => ({
      id: finding.id, severity: finding.severity, category: finding.category, file: finding.file, line: finding.line,
      evidence: finding.evidence, title: finding.title ?? finding.explanation, explanation: finding.explanation, recommendation: finding.recommendation, safeFixAvailable: Boolean(finding.safeFixAvailable),
    })),
    fixPlan: result.findings.map((finding) => ({ id: `FIX-${finding.id}`, title: finding.title ?? finding.explanation, file: finding.file, recommendedFix: finding.recommendation, humanApprovalRequired: !finding.safeFixAvailable, safePatchPreview: finding.safeFixAvailable ? `Generate or safely update ${finding.file}.` : `Review ${finding.file}${finding.line ? `:${finding.line}` : ""} and apply: ${finding.recommendation}` })),
    artifacts: result.generatedArtifacts.map(({ path, description }) => ({ path, description })),
    summary: result.summary,
    timestamp: result.generatedAt,
  };
}

function markdown(result) {
  const value = cliResult(result);
  return `# Agent Watchtower CLI Report\n\n- Decision: ${value.decision}\n- Risk score: ${value.riskScore}/100\n- Checks: ${value.checksRun.join(", ")}\n\n## Findings\n\n${value.findings.map((finding) => `- **${finding.severity.toUpperCase()}** ${finding.file}${finding.line ? `:${finding.line}` : ""} - ${finding.title}: ${finding.recommendation}`).join("\n") || "No findings."}\n`;
}

function print(result) {
  const critical = result.findings.filter((finding) => finding.severity === "critical").length;
  const high = result.findings.filter((finding) => finding.severity === "high").length;
  console.log(`Agent Watchtower
Project: ${result.projectName}
Decision: ${result.decision}
Risk score: ${result.riskScore}
Findings: ${result.findings.length}
Critical: ${critical}
High: ${high}

Top risks:`);
  for (const finding of result.findings.slice(0, 5)) console.log(`- ${finding.file}: ${finding.explanation}`);
  console.log("\nReport written:\n.agent-control-tower/watchtower-latest.json");
}

try {
  if (command === "compare") {
    const repoValues = value("--repos").split(",").map((item) => item.trim()).filter(Boolean);
    const reportValues = value("--reports").split(",").map((item) => item.trim()).filter(Boolean);
    if (!repoValues.length && !reportValues.length) throw new Error("compare requires --repos or --reports.");
    const reports = repoValues.length
      ? repoValues.map((path) => {
        const resolvedPath = resolve(path);
        return { projectName: basename(resolvedPath), repoPath: resolvedPath, reportPath: join(resolvedPath, ".agent-control-tower", "watchtower-latest.json") };
      })
      : reportValues.map((path) => {
        const reportPath = resolve(path);
        const resolvedPath = resolve(reportPath, "..", "..");
        return { projectName: basename(resolvedPath), repoPath: resolvedPath, reportPath };
      });
    const comparison = await compareProjectRisks({ reports });
    const paths = await writeProjectRiskComparisonReports(comparison, process.cwd());
    console.log(`Project risk comparison
${comparison.executiveSummary}

Reports written:
${paths.markdownPath}
${paths.jsonPath}`);
    for (const missing of comparison.missingReports) console.log(`Skipped: ${missing.projectName} — ${missing.reason} (${missing.reportPath})`);
  } else if (command === "scan") {
    let result = await runWatchtowerOnce(config);
    if (args.includes("--apply-safe-fixes")) {
      await applyWatchtowerSafeFixes(repoPath, result);
      result = await runWatchtowerOnce(config);
    }
    if (output === "json") console.log(JSON.stringify(cliResult(result)));
    else if (output === "markdown") console.log(markdown(result));
    else print(result);
    if (args.includes("--commit-gate") && result.decision === "blocked") process.exitCode = 2;
    else if (args.includes("--commit-gate") && result.decision === "needs_review") console.log("\nCommit gate warning: high-risk findings require human review.");
  } else if (command === "watch") {
    console.log(`Agent Watchtower watching ${repoPath}. Press Ctrl+C to stop.`);
    const watcher = await startWatchtowerWatcher(config, (event) => console.log(`[${event.type}] ${event.message}`));
    const stop = async () => { await watcher.stop(); process.exit(0); };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  } else if (command === "install-hook") {
    const result = await installWatchtowerPreCommitHook(repoPath);
    console.log(result.message);
    if (!result.installed) process.exitCode = 1;
  } else if (command === "report") {
    const validatedRepoPath = await validateWatchtowerRepoPath(repoPath);
    console.log(await readFile(join(validatedRepoPath, ".agent-control-tower", "watchtower-latest.json"), "utf8"));
  } else {
    console.error("Usage: watchtower <scan|watch|install-hook|report|compare> --repo <path> [--commit-gate] | compare --repos <comma-separated paths>");
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Agent Watchtower failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
}
