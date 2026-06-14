import { detectLanguage } from "@/lib/scanner/languageDetector";
import { GENERIC_RULES, RULE_PACKS, type SecurityRule } from "@/lib/scanner/rulePacks";
import { MAX_CODE_LENGTH } from "@/lib/security/validateRequest";
import type { MergeRecommendation, ScanResult, SecurityIssue, Severity } from "@/types/security";

const RISK_POINTS: Record<Severity, number> = { critical: 25, high: 18, medium: 12, low: 6 };
const SUPPORTED = ["JavaScript", "TypeScript", "Python", "Java", "C#", "Go", "PHP", "C/C++", "Rust"];
const PRIMARY = ["JavaScript/TypeScript", "Python", "Java", "C#", "Go"];

function recommendation(score: number): MergeRecommendation {
  if (score <= 30) return "Approve with caution";
  if (score <= 70) return "Review required";
  return "Block until fixed";
}

function snippetFor(code: string, rule: SecurityRule): string | undefined {
  for (const pattern of rule.patterns) {
    const match = code.match(pattern);
    if (match?.[0]) return match[0].replace(/\s+/g, " ").trim().slice(0, 220);
  }
}

export function scanMarketLanguageCode(input: { code: string; filename?: string }): ScanResult {
  const { code, filename } = input;
  if (typeof code !== "string") throw new TypeError("Scanner input must be a string.");
  if (code.length > MAX_CODE_LENGTH) throw new RangeError(`Scanner input exceeds ${MAX_CODE_LENGTH} characters.`);

  const detectedLanguage = detectLanguage(code, filename);
  const matchingRules = [...RULE_PACKS[detectedLanguage], ...GENERIC_RULES];
  const detected = matchingRules.filter((rule) => rule.patterns.some((pattern) => pattern.test(code)));
  const unique = detected.filter((rule, index, all) => all.findIndex((candidate) => candidate.title === rule.title) === index);
  const sourceName = filename?.trim() || `source.${detectedLanguage}`;
  const issues: SecurityIssue[] = unique.map((rule, index) => ({
    id: `SG-${detectedLanguage.toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
    title: rule.title,
    severity: rule.severity,
    category: rule.category,
    description: rule.description,
    location: sourceName,
    cwe: rule.cwe,
    owasp: rule.owasp,
    suggestedFix: rule.suggestedFix,
    recommendation: rule.suggestedFix,
    citations: [],
    language: detectedLanguage,
    confidence: rule.confidence,
    policyTopic: rule.policyTopic,
    evidenceSnippet: snippetFor(code, rule),
  }));
  const riskScore = Math.min(100, issues.reduce((sum, issue) => sum + RISK_POINTS[issue.severity], 0));
  const mergeRecommendation = recommendation(riskScore);

  return {
    scanId: `scan-${Date.now()}`,
    scannedAt: new Date().toISOString(),
    sourceName,
    riskScore,
    mergeRecommendation,
    iqMode: "mock",
    iqProvider: "mock-foundry-iq",
    realIqConfigured: false,
    realIqRequested: false,
    groundingSummary: "Policy grounding has not been attached. Use the scan API to retrieve Foundry IQ-compatible evidence.",
    summary: issues.length
      ? `SecureGuard detected ${issues.length} ${detectedLanguage} security issues with a risk score of ${riskScore}/100. ${mergeRecommendation}.`
      : `No matching ${detectedLanguage} rule-pack patterns were detected. Human review is still required.`,
    issues,
    detectedLanguage,
    scannerEngine: "market-language-rules",
    supportedLanguages: SUPPORTED,
    primaryLanguages: PRIMARY,
    languageCoverageNote: "Market-language optimized through modular security rule packs. Not intended to claim perfect support for every programming language.",
  };
}
