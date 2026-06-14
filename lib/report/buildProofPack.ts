import { generateAttackReplays } from "@/lib/report/attackReplay";
import type {
  FixResult,
  ReportResult,
  ScanResult,
  SecureMergePassport,
  TraceabilityItem,
} from "@/types/security";

const validationByIssue: Record<string, string> = {
  "SQL Injection Risk": "Passed with warnings",
  "Hardcoded Secret": "Passed with warnings",
  "Weak CORS Configuration": "Passed",
  "Missing Input Validation": "Passed with warnings",
  "Unsafe File Upload": "Human review required",
};

export function buildTraceability(scan: ScanResult, fix: FixResult): TraceabilityItem[] {
  return scan.issues.map((issue) => {
    const citations = issue.citations.map(
      (citation) => `${citation.policyName} ${citation.section} - ${citation.title}`,
    );
    const generatedFix =
      fix.fixes.find((item) => item.issueId === issue.id)?.explanation ?? issue.suggestedFix;

    return {
      issue: issue.title,
      severity: issue.severity,
      codeLocation: issue.location,
      policyCitation: citations[0] ?? "No policy evidence attached",
      additionalPolicyCitations: citations.slice(1),
      generatedFix,
      validationStatus: validationByIssue[issue.title] ?? "Passed with warnings",
      humanReviewRequired:
        issue.severity === "critical" ||
        issue.severity === "high" ||
        issue.title === "Unsafe File Upload",
    };
  });
}

export function buildMergePassport(scan: ScanResult, fix: FixResult): SecureMergePassport {
  const humanReviewRequired = scan.issues.some(
    (issue) =>
      issue.severity === "critical" ||
      issue.severity === "high" ||
      issue.title === "Unsafe File Upload",
  );
  const finalMergeRecommendation =
    fix.riskScoreAfter > 70
      ? "Block until fixed"
      : humanReviewRequired
        ? "Review required"
        : "Approve with caution";

  return {
    riskScoreBefore: fix.riskScoreBefore,
    riskScoreAfter: fix.riskScoreAfter,
    issuesFound: scan.issues.length,
    issuesFixed: fix.fixes.length,
    humanReviewRequired,
    policyEvidenceAttached: scan.issues.every((issue) => issue.citations.length > 0),
    attackReplayCompleted: generateAttackReplays(scan.issues).length === scan.issues.length,
    validationStatus: fix.validationStatus.replaceAll("_", " "),
    finalMergeRecommendation,
  };
}

export function buildProofPack(scan: ScanResult, fix: FixResult): ReportResult {
  return {
    scan,
    fixes: fix.fixes,
    attackReplays: generateAttackReplays(scan.issues),
    traceability: buildTraceability(scan, fix),
    mergePassport: buildMergePassport(scan, fix),
    reportMarkdown: "",
    summary: `Security Proof Pack generated for ${scan.issues.length} findings.`,
  };
}
