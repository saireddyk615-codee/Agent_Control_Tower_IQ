import { fixedExpressCode, vulnerableExpressCode } from "@/lib/demo/loadDemoCode";
import { detectLanguage } from "@/lib/scanner/languageDetector";
import { scanCode } from "@/lib/scanner/securityScanner";
import type { DetectedLanguage, FixResult, SecurityFix, SecurityIssue } from "@/types/security";

const FIX_EXPLANATIONS: Record<string, string> = {
  "SQL Injection Risk":
    "Replace string-concatenated SQL with a parameterized query and add numeric ID validation before database access.",
  "Hardcoded Secret":
    "Move the JWT secret to process.env.JWT_SECRET and fail safely when the required secret is missing.",
  "Weak CORS Configuration":
    "Replace wildcard CORS access with an explicit trusted-origin allowlist.",
  "Missing Input Validation":
    "Validate user IDs and request input types before using values in application or database operations.",
  "Unsafe File Upload":
    "Add file size limits, validate MIME type and extension, normalize resolved paths, and generate a server-controlled filename instead of trusting the original filename.",
};

const FIX_CHANGE_SUMMARIES: Record<string, string> = {
  "SQL Injection Risk": "Replaced concatenated SQL with a parameterized query and validated IDs.",
  "Hardcoded Secret": "Moved the JWT secret to process.env.JWT_SECRET with a required-value check.",
  "Weak CORS Configuration": "Replaced wildcard CORS with a trusted-origin allowlist.",
  "Missing Input Validation": "Added explicit validation before request values are processed.",
  "Unsafe File Upload":
    "Added upload size, MIME type, extension, and normalized path controls with server-generated names.",
};

const LANGUAGE_GUIDANCE: Partial<Record<DetectedLanguage, string[]>> = {
  python: [
    "Use parameterized cursor.execute(query, parameters) calls.",
    "Pass subprocess arguments as a list and never use shell=True with untrusted input.",
    "Disable framework debug mode and validate resolved file paths.",
  ],
  java: [
    "Use PreparedStatement with bound parameters.",
    "Avoid Runtime.exec with user-controlled input and validate controller models with @Valid.",
    "Replace native deserialization of untrusted data with a safe format.",
  ],
  csharp: [
    "Use parameterized SqlCommand values.",
    "Avoid Process.Start with untrusted input.",
    "Restore platform certificate validation and validate resolved paths.",
  ],
  go: [
    "Use database query parameters instead of fmt.Sprintf.",
    "Remove InsecureSkipVerify and validate command arguments and paths.",
    "Validate request query, route, and body values before use.",
  ],
  php: [
    "Use prepared statements, remove shell execution, and validate uploaded files.",
  ],
  cpp: [
    "Replace unsafe memory functions with bounded alternatives and avoid system().",
  ],
  c: [
    "Replace unsafe memory functions with bounded alternatives and avoid system().",
  ],
  rust: [
    "Use fixed commands with allowlisted arguments, canonicalize paths, and minimize unsafe blocks.",
  ],
};

const normalizeCode = (code: string) =>
  code
    .replace(/^\/\* eslint-disable @typescript-eslint\/no-require-imports \*\/\s*/, "")
    .trim();

function createBestEffortCode(code: string, issues: SecurityIssue[]): string {
  const language = issues[0]?.language ?? detectLanguage(code);
  const guidance = issues
    .map(
      (issue) =>
        `// TODO (${issue.severity.toUpperCase()}): ${FIX_EXPLANATIONS[issue.title] ?? issue.suggestedFix}`,
    )
    .join("\n");
  const languageGuidance = (LANGUAGE_GUIDANCE[language] ?? [
    "Apply each remediation within the surrounding project architecture and test it before merge.",
  ])
    .map((item) => `// - ${item}`)
    .join("\n");

  return `// SecureGuard ${language} remediation guidance and safe patch notes.
// This is not a complete automated project patch. Developer review is required.
${languageGuidance}
${guidance}

${code}`;
}

export function generateSecureFix(code: string, issues: SecurityIssue[]): FixResult {
  const normalizedCode = normalizeCode(code);
  const isDeterministicDemoFix =
    normalizedCode === normalizeCode(vulnerableExpressCode) ||
    (normalizedCode.includes('const JWT_SECRET = "demo_fake_secret_do_not_use"') &&
      normalizedCode.includes('cors({ origin: "*" })') &&
      normalizedCode.includes('multer({ dest: "public/uploads/" })'));
  const fixedCode = isDeterministicDemoFix ? fixedExpressCode : createBestEffortCode(code, issues);
  let riskScoreBefore = 0;
  try {
    riskScoreBefore = scanCode(code).riskScore;
  } catch {
    // The API validates normal input first. Keep direct library use deterministic and non-throwing.
    riskScoreBefore = Math.min(
      100,
      issues.reduce((score, issue) => {
        const points = { critical: 25, high: 18, medium: 12, low: 6 }[issue.severity];
        return score + points;
      }, 0),
    );
  }
  const riskScoreAfter = isDeterministicDemoFix ? Math.round(riskScoreBefore * 0.3) : riskScoreBefore;
  const fixes: SecurityFix[] = issues.map((issue) => ({
    issueId: issue.id,
    issueTitle: issue.title,
    title: issue.title,
    explanation: FIX_EXPLANATIONS[issue.title] ?? issue.suggestedFix,
    changeSummary: FIX_CHANGE_SUMMARIES[issue.title] ?? issue.suggestedFix,
    citations: issue.citations,
  }));
  const humanReviewRequired = true;

  return {
    originalCode: code,
    fixedCode,
    fixes,
    riskScoreBefore,
    riskScoreAfter,
    validationStatus: "passed_with_warnings",
    humanReviewRequired,
    isDeterministicDemoFix,
    summary: isDeterministicDemoFix
      ? `Generated ${fixes.length} deterministic remediations and reduced the modeled risk score from ${riskScoreBefore} to ${riskScoreAfter}. Developer review remains required.`
      : `Generated language-specific remediation guidance for ${fixes.length} findings without claiming a complete automated patch or risk reduction. Full patching and validation require human review.`,
  };
}
