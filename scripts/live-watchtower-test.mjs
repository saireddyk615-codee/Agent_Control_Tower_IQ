#!/usr/bin/env node
import { access, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generateWatchtowerPdfReport } from "../lib/reports/watchtowerPdfReport.ts";
import { generateWatchtowerPatchPreview } from "../lib/watchtower/patchPreview.ts";
import { runWatchtowerOnce } from "../lib/watchtower/watchtowerEngine.ts";
import { toWatchtowerUserReport } from "../lib/watchtower/watchtowerUserReport.ts";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PROJECTS = [
  { name: "stealth-resume-ace", requestedPath: "~/IdeaProjects/rovora1/stealth-resume-ace", candidates: ["~/IdeaProjects/rovora1/stealth-resume-ace", "~/IdeaProjects/RoVora1/stealth-resume-ace"] },
  { name: "Agent Control Tower IQ", requestedPath: "~/IdeaProjects/SecureGuard-LM IQ", candidates: ["~/IdeaProjects/SecureGuard-LM IQ"] },
];
const startedAt = new Date().toISOString();
const steps = [];
const scans = [];
const filesCreated = [];
const safeFixFiles = [];
const pdfReports = [];
const skippedManualFixes = [];
const patchReports = [];
const uiScans = [];
const vsixFiles = [];

const expand = (path) => path.startsWith("~/") ? join(homedir(), path.slice(2)) : resolve(path);
async function exists(path) { try { await access(path); return true; } catch { return false; } }
const stamp = () => new Date().toISOString();
const heading = (text) => console.log(`\n[${stamp()}] ========== ${text} ==========`);

async function run(label, command, args, options = {}) {
  heading(label);
  console.log(`$ ${command} ${args.map((arg) => JSON.stringify(arg)).join(" ")}`);
  const started = Date.now();
  const code = await new Promise((resolveCode) => {
    const child = spawn(command, args, { cwd: options.cwd ?? ROOT, stdio: "inherit", shell: false, env: process.env });
    child.on("error", (error) => { console.error(error.message); resolveCode(1); });
    child.on("close", (value) => resolveCode(value ?? 1));
  });
  const result = { label, command: `${command} ${args.join(" ")}`, result: code === 0 ? "PASS" : "FAIL", exitCode: code, durationMs: Date.now() - started };
  steps.push(result);
  console.log(`[${stamp()}] ${result.result}: ${label} (${result.durationMs}ms)`);
  if (code !== 0 && options.critical) throw new Error(`${label} failed with exit code ${code}.`);
  return result;
}

async function resolveProjects() {
  for (const project of PROJECTS) {
    project.path = undefined;
    for (const candidate of project.candidates) {
      const path = expand(candidate);
      if (await exists(path)) { project.path = path; break; }
    }
    if (!project.path) {
      console.error(`TARGET PROJECT MISSING: ${project.requestedPath}\nClone or place the project there, then rerun npm run live:test.`);
      throw new Error(`Missing target project: ${project.requestedPath}`);
    }
    console.log(`FOUND: ${project.name} -> ${project.path}`);
  }
}

async function recordScan(project, mode, safeFixes = false) {
  const args = ["run", "watchtower", "--", "scan", "--repo", project.path, "--checks", mode, ...(safeFixes ? ["--apply-safe-fixes"] : []), "--output", "json"];
  await run(`${project.name}: ${mode} scan${safeFixes ? " with safe fixes" : ""}`, "npm", args);
  const reportPath = join(project.path, ".agent-control-tower", "watchtower-latest.json");
  const result = JSON.parse(await readFile(reportPath, "utf8"));
  scans.push({ project: project.name, mode, safeFixes, decision: result.decision, riskScore: result.riskScore, findingsCount: result.findings.length, topFindings: result.findings.slice(0, 5).map((finding) => ({ severity: finding.severity, category: finding.category, file: finding.file, title: finding.title ?? finding.explanation, recommendation: finding.recommendation })) });
}

async function verifyReports(project) {
  const directory = join(project.path, ".agent-control-tower");
  await run(`${project.name}: list reports`, "ls", ["-la", directory]);
  for (const file of ["watchtower-latest.json", "WATCHTOWER_REPORT.md"]) {
    const path = join(directory, file);
    if (!(await exists(path))) throw new Error(`Required report missing: ${path}`);
    filesCreated.push(path);
    await run(`${project.name}: preview ${file}`, "head", ["-80", path]);
  }
  const raw = JSON.parse(await readFile(join(directory, "watchtower-latest.json"), "utf8"));
  const output = await generateWatchtowerPdfReport({ repoPath: project.path, projectName: project.name, result: toWatchtowerUserReport(raw), outputDir: directory });
  if (!(await exists(output.pdfPath))) throw new Error(`Required PDF report missing: ${output.pdfPath}`);
  pdfReports.push(output.pdfPath);
  filesCreated.push(output.pdfPath);
  await run(`${project.name}: verify PDF report`, "ls", ["-lh", output.pdfPath], { critical: true });
}

async function verifyUiEquivalent(project) {
  const raw = await runWatchtowerOnce({
    repoPath: project.path, projectName: project.name, watchMode: false, installGitHook: false,
    allowedFiles: [], blockedFiles: [], blockedTools: ["shell", "deploy"], approvalRequiredTools: ["write"], riskThreshold: 70,
    checks: ["repo_safety", "secrets_sensitive_data", "git_diff_scope"],
  });
  const userReport = toWatchtowerUserReport(raw);
  if (!userReport.shortRiskNote || !userReport.findings.every((finding) => finding.shortNote && finding.recommendation)) throw new Error(`UI-equivalent report invalid for ${project.name}`);
  uiScans.push({ project: project.name, decision: userReport.decision, findings: userReport.findings.length });
  const manual = raw.findings.filter((finding) => !finding.safeFixAvailable).slice(0, 3).map((finding) => finding.id);
  if (manual.length) {
    const patch = await generateWatchtowerPatchPreview(project.path, raw, manual);
    if (!(await exists(patch.patchPath))) throw new Error(`Patch preview missing: ${patch.patchPath}`);
    patchReports.push(patch.patchPath);
    filesCreated.push(patch.patchPath);
  }
}

async function writeFinal(status, error) {
  const finishedAt = new Date().toISOString();
  const result = { status, startedAt, finishedAt, projects: PROJECTS.map(({ name, requestedPath, path }) => ({ name, requestedPath, path, exists: Boolean(path) })), steps, scans, uiScans, filesCreated, safeFixFiles, pdfReports, patchReports, vsixFiles, skippedManualFixes, error: error?.message };
  await writeFile(join(ROOT, "LIVE_TEST_RESULTS.json"), JSON.stringify(result, null, 2), "utf8");
  const rows = scans.map((scan) => `| ${scan.project} | ${scan.mode}${scan.safeFixes ? " + safe fixes" : ""} | ${scan.decision} | ${scan.riskScore} | ${scan.findingsCount} |`).join("\n");
  const checks = steps.map((step) => `| ${step.command.replaceAll("|", "\\|")} | ${step.result} | Exit ${step.exitCode}; ${step.durationMs}ms |`).join("\n");
  const findings = scans.flatMap((scan) => scan.topFindings.map((finding) => `- **${scan.project} / ${finding.severity.toUpperCase()}** ${finding.file}: ${finding.title}. Fix: ${finding.recommendation}`)).join("\n");
  const markdown = `# Live Watchtower Test Report\n\n## 1. Test timestamp\n\n- Started: ${startedAt}\n- Finished: ${finishedAt}\n- Final status: **${status}**\n\n## 2. Projects tested\n\n| Project | Path | Exists | Report path |\n| --- | --- | --- | --- |\n${PROJECTS.map((project) => `| ${project.name} | \`${project.path ?? project.requestedPath}\` | ${project.path ? "Yes" : "No"} | ${project.path ? `\`${join(project.path, ".agent-control-tower", "watchtower-latest.json")}\`` : "Missing"} |`).join("\n")}\n\n## 3. Root app and extension checks\n\n| Command | Result | Notes |\n| --- | --- | --- |\n${checks}\n\n## 4. Watchtower CLI and UI-equivalent checks\n\n| Project | Command | Decision | Risk score | Findings count |\n| --- | --- | --- | --- | --- |\n${rows}\n\nUI-equivalent scans: ${uiScans.map((scan) => `${scan.project}: ${scan.decision}, ${scan.findings} findings`).join("; ")}\n\n## 5. Reports created\n\n${filesCreated.map((file) => `- \`${file}\``).join("\n")}\n\nPDF reports:\n${pdfReports.map((file) => `- \`${file}\``).join("\n")}\n\nPatch previews:\n${patchReports.map((file) => `- \`${file}\``).join("\n")}\n\n## 6. Safe fixes applied\n\n${safeFixFiles.map((file) => `- \`${file}\``).join("\n") || "No safe-fix files were verified."}\n\nSkipped manual fixes:\n${skippedManualFixes.map((item) => `- ${item}`).join("\n") || "- High-risk source, workflow, package-script, and deployment fixes remain manual by policy."}\n\nSafe-only mode does not modify application source, workflows, deployment configuration, or package scripts.\n\n## 7. Findings summary\n\n${findings || "No findings."}\n\n## 8. VS Code extension\n\nVSIX files:\n${vsixFiles.map((file) => `- \`${file}\``).join("\n")}\n\nThe extension compiled and packaged successfully when the corresponding steps are PASS.\n\n## 9. UI button verification\n\nPlaywright click tests are provided by \`npm run test:e2e\` and verify scan selection, real scan, patch preview, PDF/JSON downloads, re-scan, Reports, and Integrations.\n\n## 10. Remaining blockers\n\n${error ? `- ${error.message}` : "- Static findings still require human review. The live script does not execute scanned project code or target-project npm scripts."}\n\n# ${status}\n`;
  await writeFile(join(ROOT, "LIVE_TEST_REPORT.md"), markdown, "utf8");
  console.log(`\nReports written:\n${join(ROOT, "LIVE_TEST_RESULTS.json")}\n${join(ROOT, "LIVE_TEST_REPORT.md")}`);
}

console.log("========== AGENT CONTROL TOWER IQ LIVE TEST ==========");
let finalStatus = "LIVE TEST PASSED";
let failure;
try {
  heading("VERIFY PROJECT ROOT");
  if (!(await exists(join(ROOT, "package.json"))) || !(await exists(join(ROOT, "cli", "watchtower.mjs")))) throw new Error(`Current project root is invalid: ${ROOT}`);
  await run("pwd", "pwd", [], { critical: true });
  await run("ls", "ls", [], { critical: true });
  await run("cat package.json", "cat", ["package.json"], { critical: true });
  heading("VERIFY TARGET PROJECTS");
  await resolveProjects();
  for (const project of PROJECTS) await run(`ls target: ${project.name}`, "ls", ["-la", project.path], { critical: true });
  for (const [label, args] of [["npm install", ["install"]], ["npm test", ["test"]], ["npm run lint", ["run", "lint"]], ["npm run build", ["run", "build"]]]) await run(label, "npm", args, { critical: true });
  await recordScan(PROJECTS[0], "quick");
  await recordScan(PROJECTS[0], "full");
  await verifyUiEquivalent(PROJECTS[0]);
  await verifyReports(PROJECTS[0]);
  await recordScan(PROJECTS[1], "quick");
  await recordScan(PROJECTS[1], "full");
  await verifyUiEquivalent(PROJECTS[1]);
  await verifyReports(PROJECTS[1]);
  await recordScan(PROJECTS[0], "full", true);
  await verifyReports(PROJECTS[0]);
  for (const file of ["AGENTS.md", ".agent-safety.yml", ".codex/watchtower-review.md", ".cursor/rules/watchtower-review.mdc", ".github/copilot-instructions.md", "agent.lock.json", ".agent-control-tower/WATCHTOWER_FIX_PLAN.md"]) {
    const path = join(PROJECTS[0].path, file);
    await run(`verify safe fix: ${file}`, "ls", ["-la", path]);
    if (await exists(path)) safeFixFiles.push(path);
  }
  await run("extension install", "npm", ["run", "extension:install"], { critical: true });
  await run("extension compile", "npm", ["run", "extension:compile"], { critical: true });
  await run("extension package", "npm", ["run", "extension:package"], { critical: true });
  const vsixPath = join(ROOT, "vscode-extension", "agent-control-tower-iq-0.1.0.vsix");
  if (!(await exists(vsixPath))) throw new Error(`VSIX package missing: ${vsixPath}`);
  vsixFiles.push(vsixPath);
  if (scans.some((scan) => scan.decision !== "safe")) finalStatus = "LIVE TEST PASSED WITH MINOR ISSUES";
} catch (error) {
  failure = error instanceof Error ? error : new Error("Unknown live test failure.");
  finalStatus = "LIVE TEST FAILED";
  console.error(`\nCRITICAL BLOCKER: ${failure.message}`);
}
await writeFinal(finalStatus, failure);
if (failure) process.exitCode = 1;
