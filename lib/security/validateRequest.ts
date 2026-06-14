import type {
  AttackReplay,
  FixResult,
  PolicyCitation,
  ScanResult,
  SecurityFix,
  SecurityIssue,
  Severity,
} from "@/types/security";

export const MAX_CODE_LENGTH = 100_000;
export const MAX_REQUEST_BODY_LENGTH = 1_000_000;

const MAX_ISSUES = 25;
const MAX_CITATIONS_PER_ISSUE = 20;
const MAX_REPLAYS = 25;
const MAX_TEXT_LENGTH = 20_000;
const severities: Severity[] = ["low", "medium", "high", "critical"];

export class RequestValidationError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RequestValidationError";
    this.status = status;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isBoundedString = (value: unknown, maxLength = MAX_TEXT_LENGTH): value is string =>
  typeof value === "string" && value.length <= maxLength;

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function isPolicyCitation(value: unknown): value is PolicyCitation {
  if (!isObject(value)) {
    return false;
  }

  return [
    "policyId",
    "policyName",
    "policyTitle",
    "section",
    "title",
    "excerpt",
    "sourcePath",
    "issueType",
    "provider",
  ].every((key) => isBoundedString(value[key]));
}

export function isSecurityIssue(value: unknown): value is SecurityIssue {
  if (!isObject(value)) {
    return false;
  }

  const citations = value.citations;
  return (
    isBoundedString(value.id) &&
    isBoundedString(value.title) &&
    severities.includes(value.severity as Severity) &&
    isBoundedString(value.category) &&
    isBoundedString(value.description) &&
    isBoundedString(value.location) &&
    isBoundedString(value.cwe) &&
    isBoundedString(value.owasp) &&
    isBoundedString(value.suggestedFix) &&
    isBoundedString(value.recommendation) &&
    Array.isArray(citations) &&
    citations.length <= MAX_CITATIONS_PER_ISSUE &&
    citations.every(isPolicyCitation)
  );
}

function isSecurityFix(value: unknown): value is SecurityFix {
  if (!isObject(value)) {
    return false;
  }
  return (
    isBoundedString(value.issueId) &&
    isBoundedString(value.issueTitle) &&
    isBoundedString(value.title) &&
    isBoundedString(value.explanation) &&
    isBoundedString(value.changeSummary) &&
    Array.isArray(value.citations) &&
    value.citations.length <= MAX_CITATIONS_PER_ISSUE &&
    value.citations.every(isPolicyCitation)
  );
}

export function isAttackReplay(value: unknown): value is AttackReplay {
  if (!isObject(value)) {
    return false;
  }
  return ["issueId", "issueTitle", "attackInput", "beforeFix", "risk", "afterFix", "result"].every(
    (key) => isBoundedString(value[key]),
  );
}

export function validateCode(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RequestValidationError("Provide a non-empty JavaScript or Express code string.");
  }
  if (value.length > MAX_CODE_LENGTH) {
    throw new RequestValidationError(
      `Code exceeds the maximum supported length of ${MAX_CODE_LENGTH.toLocaleString()} characters.`,
    );
  }
  return value;
}

export function validateIssues(value: unknown): SecurityIssue[] {
  if (!Array.isArray(value)) {
    throw new RequestValidationError("Provide the detected security issues as an array.");
  }
  if (value.length > MAX_ISSUES || !value.every(isSecurityIssue)) {
    throw new RequestValidationError("The security issues payload is malformed or exceeds limits.");
  }
  return value;
}

export function validateScanResult(value: unknown): ScanResult {
  if (!isObject(value) || !validateScanResultShape(value)) {
    throw new RequestValidationError("Provide a valid completed scanResult.");
  }
  return value as unknown as ScanResult;
}

function validateScanResultShape(value: Record<string, unknown>): boolean {
  return (
    isBoundedString(value.scanId) &&
    isBoundedString(value.scannedAt) &&
    isBoundedString(value.sourceName) &&
    isFiniteNumber(value.riskScore) &&
    value.riskScore >= 0 &&
    value.riskScore <= 100 &&
    isBoundedString(value.mergeRecommendation) &&
    (value.iqMode === "mock" || value.iqMode === "real") &&
    (value.iqProvider === "mock-foundry-iq" ||
      value.iqProvider === "azure-ai-search-foundry-iq") &&
    isBoolean(value.realIqConfigured) &&
    isBoolean(value.realIqRequested) &&
    isBoundedString(value.groundingSummary) &&
    isBoundedString(value.summary) &&
    Array.isArray(value.issues) &&
    value.issues.length <= MAX_ISSUES &&
    value.issues.every(isSecurityIssue)
  );
}

export function validateFixResult(value: unknown): FixResult | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    !isObject(value) ||
    !isBoundedString(value.originalCode, MAX_CODE_LENGTH) ||
    !isBoundedString(value.fixedCode, MAX_CODE_LENGTH * 2) ||
    !Array.isArray(value.fixes) ||
    value.fixes.length > MAX_ISSUES ||
    !value.fixes.every(isSecurityFix) ||
    !isFiniteNumber(value.riskScoreBefore) ||
    !isFiniteNumber(value.riskScoreAfter) ||
    value.riskScoreBefore < 0 ||
    value.riskScoreBefore > 100 ||
    value.riskScoreAfter < 0 ||
    value.riskScoreAfter > 100 ||
    !["passed", "passed_with_warnings", "needs_review"].includes(
      value.validationStatus as string,
    ) ||
    !isBoolean(value.humanReviewRequired) ||
    !isBoundedString(value.summary) ||
    !isBoolean(value.isDeterministicDemoFix)
  ) {
    throw new RequestValidationError("The fixResult payload is malformed or exceeds limits.");
  }
  return value as unknown as FixResult;
}

export function validateAttackReplays(value: unknown): AttackReplay[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.length > MAX_REPLAYS || !value.every(isAttackReplay)) {
    throw new RequestValidationError("The attackReplays payload is malformed or exceeds limits.");
  }
  return value;
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new RequestValidationError("Content-Type must be application/json.");
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_LENGTH) {
    throw new RequestValidationError("Request body exceeds the maximum supported size.", 413);
  }

  const rawBody = await request.text();
  if (rawBody.length === 0) {
    throw new RequestValidationError("Request body must contain valid JSON.");
  }
  if (rawBody.length > MAX_REQUEST_BODY_LENGTH) {
    throw new RequestValidationError("Request body exceeds the maximum supported size.", 413);
  }

  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!isObject(parsed)) {
      throw new RequestValidationError("Request body must be a JSON object.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof RequestValidationError) {
      throw error;
    }
    throw new RequestValidationError("Request body contains malformed JSON.");
  }
}

export function validationErrorResponse(error: unknown, fallbackMessage: string): Response {
  if (error instanceof RequestValidationError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: fallbackMessage }, { status: 500 });
}
