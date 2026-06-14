import type { IQProvider } from "@/lib/iq/IQProvider";
import type { PolicyCitation } from "@/types/security";

type CitationTemplate = Omit<PolicyCitation, "issueType" | "provider">;

const citation = (
  policyId: string,
  policyName: string,
  section: string,
  title: string,
  excerpt: string,
  sourcePath: string,
): CitationTemplate => ({
  policyId,
  policyName,
  policyTitle: `${policyName} ${section} - ${title}`,
  section,
  title,
  excerpt,
  sourcePath,
});

const EVIDENCE_BY_ISSUE: Record<string, CitationTemplate[]> = {
  "SQL Injection Risk": [
    citation(
      "SG-SEC-5.1",
      "Secure Coding Policy",
      "Section 5.1",
      "Prefer parameterized database queries",
      "Database access must use parameterized queries or prepared statements for all untrusted values.",
      "/data/policies/secure-coding-policy.md",
    ),
    citation(
      "SG-SEC-5.2",
      "Secure Coding Policy",
      "Section 5.2",
      "Avoid unsafe string concatenation in queries",
      "Applications must not construct database queries by concatenating user-controlled strings.",
      "/data/policies/secure-coding-policy.md",
    ),
    citation(
      "SG-INPUT-2.1",
      "Input Validation Policy",
      "Section 2.1",
      "Validate all external input",
      "Applications must validate all external input before it is processed, stored, logged, or passed to another system.",
      "/data/policies/input-validation-policy.md",
    ),
  ],
  "Hardcoded Secret": [
    citation(
      "SG-SECRETS-1.1",
      "Secrets Management Policy",
      "Section 1.1",
      "Do not store secrets in source code",
      "Credentials, signing keys, API tokens, and other secrets must not be embedded in source code or committed to version control.",
      "/data/policies/secrets-management-policy.md",
    ),
    citation(
      "SG-SECRETS-1.2",
      "Secrets Management Policy",
      "Section 1.2",
      "Use environment variables or managed secret stores",
      "Applications must load secrets from environment variables or an approved managed secret store.",
      "/data/policies/secrets-management-policy.md",
    ),
    citation(
      "SG-SECRETS-1.3",
      "Secrets Management Policy",
      "Section 1.3",
      "Rotate secrets if accidental exposure is detected",
      "Any secret suspected of accidental exposure must be revoked or rotated promptly and the incident must be documented.",
      "/data/policies/secrets-management-policy.md",
    ),
  ],
  "Weak CORS Configuration": [
    citation(
      "SG-API-4.1",
      "API Security Standard",
      "Section 4.1",
      "Restrict CORS to trusted origins",
      "APIs must restrict cross-origin access to an explicit allowlist of trusted origins.",
      "/data/policies/api-security-standard.md",
    ),
    citation(
      "SG-API-4.3",
      "API Security Standard",
      "Section 4.3",
      "Return safe error messages",
      "API responses must not expose stack traces, secrets, internal paths, query details, or other sensitive implementation information.",
      "/data/policies/api-security-standard.md",
    ),
  ],
  "Missing Input Validation": [
    citation(
      "SG-INPUT-2.1",
      "Input Validation Policy",
      "Section 2.1",
      "Validate all external input",
      "Applications must validate all external input before it is processed, stored, logged, or passed to another system.",
      "/data/policies/input-validation-policy.md",
    ),
    citation(
      "SG-INPUT-2.2",
      "Input Validation Policy",
      "Section 2.2",
      "Reject malformed IDs and unexpected types",
      "Applications must reject malformed identifiers, unexpected data types, missing required fields, and values outside documented limits.",
      "/data/policies/input-validation-policy.md",
    ),
    citation(
      "SG-INPUT-2.3",
      "Input Validation Policy",
      "Section 2.3",
      "Use schema or type validation before database access",
      "Routes must apply schema or type validation before any user-controlled value is used in a database operation.",
      "/data/policies/input-validation-policy.md",
    ),
  ],
  "Unsafe File Upload": [
    citation(
      "SG-UPLOAD-3.1",
      "File Upload Security Policy",
      "Section 3.1",
      "Validate file type and extension",
      "Upload handlers must validate both the declared MIME type and file extension against an explicit allowlist.",
      "/data/policies/file-upload-security-policy.md",
    ),
    citation(
      "SG-UPLOAD-3.2",
      "File Upload Security Policy",
      "Section 3.2",
      "Enforce file size limits",
      "Upload handlers must reject files that exceed the documented maximum size.",
      "/data/policies/file-upload-security-policy.md",
    ),
    citation(
      "SG-UPLOAD-3.3",
      "File Upload Security Policy",
      "Section 3.3",
      "Normalize paths and prevent path traversal",
      "Applications must normalize upload paths, generate server-controlled filenames, and verify that resolved paths remain inside the approved upload directory.",
      "/data/policies/file-upload-security-policy.md",
    ),
    citation(
      "SG-UPLOAD-3.4",
      "File Upload Security Policy",
      "Section 3.4",
      "Store uploads outside executable directories when possible",
      "Uploaded files should be stored outside public or executable application directories whenever possible.",
      "/data/policies/file-upload-security-policy.md",
    ),
  ],
};

export class MockFoundryIQProvider implements IQProvider {
  async retrievePolicyEvidence(query: string, issueType?: string): Promise<PolicyCitation[]> {
    const normalizedQuery = `${issueType ?? ""} ${query}`.toLowerCase();
    const matchedIssue =
      issueType && EVIDENCE_BY_ISSUE[issueType]
        ? issueType
        : Object.keys(EVIDENCE_BY_ISSUE).find((type) =>
            query.toLowerCase().includes(type.toLowerCase()),
          ) ??
          (/(command|deserialization|eval|bounds|memory|validation)/.test(normalizedQuery)
            ? "Missing Input Validation"
            : /(path traversal|upload|file)/.test(normalizedQuery)
              ? "Unsafe File Upload"
              : /(certificate|tls|cors|debug)/.test(normalizedQuery)
                ? "Weak CORS Configuration"
                : /(secret|token|password|key)/.test(normalizedQuery)
                  ? "Hardcoded Secret"
                  : undefined);

    if (!matchedIssue) {
      return [];
    }

    return EVIDENCE_BY_ISSUE[matchedIssue].map((evidence) => ({
      ...evidence,
      issueType: matchedIssue,
      provider: "mock-foundry-iq",
    }));
  }
}
