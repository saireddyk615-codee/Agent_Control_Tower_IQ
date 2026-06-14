export type Severity = "low" | "medium" | "high" | "critical";
export type MergeRecommendation = "Approve with caution" | "Review required" | "Block until fixed";
export type IQMode = "mock" | "real";
export type IQProviderName = "mock-foundry-iq" | "azure-ai-search-foundry-iq";
export type DetectedLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "csharp"
  | "go"
  | "php"
  | "cpp"
  | "c"
  | "rust"
  | "generic";

export interface PolicyCitation {
  policyId: string;
  policyName: string;
  policyTitle: string;
  section: string;
  title: string;
  excerpt: string;
  sourcePath: string;
  issueType: string;
  provider: IQProviderName;
}

export interface SecurityIssue {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  description: string;
  location: string;
  cwe: string;
  owasp: string;
  suggestedFix: string;
  recommendation: string;
  citations: PolicyCitation[];
  language?: DetectedLanguage;
  confidence?: "high" | "medium" | "low";
  policyTopic?: string;
  evidenceSnippet?: string;
}

export interface ScanResult {
  scanId: string;
  scannedAt: string;
  sourceName: string;
  riskScore: number;
  mergeRecommendation: MergeRecommendation;
  iqMode: IQMode;
  iqProvider: IQProviderName;
  realIqConfigured: boolean;
  realIqRequested: boolean;
  groundingSummary: string;
  summary: string;
  issues: SecurityIssue[];
  detectedLanguage?: DetectedLanguage;
  scannerEngine?: "market-language-rules";
  supportedLanguages?: string[];
  primaryLanguages?: string[];
  languageCoverageNote?: string;
}

export interface SecurityFix {
  issueId: string;
  issueTitle: string;
  title: string;
  explanation: string;
  changeSummary: string;
  citations: PolicyCitation[];
}

export type FixValidationStatus = "passed" | "passed_with_warnings" | "needs_review";

export interface FixResult {
  originalCode: string;
  fixedCode: string;
  fixes: SecurityFix[];
  riskScoreBefore: number;
  riskScoreAfter: number;
  validationStatus: FixValidationStatus;
  humanReviewRequired: boolean;
  summary: string;
  isDeterministicDemoFix: boolean;
}

export interface AttackReplay {
  issueId: string;
  issueTitle: string;
  attackInput: string;
  beforeFix: string;
  risk: string;
  afterFix: string;
  result: string;
}

export interface TraceabilityItem {
  issue: string;
  severity: Severity;
  codeLocation: string;
  policyCitation: string;
  additionalPolicyCitations: string[];
  generatedFix: string;
  validationStatus: string;
  humanReviewRequired: boolean;
}

export interface SecureMergePassport {
  riskScoreBefore: number;
  riskScoreAfter: number;
  issuesFound: number;
  issuesFixed: number;
  humanReviewRequired: boolean;
  policyEvidenceAttached: boolean;
  attackReplayCompleted: boolean;
  validationStatus: string;
  finalMergeRecommendation: string;
}

export interface ReportResult {
  scan: ScanResult;
  fixes: SecurityFix[];
  attackReplays: AttackReplay[];
  traceability: TraceabilityItem[];
  mergePassport: SecureMergePassport;
  reportMarkdown: string;
  summary: string;
}

export interface MergeVerdictArtifactsResult {
  prReviewComment: string;
  sarifPreview: Record<string, unknown>;
  cicdGateSummary: string;
  reviewerChecklist: string[];
  complianceEvidenceSummary: string;
  securityCourtroomSummary: string;
}

export interface SecurityPolicy {
  id: string;
  title: string;
  summary: string;
  recommendation: string;
}

export interface SecurityFinding {
  id: string;
  title: string;
  severity: Severity;
  explanation: string;
  policyIds: string[];
}

export interface WatchtowerConfig {
  repoPath: string;
  projectName: string;
  watchMode: boolean;
  installGitHook: boolean;
  allowedFiles: string[];
  blockedFiles: string[];
  blockedTools: string[];
  approvalRequiredTools: string[];
  riskThreshold: number;
  checks?: string[];
  applySafeFixes?: boolean;
}

export interface WatchtowerFinding {
  id: string;
  category:
    | "secret"
    | "scope_creep"
    | "package_script"
    | "github_workflow"
    | "mcp_config"
    | "external_url"
    | "dangerous_command"
    | "agent_config"
    | "unsafe_dependency"
    | "memory_risk"
    | "output_risk";
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  line?: number;
  title?: string;
  safeFixAvailable?: boolean;
  evidence: string;
  explanation: string;
  recommendation: string;
}

export interface WatchtowerRunResult {
  runId: string;
  generatedAt: string;
  repoPath: string;
  projectName: string;
  decision: "safe" | "needs_review" | "blocked";
  riskScore: number;
  findings: WatchtowerFinding[];
  changedFiles: string[];
  generatedArtifacts: {
    path: string;
    content: string;
    description: string;
  }[];
  checksRun?: string[];
  summary: string;
}

export interface WatchtowerUserFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  file?: string;
  line?: number;
  title: string;
  shortNote: string;
  explanation: string;
  recommendation: string;
  evidence?: string;
  safeFixAvailable: boolean;
  fixType?: string;
  humanApprovalRequired: boolean;
}

export interface WatchtowerUserReport {
  decision: "safe" | "needs_review" | "blocked";
  riskScore: number;
  summary: string;
  shortRiskNote: string;
  checksRun: string[];
  findings: WatchtowerUserFinding[];
  fixPlan: {
    id: string;
    title: string;
    file?: string;
    recommendedFix: string;
    safeFixAvailable: boolean;
    humanApprovalRequired: boolean;
    safePatchPreview?: string;
  }[];
  artifacts: {
    path: string;
    description: string;
  }[];
  reportPaths: {
    json: string;
    markdown: string;
    pdf: string;
  };
  repoPath: string;
  projectName: string;
  scannedAt: string;
}

export interface WatchtowerEvent {
  id: string;
  timestamp: string;
  type:
    | "scan_started"
    | "file_changed"
    | "diff_analyzed"
    | "risk_detected"
    | "artifact_generated"
    | "hook_installed"
    | "scan_completed";
  message: string;
  severity?: "critical" | "high" | "medium" | "low";
  file?: string;
}
