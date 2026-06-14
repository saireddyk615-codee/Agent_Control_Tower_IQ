import type { EnrichmentCitation, FindingEnrichment, EnrichmentFindingInput } from "./types.ts";

interface MockPolicy {
  keywords: RegExp;
  recommendation: string;
  rationale: string;
  citations: EnrichmentCitation[];
}

const MOCK_POLICIES: MockPolicy[] = [
  {
    keywords: /secret|token|password|credential|api.key|hardcode/i,
    recommendation:
      "Remove the hardcoded secret immediately. Store credentials in environment variables or a managed secret store (Azure Key Vault, AWS Secrets Manager). Rotate the exposed credential.",
    rationale:
      "Hardcoded secrets in source code are exposed to everyone with repository access and are frequently leaked via version-control history.",
    citations: [
      { title: "Secret Handling Policy", source: "secrets-policy.md", category: "secrets", excerpt: "Credentials must not be stored in source code or committed to version control." },
      { title: "Credential Rotation Standard", source: "credential-rotation-standard.md", category: "secrets", excerpt: "Any exposed credential must be revoked and rotated promptly." },
    ],
  },
  {
    keywords: /path.traversal|directory.traversal|\.\.\/|dotdot/i,
    recommendation:
      "Normalize the resolved path with `path.resolve()` and verify it starts with the allowed base directory before opening the file. Reject paths that escape the intended root.",
    rationale:
      "Path traversal allows attackers to read or overwrite arbitrary files on the server by using `../` sequences to escape the intended directory.",
    citations: [
      { title: "Path Traversal Policy", source: "path-traversal-policy.md", category: "injection", excerpt: "File paths must be resolved and verified against an allowed base directory before access." },
      { title: "Secure File Access Standard", source: "secure-file-access.md", category: "injection", excerpt: "Never pass unsanitized user input directly to file-system operations." },
    ],
  },
  {
    keywords: /sql.injection|sql|database|query|select.*from|insert.*into/i,
    recommendation:
      "Use parameterized queries or prepared statements for all database operations. Never concatenate user-controlled strings into SQL.",
    rationale:
      "SQL injection lets attackers read, modify, or delete database records and in some configurations execute OS commands.",
    citations: [
      { title: "SQL Injection Policy", source: "sql-injection-policy.md", category: "injection", excerpt: "All database queries must use parameterized statements for untrusted values." },
      { title: "Secure Coding Policy §5.1", source: "secure-coding-policy.md", category: "injection", excerpt: "Avoid string concatenation when constructing database queries." },
    ],
  },
  {
    keywords: /xss|cross.site.script|innerhtml|dangerouslySetInnerHTML|eval\(/i,
    recommendation:
      "Escape all user-controlled content before rendering it in HTML. Use framework-provided safe rendering APIs and a strict Content Security Policy.",
    rationale:
      "Cross-site scripting allows attackers to inject malicious scripts that run in victims' browsers, stealing session cookies or performing actions on their behalf.",
    citations: [
      { title: "XSS Prevention Policy", source: "xss-prevention-policy.md", category: "xss", excerpt: "Output must be context-appropriately escaped before being written to HTML." },
    ],
  },
  {
    keywords: /cors|access.control.allow.origin|\*/i,
    recommendation:
      "Restrict CORS to an explicit allowlist of trusted origins. Never use `*` for endpoints that require authentication or return sensitive data.",
    rationale:
      "Overly permissive CORS allows cross-origin requests from any website, enabling credential theft and cross-site request forgery.",
    citations: [
      { title: "CORS Security Policy", source: "cors-policy.md", category: "config", excerpt: "CORS must be restricted to an explicit allowlist of trusted origins." },
    ],
  },
  {
    keywords: /dependency|package|npm|outdated|vulnerable|prototype.pollution/i,
    recommendation:
      "Run `npm audit` and update or replace packages with known vulnerabilities. Pin dependency versions and audit regularly in CI.",
    rationale:
      "Vulnerable dependencies are a top supply-chain attack vector; attackers actively scan public registries for projects using affected versions.",
    citations: [
      { title: "Dependency Management Policy", source: "dependency-policy.md", category: "supply-chain", excerpt: "Dependencies with known vulnerabilities must be patched or replaced promptly." },
    ],
  },
  {
    keywords: /workflow|ci.cd|github.action|deploy|shell|run:/i,
    recommendation:
      "Audit CI/CD workflow files for untrusted input used in `run:` steps. Pin actions to full commit SHAs and restrict secrets to required jobs only.",
    rationale:
      "Compromised CI/CD pipelines can exfiltrate secrets, tamper with build artifacts, or deploy malicious code to production.",
    citations: [
      { title: "CI/CD Security Policy", source: "cicd-security-policy.md", category: "supply-chain", excerpt: "Workflow files must not execute untrusted user input in shell commands." },
    ],
  },
  {
    keywords: /agent|mcp|tool.call|prompt.injection|llm/i,
    recommendation:
      "Validate all agent tool inputs. Restrict tool permissions to the minimum required. Add output filtering for sensitive data before returning results.",
    rationale:
      "AI agent misconfigurations can allow prompt injection, scope creep, unauthorized tool use, or exfiltration of sensitive files.",
    citations: [
      { title: "Agent Safety Policy", source: "agent-safety-policy.md", category: "agent", excerpt: "Agent tools must validate inputs and operate under least-privilege constraints." },
    ],
  },
];

const FALLBACK_ENRICHMENT: Omit<FindingEnrichment, "findingId"> = {
  recommendation:
    "Review this finding against your organization's secure coding standards. Apply the principle of least privilege and validate all external inputs.",
  rationale:
    "General security best practice: defense in depth requires validating assumptions at each layer of the application.",
  citations: [
    { title: "General Security Policy", source: "general-security-policy.md", category: "general", excerpt: "All security findings must be triaged and remediated according to severity." },
  ],
  confidence: "low",
};

export function enrichFindingMock(finding: EnrichmentFindingInput): FindingEnrichment {
  const searchText = `${finding.title} ${finding.category} ${finding.evidence ?? ""} ${finding.recommendedFix ?? ""}`;
  const policy = MOCK_POLICIES.find((p) => p.keywords.test(searchText));

  if (!policy) return { findingId: finding.id, ...FALLBACK_ENRICHMENT };

  return {
    findingId: finding.id,
    recommendation: policy.recommendation,
    rationale: policy.rationale,
    citations: policy.citations,
    confidence: "medium",
  };
}
