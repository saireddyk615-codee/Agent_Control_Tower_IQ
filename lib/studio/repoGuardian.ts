export interface RepoGuardianResult {
  readinessScore: number;
  decision: "agent_ready" | "preflight_required" | "redaction_required" | "not_agent_ready";
  risks: string[];
  recommendedFiles: { path: string; content: string; description: string }[];
  summary: string;
}

export function analyzeRepoForAgentReadiness(input: {
  content: string;
  projectName?: string;
  filename?: string;
}): RepoGuardianResult {
  const content = input.content;
  const projectName = input.projectName?.trim() || "agent-enabled-project";
  const risks: string[] = [];
  if (!/readme|purpose|description|project/i.test(content)) risks.push("Project purpose is not clearly documented.");
  if (!/test|lint|build/i.test(content)) risks.push("No observable verification commands are documented.");
  if (!/agent|mcp|copilot|assistant/i.test(content)) risks.push("Agent operating boundaries are not documented.");
  if (/(?:api[_-]?key|client[_-]?secret|password|token)\s*[:=]\s*["']?[^"'\s]{8,}/i.test(content)) {
    risks.push("Secret-like values may be exposed in pasted repo context.");
  }
  if (/permissions?\s*:\s*(?:write-all|\*)/i.test(content)) risks.push("Broad workflow permissions require review.");
  if (/curl\s+|wget\s+|postinstall|preinstall/i.test(content)) risks.push("Install or network-execution hooks require review.");
  if (!/CODEOWNERS|review|required approval/i.test(content)) risks.push("Human approval ownership is not explicit.");

  const readinessScore = Math.max(12, 100 - risks.length * 13);
  const hasSecretRisk = risks.some((risk) => risk.includes("Secret-like"));
  const decision =
    readinessScore < 35
      ? "not_agent_ready"
      : hasSecretRisk
        ? "redaction_required"
        : readinessScore < 75
          ? "preflight_required"
          : "agent_ready";
  const safetyContract = `# Agent Safety Contract

Project: ${projectName}

- Agents must operate only on explicitly approved tasks and files.
- Never read, expose, or modify secrets, credentials, or private user data.
- Never execute tools, deploy, publish, or modify permissions without approval.
- All generated changes require tests and human review.
- Stop immediately when the kill switch is invoked.`;
  const recommendedFiles = [
    {
      path: ".agent-safety.yml",
      description: "Machine-readable repo safety boundaries.",
      content: `version: 1\nproject: ${projectName}\ndefault_mode: deny\nrequire_human_approval: true\nblocked_paths:\n  - .env*\n  - "**/secrets/**"\nblocked_tools:\n  - deploy\n  - publish\n  - shell\n`,
    },
    { path: "AGENT_SAFETY_CONTRACT.md", description: "Human-readable agent operating contract.", content: safetyContract },
    { path: "SAFE_AGENT_HANDOFF.md", description: "Rules for passing context between agents.", content: `# Safe Agent Handoff\n\nShare the minimum task context. Redact secrets, PII, internal URLs, and private repo links. Require approval before deployment or publication.` },
    { path: "AGENT_RUN_PERMIT.json", description: "Example deny-by-default run permit.", content: JSON.stringify({ project: projectName, status: "approval_required", allowedFiles: [], allowedTools: ["read", "search"], blockedTools: ["shell", "deploy", "publish"] }, null, 2) },
    { path: "CONTEXT_SBOM.json", description: "Context inventory template.", content: JSON.stringify({ project: projectName, approvedContext: [], blockedContext: [".env*", "secrets/**", "private user data"] }, null, 2) },
    { path: "TOOL_SBOM.json", description: "Tool permission inventory template.", content: JSON.stringify({ allowed: ["read", "search"], approvalRequired: ["write", "network"], blocked: ["deploy", "publish", "credential-access"] }, null, 2) },
    { path: "MEMORY_SBOM.json", description: "Memory retention inventory template.", content: JSON.stringify({ sessionOnly: true, allowed: ["task summary"], blocked: ["secrets", "PII", "credentials"] }, null, 2) },
    { path: "AGENT_KILL_SWITCH.md", description: "Immediate stop and escalation procedure.", content: `# Agent Kill Switch\n\nStop all agent activity when scope creep, secret exposure, unexpected network access, or destructive behavior is detected. Preserve local audit evidence and require human review before resuming.` },
  ];

  return {
    readinessScore,
    decision,
    risks,
    recommendedFiles,
    summary: `${projectName} scored ${readinessScore}/100 for agent readiness. ${risks.length} readiness risks require ${decision.replaceAll("_", " ")}.`,
  };
}
