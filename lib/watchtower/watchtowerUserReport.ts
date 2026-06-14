import { join } from "node:path";
import type { WatchtowerFinding, WatchtowerRunResult, WatchtowerUserReport } from "../../types/security.ts";

export function watchtowerShortNote(finding: WatchtowerFinding) {
  if (finding.title) return finding.title;
  return finding.explanation.length > 120 ? `${finding.explanation.slice(0, 117)}...` : finding.explanation;
}

function shortRiskNote(result: WatchtowerRunResult) {
  if (result.decision === "safe") return "No high-risk local configuration, secret, source, workflow, or scope findings were detected.";
  const risks = new Set(result.findings.filter((finding) => ["critical", "high"].includes(finding.severity)).map((finding) => finding.category.replaceAll("_", " ")));
  return `${result.decision === "blocked" ? "Blocked" : "Needs review"} because Watchtower found ${[...risks].slice(0, 3).join(", ") || "project risks"} that require ${result.decision === "blocked" ? "resolution or " : ""}human review.`;
}

export function toWatchtowerUserReport(result: WatchtowerRunResult): WatchtowerUserReport {
  const reportDirectory = join(result.repoPath, ".agent-control-tower");
  const findings = result.findings.map((finding) => ({
    id: finding.id,
    severity: finding.severity,
    category: finding.category,
    file: finding.file,
    line: finding.line,
    title: finding.title ?? finding.explanation,
    shortNote: watchtowerShortNote(finding),
    explanation: finding.explanation,
    recommendation: finding.recommendation,
    evidence: finding.evidence,
    safeFixAvailable: Boolean(finding.safeFixAvailable),
    fixType: finding.safeFixAvailable ? "approved_safety_file" : undefined,
    humanApprovalRequired: !finding.safeFixAvailable,
  }));
  return {
    decision: result.decision,
    riskScore: result.riskScore,
    summary: result.summary,
    shortRiskNote: shortRiskNote(result),
    checksRun: result.checksRun ?? [],
    findings,
    fixPlan: findings.map((finding) => ({
      id: `FIX-${finding.id}`,
      title: finding.title,
      file: finding.file,
      recommendedFix: finding.recommendation,
      safeFixAvailable: finding.safeFixAvailable,
      humanApprovalRequired: finding.humanApprovalRequired,
      safePatchPreview: finding.safeFixAvailable
        ? `Generate or safely update ${finding.file ?? "the approved safety artifact"}.`
        : `Review ${finding.file ?? "the finding"}${finding.line ? `:${finding.line}` : ""} and apply: ${finding.recommendation}`,
    })),
    artifacts: result.generatedArtifacts.map(({ path, description }) => ({ path, description })),
    reportPaths: {
      json: join(reportDirectory, "watchtower-latest.json"),
      markdown: join(reportDirectory, "WATCHTOWER_REPORT.md"),
      pdf: join(reportDirectory, "WATCHTOWER_SECURITY_REPORT.pdf"),
    },
    repoPath: result.repoPath,
    projectName: result.projectName,
    scannedAt: result.generatedAt,
  };
}
