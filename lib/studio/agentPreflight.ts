export interface ContextRiskFinding {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  evidence: string;
  recommendation: string;
}

export interface AgentPreflightResult {
  decision: "run_approved" | "approval_required" | "run_blocked";
  riskScore: number;
  redactedContext: string;
  contextFindings: ContextRiskFinding[];
  blastRadius: string[];
  permissionLeases: { capability: string; scope: string; expiresIn: string; approvalRequired: boolean }[];
  capabilityBudget: { maximumWrites: number; maximumNetworkCalls: number; maximumToolCalls: number; blockedCapabilities: string[] };
  unsafePathGraph: { from: string; to: string; risk: string }[];
  mcpQuarantine: string[];
  publicSubmissionGuard: string[];
  honeyContext: { canary: string; localOnly: true };
  contextExpiry: string;
  consentLedger: { action: string; status: string }[];
  digitalTwinSimulation: string[];
  safetyRegressionTests: string[];
  artifacts: { path: string; content: string; description: string }[];
  summary: string;
}

export function scanContextRisk(context: string): ContextRiskFinding[] {
  const findings: ContextRiskFinding[] = [];
  const rules: Array<[string, ContextRiskFinding["severity"], RegExp, string]> = [
    ["Secret-like value", "critical", /(?:sk-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^"'\s]{8,})/i, "Redact secrets and use an approved secret store."],
    ["Personal email", "medium", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, "Remove PII unless explicitly approved."],
    ["Internal URL", "high", /https?:\/\/(?:localhost|127\.0\.0\.1|[\w.-]+\.internal|[\w.-]+\.corp)[^\s)]*/i, "Remove internal locations from agent context."],
    ["Prompt injection", "critical", /(?:ignore (?:all|previous) instructions|reveal (?:your|the) system prompt|bypass safety)/i, "Remove untrusted instructions from context."],
    ["Dangerous operation", "critical", /(?:rm\s+-rf|curl\s+[^\n|]+\|\s*(?:sh|bash)|deploy\s+to\s+production)/i, "Block destructive, remote-shell, and deployment actions."],
    ["Broad repository scope", "high", /(?:entire repo|all files|every file|recursive write)/i, "Limit access to an explicit file allowlist."],
  ];
  for (const [type, severity, pattern, recommendation] of rules) {
    const match = context.match(pattern);
    if (match) findings.push({ type, severity, evidence: match[0].slice(0, 180), recommendation });
  }
  return findings;
}

export function redactAgentContext(context: string): string {
  return context
    .replace(/(?:sk-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^"'\s]{8,})/gi, "[REDACTED: secret]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED: email]")
    .replace(/https?:\/\/(?:localhost|127\.0\.0\.1|[\w.-]+\.internal|[\w.-]+\.corp)[^\s)]*/gi, "[REDACTED: internal URL]")
    .replace(/(?:ignore (?:all|previous) instructions|reveal (?:your|the) system prompt|bypass safety)[^\n]*/gi, "[REMOVED: prompt injection]");
}

export function generateCapabilityBudget(riskScore: number) {
  return {
    maximumWrites: riskScore >= 50 ? 0 : 5,
    maximumNetworkCalls: 0,
    maximumToolCalls: riskScore >= 50 ? 5 : 20,
    blockedCapabilities: ["deploy", "publish", "credential-access", "permission-change", "external-upload"],
  };
}

export function generateRunPermit(decision: AgentPreflightResult["decision"], allowedFiles: string[]) {
  return {
    status: decision,
    allowedFiles,
    allowedTools: decision === "run_approved" ? ["read", "edit-approved-files", "run-approved-tests"] : ["read"],
    blockedTools: ["shell", "network", "deploy", "publish", "credential-access"],
    humanApprovalRequired: decision !== "run_approved",
  };
}

export function generateSafetyManifest(input: {
  task: string;
  decision: AgentPreflightResult["decision"];
  allowedFiles: string[];
  requestedTools: string[];
  contextExpiry: string;
}) {
  return {
    version: 1,
    task: input.task,
    decision: input.decision,
    allowedFiles: input.allowedFiles,
    requestedTools: input.requestedTools,
    blockedTools: ["shell", "network", "deploy", "publish", "credential-access"],
    contextExpiry: input.contextExpiry,
    simulationOnly: true,
  };
}

export function generateMutationTests() {
  return [
    "Reject context containing a fake secret.",
    "Block a request to expand beyond allowed files.",
    "Detect HoneyContext canary in final output.",
    "Block deployment and external upload without approval.",
    "Expire context and permission leases after the run window.",
  ];
}

export function runAgentPreflight(input: {
  task: string;
  rawContext: string;
  allowedFiles?: string[];
  requestedTools?: string[];
}): AgentPreflightResult {
  const allowedFiles = input.allowedFiles?.filter(Boolean) ?? [];
  const requestedTools = input.requestedTools?.filter(Boolean) ?? [];
  const contextFindings = scanContextRisk(input.rawContext);
  const points = { critical: 30, high: 20, medium: 10, low: 5 };
  const riskScore = Math.min(100, contextFindings.reduce((sum, finding) => sum + points[finding.severity], 0));
  const decision = contextFindings.some((finding) => finding.severity === "critical")
    ? "run_blocked"
    : contextFindings.length || requestedTools.some((tool) => /shell|network|deploy|publish/i.test(tool))
      ? "approval_required"
      : "run_approved";
  const redactedContext = redactAgentContext(input.rawContext);
  const capabilityBudget = generateCapabilityBudget(riskScore);
  const honeyCanary = "HONEYCONTEXT-LOCAL-AGENT-27";
  const permissionLeases = [
    { capability: "read", scope: allowedFiles.join(", ") || "approved context only", expiresIn: "30 minutes", approvalRequired: false },
    { capability: "write", scope: allowedFiles.join(", ") || "none", expiresIn: "15 minutes", approvalRequired: true },
    { capability: "network", scope: "none", expiresIn: "disabled", approvalRequired: true },
    { capability: "deploy", scope: "none", expiresIn: "disabled", approvalRequired: true },
  ];
  const unsafePathGraph = [
    { from: "Raw Context", to: "Agent Memory", risk: contextFindings.length ? "Sensitive context exposure" : "Controlled" },
    { from: "Agent Tools", to: "External Network", risk: "Blocked by capability budget" },
    { from: "Agent Output", to: "Public Submission", risk: "Must pass Output Firewall" },
  ];
  const mcpQuarantine = requestedTools.filter((tool) => /mcp|network|shell|deploy|publish/i.test(tool));
  const publicSubmissionGuard = ["Scan output for HoneyContext canary", "Redact secrets and PII", "Block internal URLs", "Require Output Firewall approval"];
  const contextExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const consentLedger = [
    { action: "Read approved context", status: "approved" },
    { action: "Write approved files", status: "human approval required" },
    { action: "Network, deploy, or publish", status: "blocked" },
  ];
  const digitalTwinSimulation = [
    "Simulated context ingestion with redaction enabled.",
    `Simulated ${requestedTools.length} requested tools against deny-by-default capability budget.`,
    "Simulated final output passing through Output Firewall and HoneyContext detection.",
  ];
  const safetyRegressionTests = generateMutationTests();
  const runPermit = generateRunPermit(decision, allowedFiles);
  const passport = `# Agent Passport\n\nTask: ${input.task}\nDecision: ${decision}\nRisk score: ${riskScore}/100\nContext expiry: ${contextExpiry}\nHuman approval required: ${decision !== "run_approved" ? "Yes" : "No"}`;
  const capsule = { task: input.task, decision, riskScore, allowedFiles, permissionLeases, capabilityBudget, contextExpiry, honeyCanary, publicSubmissionGuard };
  const manifest = generateSafetyManifest({ task: input.task, decision, allowedFiles, requestedTools, contextExpiry });
  const flightRecord = { startedAt: new Date().toISOString(), decision, simulationOnly: true, events: digitalTwinSimulation };
  const artifacts = [
    { path: ".agent-safety.yml", description: "Deny-by-default safety configuration.", content: `version: 1\ndefault_mode: deny\ndecision: ${decision}\ncontext_expiry: ${contextExpiry}\nrequire_human_approval: true\n` },
    { path: "CONTEXT_SBOM.json", description: "Approved and blocked context inventory.", content: JSON.stringify({ allowedFiles, findings: contextFindings, contextExpiry, honeyCanaryLocalOnly: true }, null, 2) },
    { path: "TOOL_SBOM.json", description: "Requested and blocked tool inventory.", content: JSON.stringify({ requestedTools, quarantined: mcpQuarantine, blocked: capabilityBudget.blockedCapabilities }, null, 2) },
    { path: "MEMORY_SBOM.json", description: "Memory retention and expiry inventory.", content: JSON.stringify({ retention: "session-only", contextExpiry, blocked: ["secrets", "PII", "internal URLs"] }, null, 2) },
    { path: "AGENT_RUN_PERMIT.json", description: "Bounded local simulation run permit.", content: JSON.stringify(runPermit, null, 2) },
    { path: "CAPABILITY_BUDGET.json", description: "Maximum tool and action budget.", content: JSON.stringify(capabilityBudget, null, 2) },
    { path: "AGENT_SAFETY_MANIFEST.json", description: "Machine-readable mission safety manifest.", content: JSON.stringify(manifest, null, 2) },
    { path: "SAFE_AGENT_HANDOFF.md", description: "Minimum-safe-context handoff policy.", content: "# Safe Agent Handoff\n\nPass redacted context only. Never pass credentials, PII, internal URLs, or prompt injection. Require approval for tools beyond the target role." },
    { path: "AGENT_FLIGHT_RECORD.json", description: "Synthetic preflight simulation audit record.", content: JSON.stringify(flightRecord, null, 2) },
    { path: "AGENT_SAFETY_CONTRACT.md", description: "Human-readable safety contract.", content: "# Agent Safety Contract\n\nOperate only within the approved task, files, capability budget, permission leases, and context expiry. Never execute blocked tools or publish without approval." },
    { path: "AGENT_PASSPORT.md", description: "Portable safety identity and decision.", content: passport },
    { path: "AGENT_SAFETY_CAPSULE.json", description: "Complete portable preflight safety package.", content: JSON.stringify(capsule, null, 2) },
  ];
  return {
    decision, riskScore, redactedContext, contextFindings,
    blastRadius: [...allowedFiles, ...requestedTools.map((tool) => `Tool: ${tool}`)],
    permissionLeases, capabilityBudget, unsafePathGraph, mcpQuarantine, publicSubmissionGuard,
    honeyContext: { canary: honeyCanary, localOnly: true }, contextExpiry, consentLedger,
    digitalTwinSimulation, safetyRegressionTests, artifacts,
    summary: `${decision.replaceAll("_", " ")}: ${contextFindings.length} context risks and ${mcpQuarantine.length} requested tools quarantined in a local digital-twin simulation.`,
  };
}
