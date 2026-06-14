type OutputSeverity = "critical" | "high" | "medium" | "low";

export interface OutputFirewallResult {
  decision: "safe_to_publish" | "redaction_required" | "do_not_publish";
  outputRiskScore: number;
  findings: { type: string; severity: OutputSeverity; evidence: string; recommendation: string }[];
  sanitizedOutput: string;
  summary: string;
}

export function scanAgentFinalOutput(input: {
  outputText: string;
  honeyCanary?: string;
}): OutputFirewallResult {
  let sanitizedOutput = input.outputText;
  const findings: OutputFirewallResult["findings"] = [];
  const add = (type: string, severity: OutputSeverity, evidence: string, recommendation: string, pattern?: RegExp) => {
    findings.push({ type, severity, evidence: evidence.slice(0, 160), recommendation });
    if (pattern) sanitizedOutput = sanitizedOutput.replace(pattern, `[REDACTED: ${type}]`);
  };
  const rules: Array<[string, OutputSeverity, RegExp, string]> = [
    ["API key or secret", "critical", /(?:sk-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^"'\s]{8,})/gi, "Remove the secret and rotate it if exposure is possible."],
    ["Private key", "critical", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gi, "Do not publish private key material."],
    ["Email address", "medium", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "Confirm consent or redact personal contact information."],
    ["Phone number", "medium", /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, "Confirm consent or redact personal contact information."],
    ["Internal URL", "high", /https?:\/\/(?:localhost|127\.0\.0\.1|[\w.-]+\.internal|[\w.-]+\.corp)[^\s)]*/gi, "Remove internal network locations."],
    ["Private repository link", "high", /https?:\/\/(?:github|gitlab)\.com\/(?:private|internal|enterprise)[^\s)]*/gi, "Remove private repository links."],
    ["Dangerous shell command", "critical", /(?:rm\s+-rf|curl\s+[^\n|]+\|\s*(?:sh|bash)|wget\s+[^\n]+&&\s*(?:sh|bash))/gi, "Do not publish or recommend destructive or remote shell execution."],
    ["Confidential marker", "high", /\b(?:CONFIDENTIAL|INTERNAL ONLY|DO NOT DISTRIBUTE)\b/gi, "Remove confidential material before publishing."],
    ["Unsafe upload instruction", "high", /upload\s+(?:the|this|all)?\s*(?:file|code|repo|credentials?|secrets?)\s+to\s+https?:\/\/[^\s]+/gi, "Do not instruct users to upload private data to unapproved destinations."],
  ];
  if (input.honeyCanary?.trim() && input.outputText.includes(input.honeyCanary.trim())) {
    const canary = input.honeyCanary.trim();
    add("Honey canary exposed", "critical", canary, "Block publication and investigate context leakage.");
    sanitizedOutput = sanitizedOutput.split(canary).join("[REDACTED: Honey canary exposed]");
  }
  for (const [type, severity, pattern, recommendation] of rules) {
    const match = input.outputText.match(pattern)?.[0];
    if (match) add(type, severity, match, recommendation, pattern);
  }
  const points = { critical: 30, high: 20, medium: 10, low: 5 };
  const outputRiskScore = Math.min(100, findings.reduce((sum, finding) => sum + points[finding.severity], 0));
  const decision = findings.some((finding) => finding.severity === "critical")
    ? "do_not_publish"
    : findings.length > 0
      ? "redaction_required"
      : "safe_to_publish";
  return {
    decision,
    outputRiskScore,
    findings,
    sanitizedOutput,
    summary: `${decision.replaceAll("_", " ")}: ${findings.length} output safety findings with a risk score of ${outputRiskScore}/100.`,
  };
}
