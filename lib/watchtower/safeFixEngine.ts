import { access, appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { WatchtowerRunResult } from "../../types/security.ts";
import { validateWatchtowerRepoPath } from "./watchtowerValidation.ts";

const instructions = `# Agent Watchtower Instructions

Before editing this repo:
1. Read \`.agent-safety.yml\`.
2. Do not read \`.env\`, private keys, tokens, or credential files.
3. Only modify files relevant to the approved task.
4. Do not modify package scripts, GitHub workflows, deployment config, or MCP config without explicit approval.
5. After changes, run:
   npm run watchtower -- scan --repo . --checks quick
6. If code changed, run:
   npm run watchtower -- scan --repo . --checks code_security_review,git_diff_scope,secrets_sensitive_data
7. Do not finalize if Watchtower returns BLOCKED.
8. Fix or explain every high/critical finding.
`;

async function exists(path: string) {
  try { await access(path); return true; } catch { return false; }
}

const safetyContent: Record<string, (result: WatchtowerRunResult) => string> = {
  "AGENTS.md": () => instructions,
  ".codex/watchtower-review.md": () => instructions,
  ".cursor/rules/watchtower-review.mdc": () => instructions,
  ".github/copilot-instructions.md": () => instructions,
  ".agent-safety.yml": () => "version: 1\ndefault_mode: deny\nblocked_tools:\n  - shell\n  - deploy\napproval_required_tools:\n  - package-scripts\n  - github-workflows\n  - mcp-config\n",
  "agent.lock.json": (result) => JSON.stringify({ projectName: result.projectName, decision: result.decision, riskScore: result.riskScore, generatedAt: result.generatedAt }, null, 2),
};

function fixPlan(result: WatchtowerRunResult) {
  return `# Watchtower Fix Plan\n\n${result.findings.map((finding) => `- [${finding.severity.toUpperCase()}] ${finding.file}: ${finding.recommendation}${finding.safeFixAvailable ? " (safe fix available)" : " (human approval required)"}`).join("\n") || "No findings."}\n`;
}

function patchPreview(result: WatchtowerRunResult) {
  return `# Suggested fixes requiring human approval\n\n${result.findings.filter((finding) => !finding.safeFixAvailable && ["critical", "high"].includes(finding.severity)).map((finding) => `# ${finding.file}${finding.line ? `:${finding.line}` : ""}\n# ${finding.title ?? finding.explanation}\n# Recommendation: ${finding.recommendation}\n`).join("\n") || "# No high-risk patch previews required.\n"}`;
}

export async function applySelectedWatchtowerSafeFixes(repoPathValue: string, result: WatchtowerRunResult, fixIds: string[]) {
  const repoPath = await validateWatchtowerRepoPath(repoPathValue);
  const selected = new Set(fixIds.map((id) => id.replace(/^FIX-/, "")));
  const applied: { fixId: string; file: string; message: string }[] = [];
  const skipped: { fixId: string; reason: string }[] = [];
  for (const finding of result.findings.filter((item) => selected.has(item.id))) {
    const fixId = `FIX-${finding.id}`;
    if (!finding.safeFixAvailable) {
      skipped.push({ fixId, reason: "Manual review required. Watchtower never auto-edits source, workflows, package scripts, or deployment configuration." });
      continue;
    }
    if (finding.file === ".gitignore") {
      const gitignore = join(repoPath, ".gitignore");
      const ignoreText = await exists(gitignore) ? await readFile(gitignore, "utf8") : "";
      if (!/(^|\n)\.env(?:\n|$)/.test(ignoreText)) await appendFile(gitignore, `${ignoreText && !ignoreText.endsWith("\n") ? "\n" : ""}.env\n`, "utf8");
      applied.push({ fixId, file: ".gitignore", message: "Added the .env ignore rule." });
      continue;
    }
    const content = safetyContent[finding.file];
    if (!content) {
      skipped.push({ fixId, reason: "This finding is outside the approved safe-fix allowlist." });
      continue;
    }
    const path = join(repoPath, finding.file);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content(result), "utf8");
    applied.push({ fixId, file: finding.file, message: `Generated approved safety file ${finding.file}.` });
  }
  await mkdir(join(repoPath, ".agent-control-tower"), { recursive: true });
  await writeFile(join(repoPath, ".agent-control-tower", "WATCHTOWER_FIX_PLAN.md"), fixPlan(result), "utf8");
  await writeFile(join(repoPath, ".agent-control-tower", "watchtower-suggested-fixes.patch"), patchPreview(result), "utf8");
  return { applied, skipped, reportPath: join(repoPath, ".agent-control-tower", "WATCHTOWER_FIX_PLAN.md") };
}

export async function applyWatchtowerSafeFixes(repoPathValue: string, result: WatchtowerRunResult) {
  const repoPath = await validateWatchtowerRepoPath(repoPathValue);
  const files = [
    ["AGENTS.md", instructions],
    [".codex/watchtower-review.md", instructions],
    [".cursor/rules/watchtower-review.mdc", instructions],
    [".github/copilot-instructions.md", instructions],
    [".agent-safety.yml", "version: 1\ndefault_mode: deny\nblocked_tools:\n  - shell\n  - deploy\napproval_required_tools:\n  - package-scripts\n  - github-workflows\n  - mcp-config\n"],
    ["agent.lock.json", JSON.stringify({ projectName: result.projectName, decision: result.decision, riskScore: result.riskScore, generatedAt: result.generatedAt }, null, 2)],
  ] as const;
  const applied: string[] = [];
  for (const [file, content] of files) {
    const path = join(repoPath, file);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content, "utf8");
    applied.push(file);
  }
  const gitignore = join(repoPath, ".gitignore");
  const ignoreText = await exists(gitignore) ? await readFile(gitignore, "utf8") : "";
  if (await exists(join(repoPath, ".env")) && !/(^|\n)\.env(?:\n|$)/.test(ignoreText)) {
    await appendFile(gitignore, `${ignoreText && !ignoreText.endsWith("\n") ? "\n" : ""}.env\n`, "utf8");
    applied.push(".gitignore");
  }
  if (await exists(join(repoPath, ".env")) && !(await exists(join(repoPath, ".env.example")))) {
    await writeFile(join(repoPath, ".env.example"), "# Add documented environment variable names with placeholder values only.\nEXAMPLE_API_KEY=replace-with-managed-secret\n", "utf8");
    applied.push(".env.example");
  }
  await mkdir(join(repoPath, ".agent-control-tower"), { recursive: true });
  await writeFile(join(repoPath, ".agent-control-tower", "WATCHTOWER_FIX_PLAN.md"), fixPlan(result), "utf8");
  await writeFile(join(repoPath, ".agent-control-tower", "watchtower-suggested-fixes.patch"), patchPreview(result), "utf8");
  applied.push(".agent-control-tower/WATCHTOWER_FIX_PLAN.md", ".agent-control-tower/watchtower-suggested-fixes.patch");
  return applied;
}
