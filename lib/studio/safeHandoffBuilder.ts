export type TargetAgentRole = "planner" | "coder" | "reviewer" | "deployer" | "analyst" | "unknown";

export interface SafeHandoffResult {
  decision: "handoff_approved" | "handoff_with_redaction" | "handoff_blocked";
  allowedContext: string;
  blockedContextSummary: string[];
  allowedTools: string[];
  blockedTools: string[];
  approvalRequired: string[];
  safeHandoffPrompt: string;
  summary: string;
}

const roleTools: Record<TargetAgentRole, { allowed: string[]; blocked: string[]; approvals: string[] }> = {
  planner: { allowed: ["read sanitized goal", "create plan"], blocked: ["write files", "shell", "network", "deploy"], approvals: [] },
  coder: { allowed: ["read approved files", "edit approved files", "run approved tests"], blocked: ["credential access", "deploy", "publish"], approvals: ["New dependencies", "Files outside allowlist"] },
  reviewer: { allowed: ["read diff", "read safety report", "comment"], blocked: ["modify source", "deploy", "credential access"], approvals: [] },
  deployer: { allowed: ["read approved release manifest"], blocked: ["credential output", "unapproved deployment", "permission changes"], approvals: ["Every deployment action", "Production access"] },
  analyst: { allowed: ["read sanitized summary", "produce analysis"], blocked: ["source repository access", "credentials", "write tools"], approvals: [] },
  unknown: { allowed: ["read sanitized task"], blocked: ["write", "shell", "network", "deploy", "publish"], approvals: ["Any tool use"] },
};

export function buildSafeAgentHandoff(input: {
  sourceAgent: string;
  targetAgent: string;
  task: string;
  rawContext: string;
  targetAgentRole: TargetAgentRole;
}): SafeHandoffResult {
  let allowedContext = input.rawContext;
  const blockedContextSummary: string[] = [];
  const redactions: Array<[string, RegExp]> = [
    ["secret or credential", /(?:sk-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^"'\s]{8,})/gi],
    ["personal email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
    ["internal URL", /https?:\/\/(?:localhost|127\.0\.0\.1|[\w.-]+\.internal|[\w.-]+\.corp)[^\s)]*/gi],
    ["private repository link", /https?:\/\/(?:github|gitlab)\.com\/(?:private|internal|enterprise)[^\s)]*/gi],
    ["prompt injection instruction", /(?:ignore (?:all|previous) instructions|system prompt|reveal your instructions|bypass safety)[^\n]*/gi],
  ];
  for (const [label, pattern] of redactions) {
    if (pattern.test(allowedContext)) {
      blockedContextSummary.push(label);
      allowedContext = allowedContext.replace(pattern, `[REDACTED: ${label}]`);
    }
  }
  if (input.targetAgentRole === "planner" || input.targetAgentRole === "analyst") {
    allowedContext = `Sanitized high-level context: ${allowedContext.slice(0, 900)}`;
  }
  if (input.targetAgentRole === "reviewer") {
    allowedContext = `Review-only sanitized context: ${allowedContext.slice(0, 1600)}`;
  }
  const tools = roleTools[input.targetAgentRole];
  const decision =
    input.targetAgentRole === "deployer"
      ? "handoff_blocked"
      : blockedContextSummary.length > 0
        ? "handoff_with_redaction"
        : "handoff_approved";
  const safeHandoffPrompt = `You are ${input.targetAgent || "the target agent"}, acting as a ${input.targetAgentRole}.

Approved task:
${input.task}

Allowed context:
${allowedContext}

Allowed tools: ${tools.allowed.join(", ")}
Blocked tools: ${tools.blocked.join(", ")}
Approval required: ${tools.approvals.join(", ") || "None"}

Do not expand scope, reveal redacted data, execute blocked tools, deploy, or publish without explicit human approval.`;
  return {
    decision,
    allowedContext,
    blockedContextSummary,
    allowedTools: tools.allowed,
    blockedTools: tools.blocked,
    approvalRequired: tools.approvals,
    safeHandoffPrompt,
    summary: `${input.sourceAgent || "Source agent"} to ${input.targetAgent || "target agent"} handoff is ${decision.replaceAll("_", " ")} with ${blockedContextSummary.length} context categories blocked.`,
  };
}
