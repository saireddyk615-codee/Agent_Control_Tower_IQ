import { execFile } from "node:child_process";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { analyzeAgentDiff } from "../studio/agentDiffGuard.ts";
import { analyzeRepoForAgentReadiness } from "../studio/repoGuardian.ts";
import type { WatchtowerConfig, WatchtowerFinding, WatchtowerRunResult } from "../../types/security.ts";
import { validateWatchtowerRepoPath } from "./watchtowerValidation.ts";

const execFileAsync = promisify(execFile);
export const WATCHTOWER_MAX_FILE_SIZE = 500 * 1024;
const exactTargets = [
  "README.md", "package.json", ".gitignore", ".env.example", ".env", ".mcp.json", "mcp.json",
  "claude_desktop_config.json", ".cursor/settings.json", "AGENTS.md", "CLAUDE.md",
  "Dockerfile", "docker-compose.yml", "vercel.json",
];
const generatedPaths = new Set([
  ".agent-safety.yml", "AGENT_WATCHTOWER_REPORT.md", "AGENT_WATCHTOWER_REPORT.json",
  "AGENT_COMMIT_GATE.md", "AGENT_SAFETY_COMPILER_OUTPUT.md", "agent.lock.json",
]);
const severityPoints = { critical: 30, high: 20, medium: 10, low: 5 } as const;
const sourceExtension = /\.(?:[cm]?[jt]sx?|py|java|cs|go|php|rs|cpp|c)$/i;
const fullChecks = ["repo_safety", "secrets_sensitive_data", "git_diff_scope", "code_security_review"];
const nestedTargetName = /(?:^|[/\\])(?:package\.json|\.gitignore|\.env(?:\.example)?|\.mcp\.json|mcp\.json|AGENTS\.md|CLAUDE\.md|Dockerfile|docker-compose\.yml|vercel\.json)$/i;

async function exists(path: string) {
  try { await access(path); return true; } catch { return false; }
}

function isInside(repoPath: string, target: string) {
  const rel = relative(repoPath, target);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !resolve(target).startsWith(`${resolve(repoPath)}${sep}..`);
}

async function collectRecursive(repoPath: string, directory: string, depth = 0): Promise<string[]> {
  if (depth > 4 || !(await exists(directory))) return [];
  const output: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", "dist", "build", ".git", ".agent-control-tower"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (!isInside(repoPath, path)) continue;
    if (entry.isDirectory()) output.push(...await collectRecursive(repoPath, path, depth + 1));
    else if (entry.isFile()) output.push(path);
  }
  return output;
}

async function collectTargets(repoPath: string): Promise<string[]> {
  const files = new Set<string>();
  for (const target of exactTargets) {
    const path = join(repoPath, target);
    if (await exists(path)) files.add(path);
  }
  for (const directory of [".github/workflows", ".cursor/rules", ".codex"]) {
    for (const file of await collectRecursive(repoPath, join(repoPath, directory))) files.add(file);
  }
  for (const path of await collectRecursive(repoPath, repoPath)) {
    const file = relative(repoPath, path);
    if (nestedTargetName.test(file)) files.add(path);
  }
  for (const entry of await readdir(repoPath, { withFileTypes: true })) {
    if (entry.isFile() && /^(?:next|vite)\.config\./.test(entry.name)) files.add(join(repoPath, entry.name));
  }
  return [...files];
}

function lineNumber(text: string, index: number) {
  return text.slice(0, index).split("\n").length;
}

function addFinding(
  findings: WatchtowerFinding[],
  category: WatchtowerFinding["category"],
  severity: WatchtowerFinding["severity"],
  file: string,
  evidence: string,
  explanation: string,
  recommendation: string,
  line?: number,
  title?: string,
  safeFixAvailable?: boolean,
) {
  const secretLike = category === "secret" || /secret|token|password|api[_ -]?key/i.test(title ?? explanation);
  const normalizedEvidence = secretLike && evidence !== ".env file present" ? "[redacted secret-like value]" : evidence.trim().slice(0, 240);
  if (findings.some((item) => item.category === category && item.file === file && item.evidence === normalizedEvidence)) return;
  findings.push({ id: `WT-${String(findings.length + 1).padStart(3, "0")}`, category, severity, file, line, title, safeFixAvailable, evidence: normalizedEvidence, explanation, recommendation });
}

function scanSourceCode(file: string, text: string, findings: WatchtowerFinding[]) {
  const checks: Array<[WatchtowerFinding["severity"], RegExp, string, string, string]> = [
    ["critical", /(?:\b(?:db|pool|client|connection)\s*\.\s*query|\bquery|\.raw)\s*\([^;\n]*(?:SELECT|UPDATE|DELETE|INSERT)[^;\n]*(?:\+|\$\{)[^;\n]*/i, "SQL injection risk", "A raw database query appears to concatenate dynamic input.", "Use a parameterized query and validate the input before database access."],
    ["critical", /\.raw\s*\(\s*(?:`[^`\n]*\$\{|[^)\n]*\+)/i, "SQL injection risk", "A raw database query appears to concatenate dynamic input.", "Use a parameterized query and validate the input before database access."],
    ["critical", /\b(?:eval|exec)\s*\(\s*(?:req\.|request\.|input|user)/i, "Unsafe dynamic execution", "User-controlled input may reach dynamic code or command execution.", "Remove dynamic execution and use an explicit allowlisted operation."],
    ["high", /\bchild_process\.(?:exec|execSync)\s*\(/i, "Shell execution requires review", "Source code invokes a shell command.", "Avoid shell execution or constrain arguments and require human approval."],
    ["high", /(?:password|token|api[_-]?key|secret)\s*[:=]\s*["'][^"'\n]{8,}["']/i, "Hardcoded secret-like value", "Source code contains a hardcoded secret-like value.", "Move the value to a managed secret source and rotate exposed credentials."],
    ["high", /(?:rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0)/i, "TLS validation disabled", "Source code disables TLS certificate validation.", "Restore TLS validation and use a trusted certificate chain."],
    ["high", /cors\s*\(\s*(?:\)|\{\s*origin\s*:\s*["']\*["'])/i, "Weak CORS configuration", "CORS appears unrestricted.", "Restrict CORS to an explicit trusted-origin allowlist."],
    ["high", /(?:originalname|filename)[^;\n]*(?:join|resolve)|(?:join|resolve)\([^;\n]*(?:req\.|request\.|input|user)/i, "Path traversal or unsafe upload risk", "User-controlled path or upload names may reach filesystem path construction.", "Normalize paths, reject .. segments, restrict allowed directories, and use server-generated filenames."],
  ];
  for (const [severity, pattern, title, explanation, recommendation] of checks) {
    const match = pattern.exec(text);
    if (match) addFinding(findings, severity === "critical" ? "output_risk" : "agent_config", severity, file, match[0], explanation, recommendation, lineNumber(text, match.index), title, false);
  }
  const supabase = /supabase[^;\n]*(?:\.from\s*\([^;\n]*\.select\s*\([^;\n]*\.(?:eq|filter|match|or)\s*\([^;\n]*(?:req\.|request\.|input|user))/i.exec(text);
  if (supabase) addFinding(findings, "output_risk", "high", file, supabase[0], "A Supabase query-builder filter uses dynamic input and needs review.", "Validate dynamic filter values and confirm row-level security before release.", lineNumber(text, supabase.index), "Supabase query-builder review", false);
}

function selectedChecks(config: WatchtowerConfig) {
  return config.checks?.length ? config.checks : fullChecks;
}

function scanText(file: string, text: string, findings: WatchtowerFinding[]) {
  const checks: Array<[WatchtowerFinding["category"], WatchtowerFinding["severity"], RegExp, string, string]> = [
    ["secret", "critical", /(?:api[_-]?key|client[_-]?secret|password|token)[ \t]*[:=][ \t]*["']?[^"'\s]{8,}/i, "A hardcoded secret-like value is present.", "Remove it and rotate any real credential."],
    ["dangerous_command", "critical", /(?:curl|wget)[^\n|]*\|\s*(?:sh|bash)|rm\s+-rf/i, "A destructive or remote-shell command is configured.", "Remove the command and require explicit human approval."],
    ["agent_config", "critical", /(?:auto[-_ ]?run|auto[-_ ]?approve)\s*[:=]\s*true|shell\s*[:=]\s*(?:true|enabled)|filesystem\s*[:=]\s*(?:\/|root|\*)/i, "Agent configuration enables autonomous or broad access.", "Apply deny-by-default tools and explicit paths."],
    ["memory_risk", "high", /(?:memory|retention)\s*[:=]\s*(?:forever|unlimited|persistent|\*)/i, "Agent memory retention is not bounded.", "Use session-only memory with an expiry."],
  ];
  const documentationFile = /(?:^|\/)(?:\.gitignore|[^/]+\.(?:md|txt))$/i.test(file);
  const exampleEnvironment = /(?:^|\/)\.env\.example$/i.test(file);
  const commonDocsUrl = /https?:\/\/(?:docs\.github\.com|help\.github\.com|docs\.python\.org|developer\.mozilla\.org|vitejs\.dev)[^\s"')]+/i.exec(text);
  const localUrl = /https?:\/\/(?:localhost|127\.0\.0\.1|[\w.-]+\.internal|[\w.-]+\.corp)[^\s"')]+/i.exec(text);
  const externalUrl = /https?:\/\/(?!localhost|127\.0\.0\.1|[\w.-]+\.internal|[\w.-]+\.corp|docs\.github\.com|help\.github\.com|docs\.python\.org|developer\.mozilla\.org|vitejs\.dev)[^\s"')]+/i.exec(text);
  if (localUrl) {
    const severity = documentationFile || exampleEnvironment ? "low" : "high";
    addFinding(findings, "external_url", severity, file, localUrl[0], severity === "low" ? "A localhost or private URL appears in documentation or example configuration." : "An internal or private URL is exposed in configuration.", severity === "low" ? "Confirm the example remains non-production and contains no sensitive location data." : "Remove or restrict internal location data.");
  }
  if (externalUrl && !documentationFile) addFinding(findings, "external_url", "high", file, externalUrl[0], "An external network destination is configured.", "Review and allowlist the destination.");
  if (commonDocsUrl && file === ".gitignore") addFinding(findings, "external_url", "low", file, commonDocsUrl[0], "A common documentation URL appears in .gitignore.", "No production action required; retain only if useful.");
  if (/(^|\/)\.env$/.test(file)) addFinding(findings, "secret", "critical", file, ".env file present", "A local secret-bearing environment file is present.", "Keep .env out of agent context and version control.", 1, "Environment file present", false);
  if (/(^|\/)package\.json$/.test(file)) {
    const script = text.match(/"(?:postinstall|preinstall|prepare)"\s*:\s*"[^"]+"/i)?.[0];
    if (script) addFinding(findings, "package_script", "critical", file, script, "A package lifecycle script can execute automatically.", "Remove it or require dependency-owner review.");
  }
  if (/^\.github\/workflows\//.test(file)) {
    const broad = text.match(/permissions\s*:\s*(?:write-all|\*)/i)?.[0];
    if (broad) addFinding(findings, "github_workflow", "critical", file, broad, "A workflow has broad write permissions.", "Use least-privilege workflow permissions.");
    if (/secrets\.[A-Za-z0-9_]+/.test(text)) addFinding(findings, "github_workflow", "high", file, text.match(/secrets\.[A-Za-z0-9_]+/)?.[0] ?? "workflow secret reference", "A workflow exposes or consumes repository secrets.", "Require workflow-owner review and minimize secret scope.");
    const deployment = text.match(/(?:^|\n)\s*(?:environment\s*:\s*(?:production|prod)|deploy(?:ment)?\s*:)|uses\s*:\s*(?:azure\/webapps-deploy|aws-actions\/amazon-ecs-deploy-task-definition|google-github-actions\/deploy-[^\s]+)/im)?.[0];
    if (deployment) addFinding(findings, "github_workflow", "high", file, deployment, "A workflow can change a deployment or production environment.", "Require deployment-owner review and an explicit protected-environment approval.");
  }
  if (/mcp|claude_desktop_config/i.test(file)) {
    const risk = text.match(/autoApprove\s*["':=]+\s*(?:true|\[)|(?:shell|filesystem)\s*["':=]+|https?:\/\//i)?.[0];
    if (risk) addFinding(findings, "mcp_config", "critical", file, risk, "MCP configuration enables broad, auto-approved, shell, filesystem, or remote access.", "Quarantine the server and require explicit approval.");
    const wildcard = text.match(/["']?(?:allow|allowedTools|tools|resources|roots|paths)["']?\s*["':=]+\s*(?:["']\*["']|\[[^\]]*["']\*["'][^\]]*\])/i)?.[0];
    if (wildcard) addFinding(findings, "mcp_config", "critical", file, wildcard, "MCP configuration grants wildcard access.", "Replace wildcard access with the minimum explicit tools and paths.");
  }
  for (const [category, severity, pattern, explanation, recommendation] of checks) {
    const match = text.match(pattern)?.[0];
    if (match) addFinding(findings, category, severity, file, match, explanation, recommendation);
  }
}

async function addBaselineFindings(repoPath: string, findings: WatchtowerFinding[]) {
  const safetyFiles = [
    ["AGENTS.md", "Agent instructions missing"],
    [".agent-safety.yml", "Agent safety manifest missing"],
    [".codex/watchtower-review.md", "Codex Watchtower instructions missing"],
    [".cursor/rules/watchtower-review.mdc", "Cursor Watchtower instructions missing"],
    [".github/copilot-instructions.md", "Copilot Watchtower instructions missing"],
    ["agent.lock.json", "Agent safety lock missing"],
  ] as const;
  for (const [file, title] of safetyFiles) {
    if (!(await exists(join(repoPath, file)))) addFinding(findings, "agent_config", "low", file, "file missing", "A recommended local agent-safety instruction file is missing.", `Generate ${file}.`, 1, title, true);
  }
  if (await exists(join(repoPath, ".env"))) {
    const ignore = await exists(join(repoPath, ".gitignore")) ? await readFile(join(repoPath, ".gitignore"), "utf8") : "";
    if (!/(^|\n)\.env(?:\n|$)/.test(ignore)) addFinding(findings, "secret", "critical", ".gitignore", ".env ignore rule missing", ".env exists but is not explicitly ignored.", "Add .env to .gitignore.", 1, "Protect .env in .gitignore", true);
  }
}

async function safeGit(repoPath: string) {
  if (!(await exists(join(repoPath, ".git")))) return { changedFiles: [] as string[], diff: "" };
  try {
    const options = { cwd: repoPath, timeout: 10_000, maxBuffer: 2_000_000, encoding: "utf8" as const, env: process.env };
    const status = await execFileAsync("git", ["status", "--porcelain"], options);
    const names = await execFileAsync("git", ["diff", "--name-only", "--no-ext-diff"], options);
    const diff = await execFileAsync("git", ["diff", "--no-ext-diff", "--no-color"], options);
    const statusFiles = status.stdout.split("\n").filter(Boolean).map((line) => line.slice(3).trim());
    return { changedFiles: [...new Set([...statusFiles, ...names.stdout.split("\n").filter(Boolean)])], diff: diff.stdout };
  } catch {
    return { changedFiles: [] as string[], diff: "" };
  }
}

function buildArtifacts(config: WatchtowerConfig, base: Omit<WatchtowerRunResult, "generatedArtifacts">) {
  const report = JSON.stringify({ ...base, generatedArtifacts: [] }, null, 2);
  const reportMd = `# Agent Watchtower Report\n\nProject: ${base.projectName}\nDecision: ${base.decision}\nRisk score: ${base.riskScore}/100\nFindings: ${base.findings.length}\nChanged files: ${base.changedFiles.length}\n\n${base.findings.map((f) => `- [${f.severity.toUpperCase()}] ${f.file}: ${f.explanation}`).join("\n") || "No high-risk findings."}\n`;
  return [
    { path: ".agent-safety.yml", description: "Deny-by-default project safety policy.", content: `version: 1\nproject: ${config.projectName}\ndefault_mode: deny\nrisk_threshold: ${config.riskThreshold}\nblocked_tools:\n${config.blockedTools.map((tool) => `  - ${tool}`).join("\n") || "  - shell\n  - deploy"}\n` },
    { path: "AGENT_WATCHTOWER_REPORT.md", description: "Human-readable Watchtower report.", content: reportMd },
    { path: "AGENT_WATCHTOWER_REPORT.json", description: "Machine-readable Watchtower report.", content: report },
    { path: "AGENT_COMMIT_GATE.md", description: "Commit gate decision and reviewer guidance.", content: `# Agent Commit Gate\n\nDecision: ${base.decision}\n\nCommits are blocked for critical findings and require review for high findings.` },
    { path: "AGENT_SAFETY_COMPILER_OUTPUT.md", description: "Compiled safety control summary.", content: `# Agent Safety Compiler Output\n\n- Decision: ${base.decision}\n- Blocked tools: ${config.blockedTools.join(", ") || "shell, deploy"}\n- Approval required: ${config.approvalRequiredTools.join(", ") || "write, network"}\n- Static local analysis only: Yes\n` },
    { path: "agent.lock.json", description: "Local Watchtower policy lock.", content: JSON.stringify({ projectName: config.projectName, decision: base.decision, riskScore: base.riskScore, generatedAt: base.generatedAt, blockedTools: config.blockedTools }, null, 2) },
  ];
}

export async function writeWatchtowerResult(result: WatchtowerRunResult) {
  const reportDirectory = join(result.repoPath, ".agent-control-tower");
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(join(reportDirectory, "watchtower-latest.json"), JSON.stringify(result, null, 2), "utf8");
  const markdown = result.generatedArtifacts.find((artifact) => artifact.path === "AGENT_WATCHTOWER_REPORT.md")?.content ?? `# Agent Watchtower Report\n\n${result.summary}\n`;
  await writeFile(join(reportDirectory, "WATCHTOWER_REPORT.md"), markdown, "utf8");
  await writeFile(join(reportDirectory, "WATCHTOWER_FIX_PLAN.md"), `# Watchtower Fix Plan\n\n${result.findings.map((finding) => `- [${finding.severity.toUpperCase()}] ${finding.file}: ${finding.recommendation}${finding.safeFixAvailable ? " (safe fix available)" : " (human approval required)"}`).join("\n") || "No findings."}\n`, "utf8");
}

export async function runWatchtowerOnce(config: WatchtowerConfig): Promise<WatchtowerRunResult> {
  const repoPath = await validateWatchtowerRepoPath(config.repoPath);
  const repoStats = await stat(repoPath);
  if (!repoStats.isDirectory()) throw new Error("Watchtower repoPath must be a directory.");
  const findings: WatchtowerFinding[] = [];
  const snippets: string[] = [];
  const checksRun = selectedChecks(config);
  await addBaselineFindings(repoPath, findings);
  for (const path of await collectTargets(repoPath)) {
    const fileStats = await stat(path);
    if (fileStats.size > WATCHTOWER_MAX_FILE_SIZE) continue;
    const file = relative(repoPath, path);
    if (generatedPaths.has(file)) continue;
    const text = await readFile(path, "utf8");
    snippets.push(`${file}\n${text.slice(0, 20_000)}`);
    scanText(file, text, findings);
  }
  if (checksRun.includes("code_security_review")) {
    for (const path of await collectRecursive(repoPath, repoPath)) {
      const file = relative(repoPath, path);
      if (!sourceExtension.test(file) || generatedPaths.has(file)) continue;
      const fileStats = await stat(path);
      if (fileStats.size > WATCHTOWER_MAX_FILE_SIZE) continue;
      scanSourceCode(file, await readFile(path, "utf8"), findings);
    }
  }
  const git = await safeGit(repoPath);
  const diffResult = analyzeAgentDiff({ approvedTask: "Watchtower monitored project changes", allowedFiles: config.allowedFiles, blockedFiles: config.blockedFiles, diffText: git.diff });
  for (const effect of diffResult.sideEffects) addFinding(findings, effect.type === "Scope creep" ? "scope_creep" : effect.type.includes("workflow") ? "github_workflow" : effect.type.includes("Package") ? "package_script" : effect.type.includes("Dependency") ? "unsafe_dependency" : "agent_config", effect.severity, effect.file ?? "git diff", effect.evidence, effect.explanation, effect.recommendation);
  for (const file of git.changedFiles) {
    if (config.blockedFiles.some((blocked) => file === blocked || file.startsWith(`${blocked}/`))) addFinding(findings, "scope_creep", "critical", file, file, "A changed file is explicitly blocked.", "Remove the change or approve the expanded scope.");
    if (config.allowedFiles.length && !config.allowedFiles.some((allowed) => file === allowed || file.startsWith(`${allowed}/`))) addFinding(findings, "scope_creep", "high", file, file, "A changed file is outside the allowed scope.", "Restrict changes or approve the expanded scope.");
  }
  const repoReview = analyzeRepoForAgentReadiness({ content: snippets.join("\n\n").slice(0, 100_000), projectName: config.projectName });
  for (const risk of repoReview.risks) {
    if (risk.includes("Secret-like values")) continue;
    if (!findings.some((finding) => finding.explanation.includes(risk))) addFinding(findings, "agent_config", "medium", "repository", risk, risk, "Review repository readiness before agent work.");
  }
  const riskScore = Math.min(100, findings.reduce((sum, finding) => sum + severityPoints[finding.severity], 0));
  const decision = findings.some((finding) => finding.severity === "critical") ? "blocked" : findings.some((finding) => finding.severity === "high") ? "needs_review" : "safe";
  const base = {
    runId: `watchtower-${Date.now()}`, generatedAt: new Date().toISOString(), repoPath, projectName: config.projectName || basename(repoPath),
    decision, riskScore, findings, changedFiles: git.changedFiles, checksRun,
    summary: `${decision.replaceAll("_", " ")}: ${findings.length} findings across ${git.changedFiles.length} changed files. Static local analysis only.`,
  } satisfies Omit<WatchtowerRunResult, "generatedArtifacts">;
  const result = { ...base, generatedArtifacts: buildArtifacts(config, base) };
  await writeWatchtowerResult(result);
  return result;
}
