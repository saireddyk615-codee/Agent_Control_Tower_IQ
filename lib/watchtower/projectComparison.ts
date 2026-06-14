import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { WatchtowerFinding, WatchtowerRunResult } from "../../types/security.ts";

export interface ProjectRiskComparisonInput {
  reports: { projectName: string; repoPath: string; reportPath: string }[];
}

export interface NormalizedRiskKey {
  category: string;
  title: string;
  recommendation: string;
}

export interface ProjectRiskComparisonResult {
  generatedAt: string;
  projectsCompared: { projectName: string; repoPath: string; decision: string; riskScore: number; findingsCount: number }[];
  missingReports: { projectName: string; repoPath: string; reportPath: string; reason: string }[];
  repeatedRisks: {
    key: string; category: string; title: string; recommendation: string; appearsInProjects: string[]; count: number;
    classification: "baseline_setup" | "repeated_real_risk" | "possible_scanner_noise";
  }[];
  projectSpecificRisks: {
    projectName: string;
    risks: {
      severity: string; category: string; file?: string; title: string; explanation?: string; recommendation?: string;
      safeFixAvailable?: boolean; humanApprovalRequired?: boolean; confidence: "high" | "medium" | "low";
    }[];
  }[];
  likelyFalsePositives: {
    projectName: string; file?: string; title: string; evidence?: string; reason: string; recommendedScannerChange: string;
  }[];
  sharedSafeFixes: { title: string; files: string[]; projects: string[] }[];
  manualReviewRequired: { projectName: string; file?: string; title: string; recommendation?: string }[];
  executiveSummary: string;
}

type FindingEntry = { projectName: string; finding: WatchtowerFinding };

function normalize(value: string | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeRiskKey(finding: Pick<WatchtowerFinding, "category" | "title" | "explanation" | "recommendation">): NormalizedRiskKey {
  return {
    category: normalize(finding.category),
    title: normalize(finding.title ?? finding.explanation),
    recommendation: normalize(finding.recommendation),
  };
}

function riskKey(finding: WatchtowerFinding) {
  const key = normalizeRiskKey(finding);
  return `${key.category} | ${key.title} | ${key.recommendation}`;
}

function isBaseline(finding: WatchtowerFinding) {
  return /missing|generate (?:agents|\.agent-safety|\.codex|\.cursor|\.github\/copilot)/i.test(`${finding.title} ${finding.explanation} ${finding.recommendation}`)
    && /agent|safety|codex|cursor|copilot/i.test(`${finding.file} ${finding.title}`);
}

function isPossibleNoise(finding: WatchtowerFinding) {
  return finding.category === "external_url"
    && /(?:^|\/)(?:\.gitignore|[^/]+\.(?:md|txt)|\.env\.example)$/i.test(finding.file);
}

function classification(finding: WatchtowerFinding): "baseline_setup" | "repeated_real_risk" | "possible_scanner_noise" {
  if (isBaseline(finding)) return "baseline_setup";
  if (isPossibleNoise(finding)) return "possible_scanner_noise";
  return "repeated_real_risk";
}

function confidence(finding: WatchtowerFinding): "high" | "medium" | "low" {
  if (isPossibleNoise(finding)) return "low";
  if (finding.severity === "critical" || finding.severity === "high") return "high";
  return "medium";
}

async function exists(path: string) {
  try { await access(path); return true; } catch { return false; }
}

export async function compareProjectRisks(input: ProjectRiskComparisonInput): Promise<ProjectRiskComparisonResult> {
  const reports: { projectName: string; repoPath: string; report: WatchtowerRunResult }[] = [];
  const missingReports: ProjectRiskComparisonResult["missingReports"] = [];
  for (const item of input.reports) {
    if (!(await exists(item.reportPath))) {
      missingReports.push({ ...item, reason: "Watchtower report file was not found." });
      continue;
    }
    try {
      reports.push({ projectName: item.projectName, repoPath: item.repoPath, report: JSON.parse(await readFile(item.reportPath, "utf8")) as WatchtowerRunResult });
    } catch {
      missingReports.push({ ...item, reason: "Watchtower report could not be parsed." });
    }
  }

  const groups = new Map<string, FindingEntry[]>();
  for (const item of reports) {
    for (const finding of item.report.findings ?? []) {
      const key = riskKey(finding);
      groups.set(key, [...(groups.get(key) ?? []), { projectName: item.projectName, finding }]);
    }
  }

  const repeatedRisks: ProjectRiskComparisonResult["repeatedRisks"] = [];
  const projectSpecific = new Map<string, ProjectRiskComparisonResult["projectSpecificRisks"][number]["risks"]>();
  for (const item of reports) projectSpecific.set(item.projectName, []);
  for (const [key, entries] of groups) {
    const projects = [...new Set(entries.map((entry) => entry.projectName))];
    const finding = entries[0].finding;
    if (projects.length > 1) {
      repeatedRisks.push({
        key, category: finding.category, title: finding.title ?? finding.explanation, recommendation: finding.recommendation,
        appearsInProjects: projects, count: projects.length, classification: classification(finding),
      });
    } else {
      projectSpecific.get(projects[0])?.push({
        severity: finding.severity, category: finding.category, file: finding.file, title: finding.title ?? finding.explanation,
        explanation: finding.explanation, recommendation: finding.recommendation, safeFixAvailable: Boolean(finding.safeFixAvailable),
        humanApprovalRequired: !finding.safeFixAvailable, confidence: confidence(finding),
      });
    }
  }

  const likelyFalsePositives = reports.flatMap(({ projectName, report }) => report.findings.filter(isPossibleNoise).map((finding) => ({
    projectName, file: finding.file, title: finding.title ?? finding.explanation, evidence: finding.evidence,
    reason: "URL appears in documentation or an example file rather than production configuration.",
    recommendedScannerChange: "Downgrade or ignore common documentation URLs and example localhost values.",
  })));
  const safeGroups = new Map<string, FindingEntry[]>();
  for (const item of reports) for (const finding of item.report.findings.filter((value) => value.safeFixAvailable)) {
    const key = `${normalize(finding.title ?? finding.explanation)} | ${normalize(finding.recommendation)}`;
    safeGroups.set(key, [...(safeGroups.get(key) ?? []), { projectName: item.projectName, finding }]);
  }
  const sharedSafeFixes = [...safeGroups.values()].filter((items) => new Set(items.map((item) => item.projectName)).size > 1).map((items) => ({
    title: items[0].finding.title ?? items[0].finding.explanation,
    files: [...new Set(items.map((item) => item.finding.file))],
    projects: [...new Set(items.map((item) => item.projectName))],
  }));
  const manualReviewRequired = reports.flatMap(({ projectName, report }) => report.findings.filter((finding) => !finding.safeFixAvailable).map((finding) => ({
    projectName, file: finding.file, title: finding.title ?? finding.explanation, recommendation: finding.recommendation,
  })));
  const projectsCompared = reports.map(({ projectName, repoPath, report }) => ({
    projectName, repoPath, decision: report.decision, riskScore: report.riskScore, findingsCount: report.findings.length,
  }));
  const specificCount = [...projectSpecific.values()].reduce((sum, risks) => sum + risks.length, 0);
  return {
    generatedAt: new Date().toISOString(), projectsCompared, missingReports, repeatedRisks,
    projectSpecificRisks: [...projectSpecific].map(([projectName, risks]) => ({ projectName, risks })),
    likelyFalsePositives, sharedSafeFixes, manualReviewRequired,
    executiveSummary: `Compared ${projectsCompared.length} project reports. Found ${repeatedRisks.length} repeated risks, ${specificCount} project-specific risks, ${likelyFalsePositives.length} likely false positives, ${sharedSafeFixes.length} shared safe fixes, and ${manualReviewRequired.length} findings requiring human review.${missingReports.length ? ` Skipped ${missingReports.length} missing or invalid reports.` : ""}`,
  };
}

function bullets(values: string[]) {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "- None.";
}

export function projectRiskComparisonMarkdown(result: ProjectRiskComparisonResult) {
  return `# Project Risk Comparison Report

Generated: ${result.generatedAt}

## 1. Executive summary

${result.executiveSummary}

## 2. Project scan summary

${bullets(result.projectsCompared.map((project) => `**${project.projectName}** — ${project.decision}, risk ${project.riskScore}/100, ${project.findingsCount} findings (${project.repoPath})`))}
${result.missingReports.length ? `\n### Missing reports\n\n${bullets(result.missingReports.map((item) => `**${item.projectName}** — ${item.reason} (${item.reportPath})`))}` : ""}

## 3. Repeated risks

${bullets(result.repeatedRisks.map((risk) => `**${risk.title}** (${risk.classification}) — ${risk.appearsInProjects.join(", ")}. ${risk.recommendation}`))}

## 4. Project-specific risks

${bullets(result.projectSpecificRisks.flatMap((project) => project.risks.map((risk) => `**${project.projectName}: ${risk.title}** [${risk.severity}/${risk.confidence} confidence] ${risk.file ?? "repository"} — ${risk.recommendation ?? "Review required."}`)))}

## 5. Likely false positives

${bullets(result.likelyFalsePositives.map((risk) => `**${risk.projectName}: ${risk.title}** (${risk.file ?? "repository"}) — ${risk.reason} ${risk.recommendedScannerChange}`))}

## 6. Shared safe fixes

${bullets(result.sharedSafeFixes.map((fix) => `**${fix.title}** — projects: ${fix.projects.join(", ")}; files: ${fix.files.join(", ")}`))}

## 7. Manual review items

${bullets(result.manualReviewRequired.map((risk) => `**${risk.projectName}: ${risk.title}** (${risk.file ?? "repository"}) — ${risk.recommendation ?? "Human review required."}`))}

## 8. Scanner tuning recommendations

- Ignore common documentation hosts in documentation and example files.
- Keep localhost findings in README and .env.example at low severity.
- Require raw SQL or database-call context before reporting critical SQL injection.
- Treat dynamic Supabase query-builder use as needs-review unless raw SQL construction is present.
- Keep path traversal checks and recommend normalization, rejecting \`..\`, restricting allowed directories, and server-generated filenames.
`;
}

export async function writeProjectRiskComparisonReports(result: ProjectRiskComparisonResult, outputDir: string) {
  await mkdir(outputDir, { recursive: true });
  const markdownPath = join(outputDir, "PROJECT_RISK_COMPARISON_REPORT.md");
  const jsonPath = join(outputDir, "PROJECT_RISK_COMPARISON_REPORT.json");
  await writeFile(markdownPath, projectRiskComparisonMarkdown(result), "utf8");
  await writeFile(jsonPath, JSON.stringify(result, null, 2), "utf8");
  return { markdownPath, jsonPath };
}
