import { generateAttackReplays } from "@/lib/report/attackReplay";
import { buildMergePassport, buildTraceability } from "@/lib/report/buildProofPack";
import type {
  AttackReplay,
  FixResult,
  ReportResult,
  ScanResult,
  SecureMergePassport,
  TraceabilityItem,
} from "@/types/security";

const SAFETY_DISCLAIMER =
  "This report was generated using synthetic demo code and synthetic security policy documents. SecureGuard-LM IQ does not auto-merge code. All generated fixes require developer review before production use.";

function fallbackPassport(scanResult: ScanResult): SecureMergePassport {
  return {
    riskScoreBefore: scanResult.riskScore,
    riskScoreAfter: scanResult.riskScore,
    issuesFound: scanResult.issues.length,
    issuesFixed: 0,
    humanReviewRequired: true,
    policyEvidenceAttached: scanResult.issues.every((issue) => issue.citations.length > 0),
    attackReplayCompleted: false,
    validationStatus: "not run",
    finalMergeRecommendation: scanResult.mergeRecommendation,
  };
}

function issueSection(scanResult: ScanResult) {
  return scanResult.issues
    .map(
      (issue, index) => `### ${index + 1}. ${issue.title} (${issue.severity.toUpperCase()})
- **Category:** ${issue.category}
- **Location:** \`${issue.location}\`
- **CWE / OWASP:** ${issue.cwe} / ${issue.owasp}
- **Finding:** ${issue.description}
- **Suggested fix:** ${issue.suggestedFix}`,
    )
    .join("\n\n");
}

function evidenceSection(scanResult: ScanResult) {
  return scanResult.issues
    .map((issue) => {
      const citations = issue.citations.length
        ? issue.citations
            .map(
              (citation) =>
                `  - ${citation.policyName} ${citation.section} - ${citation.title}: ${citation.excerpt}`,
            )
            .join("\n")
        : "  - No policy evidence attached.";
      return `- **${issue.title}**\n${citations}`;
    })
    .join("\n");
}

function replaySection(replays: AttackReplay[]) {
  return replays.length
    ? replays
        .map(
          (replay) =>
            `- **${replay.issueTitle}:** Simulated \`${replay.attackInput}\`. ${replay.result}`,
        )
        .join("\n")
    : "- Attack replay has not been generated.";
}

function traceabilitySection(items: TraceabilityItem[]) {
  return items.length
    ? items
        .map(
          (item) =>
            `- **${item.issue}:** ${item.policyCitation} -> ${item.generatedFix} -> ${item.validationStatus}`,
        )
        .join("\n")
    : "- Policy-to-patch traceability will be available after fix generation.";
}

export function generatePRReport(input: {
  scanResult: ScanResult;
  fixResult?: FixResult;
  attackReplays?: AttackReplay[];
}): ReportResult {
  const { scanResult, fixResult } = input;
  const attackReplays = input.attackReplays ?? generateAttackReplays(scanResult.issues);
  const traceability = fixResult ? buildTraceability(scanResult, fixResult) : [];
  const mergePassport = fixResult ? buildMergePassport(scanResult, fixResult) : fallbackPassport(scanResult);
  const fixes = fixResult?.fixes ?? [];
  const iqLabel =
    scanResult.iqMode === "real"
      ? "Microsoft Foundry IQ grounding"
      : "Foundry IQ-compatible mock grounding using synthetic policy documents";
  const fixSection = fixes.length
    ? fixes.map((fix) => `- **${fix.title}:** ${fix.explanation}`).join("\n")
    : "- No generated fixes are attached. Run fix generation before merge review.";
  const reportMarkdown = `# SecureGuard-LM IQ - Pull Request Security Review

## Review Summary
- **Project:** SecureGuard-LM IQ
- **Scan date:** ${scanResult.scannedAt}
- **IQ grounding mode:** ${iqLabel}
- **Risk score before:** ${mergePassport.riskScoreBefore}/100
- **Risk score after:** ${mergePassport.riskScoreAfter}/100
- **Merge recommendation:** ${mergePassport.finalMergeRecommendation}
- **Issues found:** ${mergePassport.issuesFound}
- **Issues fixed:** ${mergePassport.issuesFixed}

## Issues Found
${issueSection(scanResult) || "No supported security issues were detected."}

## Policy Evidence
${evidenceSection(scanResult) || "No policy evidence was required."}

## Generated Fixes
${fixSection}

## Safe Attack Replay Summary
${replaySection(attackReplays)}

## Policy-to-Patch Traceability Summary
${traceabilitySection(traceability)}

## Secure Merge Passport
- **Policy evidence attached:** ${mergePassport.policyEvidenceAttached ? "Yes" : "No"}
- **Attack replay completed:** ${mergePassport.attackReplayCompleted ? "Yes" : "No"}
- **Validation status:** ${mergePassport.validationStatus}
- **Human review required:** ${mergePassport.humanReviewRequired ? "Yes" : "No"}
- **Final merge recommendation:** ${mergePassport.finalMergeRecommendation}

## Human Review Notes
Review parameterized database access, secret configuration, trusted CORS origins, input validation boundaries, upload storage controls, and all generated code before production use.

## Safety Disclaimer
${SAFETY_DISCLAIMER}
`;

  return {
    scan: scanResult,
    fixes,
    attackReplays,
    traceability,
    mergePassport,
    reportMarkdown,
    summary: `PR security review generated with ${scanResult.issues.length} findings, ${fixes.length} proposed fixes, and a final recommendation of ${mergePassport.finalMergeRecommendation}.`,
  };
}
