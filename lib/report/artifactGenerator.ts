import type { FixResult, ScanResult } from "@/types/security";

const highRisk = (scanResult: ScanResult) =>
  scanResult.issues.filter(
    (issue) => issue.severity === "critical" || issue.severity === "high",
  );

const verdict = (scanResult: ScanResult, fixResult?: FixResult) => {
  if (!fixResult) return scanResult.mergeRecommendation;
  if (fixResult.humanReviewRequired) return "Review required";
  return fixResult.riskScoreAfter <= 30 ? "Approve with caution" : "Review required";
};

export function generateReviewerChecklist(input: {
  scanResult: ScanResult;
  fixResult?: FixResult;
}): string[] {
  const checklist = [
    "Review every critical and high severity finding before merge.",
    "Verify policy evidence and code locations.",
    "Add security regression tests for remediated findings.",
    "Confirm generated guidance fits the project architecture.",
  ];
  if (input.fixResult) checklist.unshift("Verify the generated patch or remediation guidance compiles and passes tests.");
  if (input.scanResult.issues.some((issue) => issue.category.includes("File"))) {
    checklist.push("Confirm approved upload types, size limits, and storage controls.");
  }
  return checklist;
}

export function generatePRReviewComment(input: {
  scanResult: ScanResult;
  fixResult?: FixResult;
}): string {
  const { scanResult, fixResult } = input;
  const findings = scanResult.issues
    .map((issue) => `- **${issue.severity.toUpperCase()} ${issue.title}** (${issue.cwe}, ${issue.location}): ${issue.suggestedFix}`)
    .join("\n");
  const checklist = generateReviewerChecklist(input).map((item) => `- [ ] ${item}`).join("\n");
  const evidenceCount = scanResult.issues.reduce((sum, issue) => sum + issue.citations.length, 0);
  return `## SecureGuard-LM IQ Security Courtroom Review

**Final verdict:** ${verdict(scanResult, fixResult)}
**Detected language:** ${scanResult.detectedLanguage ?? "generic"}
**Risk score:** ${scanResult.riskScore}/100${fixResult ? ` -> ${fixResult.riskScoreAfter}/100` : ""}
**Policy evidence:** ${evidenceCount} citations

### Findings
${findings || "- No supported findings detected."}

### Reviewer checklist
${checklist}

> SecureGuard-LM IQ does not auto-merge code. Human review is required before production use.`;
}

export function generateSarifPreview(input: { scanResult: ScanResult }): object {
  const { scanResult } = input;
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "SecureGuard-LM IQ",
            informationUri: "https://github.com/",
            rules: scanResult.issues.map((issue) => ({
              id: issue.cwe || issue.id,
              name: issue.title,
              shortDescription: { text: issue.description },
              help: { text: issue.suggestedFix },
            })),
          },
        },
        results: scanResult.issues.map((issue) => ({
          ruleId: issue.cwe || issue.id,
          level:
            issue.severity === "critical" || issue.severity === "high"
              ? "error"
              : issue.severity === "medium"
                ? "warning"
                : "note",
          message: { text: `${issue.title}: ${issue.suggestedFix}` },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: issue.location || scanResult.sourceName || "submitted-code" },
              },
            },
          ],
        })),
      },
    ],
  };
}

export function generateCICDGateSummary(input: {
  scanResult: ScanResult;
  fixResult?: FixResult;
}): string {
  const { scanResult, fixResult } = input;
  if (!fixResult && highRisk(scanResult).length > 0) {
    return `FAILED / Block until fixed: ${highRisk(scanResult).length} critical or high severity findings detected. Risk score ${scanResult.riskScore}/100.`;
  }
  if (fixResult?.humanReviewRequired) {
    return `PASSED WITH WARNINGS / Reviewer approval required: remediation guidance generated; modeled risk ${fixResult.riskScoreAfter}/100.`;
  }
  return `APPROVED WITH CAUTION: no blocking critical or high findings remain. Risk score ${fixResult?.riskScoreAfter ?? scanResult.riskScore}/100.`;
}

export function generateComplianceEvidenceSummary(input: { scanResult: ScanResult }): string {
  const { scanResult } = input;
  const mappings = scanResult.issues.map(
    (issue) =>
      `- ${issue.title}: ${issue.owasp}; ${issue.cwe}; NIST SSDF secure development review; SOC 2 change management/security monitoring; ISO 27001 secure development lifecycle.`,
  );
  return `Compliance evidence summary for ${scanResult.sourceName || "submitted-code"}:
${mappings.join("\n") || "- No supported findings require compliance mapping."}

Policy evidence attached: ${scanResult.issues.reduce((sum, issue) => sum + issue.citations.length, 0)} citations.`;
}

export function generateSecurityCourtroomSummary(input: {
  scanResult: ScanResult;
  fixResult?: FixResult;
}): string {
  const { scanResult, fixResult } = input;
  const evidenceCount = scanResult.issues.reduce((sum, issue) => sum + issue.citations.length, 0);
  return `Security Courtroom summary:
- Red Team Agent presented ${scanResult.issues.length} language-specific risk arguments.
- Blue Team Agent ${fixResult ? `prepared ${fixResult.fixes.length} remediation arguments` : "is awaiting remediation generation"}.
- Policy Judge Agent admitted ${evidenceCount} policy citations.
- Compliance Clerk Agent mapped findings to OWASP, CWE, NIST SSDF, SOC 2, and ISO 27001.
- Release Gate Agent verdict: ${verdict(scanResult, fixResult)}.`;
}
