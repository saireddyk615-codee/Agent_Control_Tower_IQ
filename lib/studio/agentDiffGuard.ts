type DiffSeverity = "critical" | "high" | "medium" | "low";

export interface DiffGuardResult {
  decision: "approve" | "needs_review" | "block";
  scopeCreepDetected: boolean;
  sideEffects: {
    type: string;
    severity: DiffSeverity;
    file?: string;
    evidence: string;
    explanation: string;
    recommendation: string;
  }[];
  changedFiles: string[];
  summary: string;
}

export function analyzeAgentDiff(input: {
  approvedTask: string;
  allowedFiles?: string[];
  blockedFiles?: string[];
  diffText: string;
}): DiffGuardResult {
  const changedFiles = [...new Set([...input.diffText.matchAll(/^\+\+\+\s+b\/(.+)$/gm)].map((match) => match[1]))];
  const allowed = new Set((input.allowedFiles ?? []).map((file) => file.trim()).filter(Boolean));
  const blocked = new Set((input.blockedFiles ?? []).map((file) => file.trim()).filter(Boolean));
  const sideEffects: DiffGuardResult["sideEffects"] = [];
  const add = (type: string, severity: DiffSeverity, evidence: string, explanation: string, recommendation: string, file?: string) =>
    sideEffects.push({ type, severity, evidence: evidence.slice(0, 240), explanation, recommendation, file });

  for (const file of changedFiles) {
    if (blocked.has(file)) add("Blocked file modified", "critical", file, "The diff changes an explicitly blocked file.", "Remove the change and require human approval.", file);
    if (allowed.size > 0 && !allowed.has(file)) add("Scope creep", "high", file, "The diff changes a file outside the approved allowlist.", "Limit the diff to approved files or expand scope through review.", file);
    if (/^\.env|secret|credential/i.test(file)) add("Secret file modified", "critical", file, "A secret-related file is modified.", "Block the change and review for credential exposure.", file);
    if (/\.github\/workflows|azure-pipelines/i.test(file)) add("CI/CD workflow modified", "high", file, "An agent changed pipeline behavior.", "Require platform-owner approval.", file);
    if (/Dockerfile|docker-compose|k8s|helm|terraform|deploy/i.test(file)) add("Deployment configuration modified", "high", file, "Deployment or infrastructure behavior changed.", "Require deployment-owner approval.", file);
    if (/mcp|agent.*config|\.agent-safety/i.test(file)) add("Agent or MCP configuration modified", "critical", file, "Agent permissions or integrations may have changed.", "Block until agent-safety owner approval.", file);
  }

  const checks: Array<[string, DiffSeverity, RegExp, string, string]> = [
    ["Package script modified", "critical", /^\+.*(?:"(?:postinstall|preinstall|prepare)"\s*:|npm\s+run|pnpm\s+run|yarn\s+run)/im, "A package lifecycle or project script can execute automatically.", "Remove the hook and require dependency review."],
    ["New external URL", "high", /^\+.*https?:\/\/(?!localhost|127\.0\.0\.1)[^\s"')]+/im, "The diff introduces a new external network destination.", "Validate and approve the destination before merge."],
    ["Shell or download command", "critical", /^\+.*(?:curl|wget|sh\s+-c|bash\s+-c|child_process|execSync|system\()/im, "The diff introduces shell or network execution.", "Block or replace with an approved, bounded operation."],
    ["File deletion logic", "high", /^\+.*(?:rm\s+-rf|unlinkSync|rmdir|deleteMany)/im, "The diff introduces destructive deletion behavior.", "Require explicit scope and human approval."],
    ["Broad permissions", "critical", /^\+.*(?:write-all|permissions:\s*\*|chmod\s+777|AllowAny)/im, "The diff grants broad permissions.", "Apply least privilege and require security review."],
    ["Hardcoded secret", "critical", /^\+.*(?:secret|token|api[_-]?key|password)\s*[:=]\s*["'][^"']{8,}/im, "The diff introduces a secret-like value.", "Remove and rotate the credential if exposure is possible."],
    ["Dependency added", "medium", /^\+\s*["'][@\w./-]+["']\s*:\s*["'][^"']+["']/m, "The diff appears to add a dependency.", "Review provenance, license, and security posture."],
  ];
  for (const [type, severity, pattern, explanation, recommendation] of checks) {
    const match = input.diffText.match(pattern);
    if (match) add(type, severity, match[0], explanation, recommendation);
  }
  const scopeCreepDetected = sideEffects.some((effect) => effect.type === "Scope creep" || effect.type === "Blocked file modified");
  const decision = sideEffects.some((effect) => effect.severity === "critical")
    ? "block"
    : sideEffects.length > 0
      ? "needs_review"
      : "approve";
  return {
    decision,
    scopeCreepDetected,
    sideEffects,
    changedFiles,
    summary: `${decision.replaceAll("_", " ")}: ${changedFiles.length} changed files and ${sideEffects.length} risky side effects detected for "${input.approvedTask}".`,
  };
}
