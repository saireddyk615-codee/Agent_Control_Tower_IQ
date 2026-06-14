#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { extname, basename } from "node:path";

function detectLanguage(filename, code) {
  const extension = extname(filename).toLowerCase();
  const byExtension = {
    ".js": "javascript", ".jsx": "javascript", ".ts": "typescript", ".tsx": "typescript",
    ".py": "python", ".java": "java", ".cs": "csharp", ".go": "go", ".php": "php",
    ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp", ".hpp": "cpp", ".c": "c", ".h": "c", ".rs": "rust",
  };
  if (byExtension[extension]) return byExtension[extension];
  if (/from\s+fastapi\s+import|import\s+flask/.test(code)) return "python";
  if (/@RestController|public\s+class/.test(code)) return "java";
  if (/using\s+Microsoft\.AspNetCore/.test(code)) return "csharp";
  if (/package\s+main/.test(code)) return "go";
  if (/<\?php/.test(code)) return "php";
  if (/fn\s+main|use\s+std::/.test(code)) return "rust";
  if (/#include/.test(code)) return "cpp";
  return "generic";
}

const rules = [
  ["SQL Injection Risk", "critical", "CWE-89", "Use parameterized queries.", /(?:SELECT|INSERT|UPDATE|DELETE)[^;\n]{0,240}(?:\+|fmt\.Sprintf|f["']|\$_(?:GET|POST))/i],
  ["Hardcoded Secret", "high", "CWE-798", "Move secrets to an approved secret store.", /(?:secret|token|api[_-]?key|password)\s*[:=]\s*["'`][^"'`\n]{8,}["'`]/i],
  ["Weak CORS Configuration", "medium", "CWE-942", "Restrict CORS to trusted origins.", /cors\s*\([^)]*(?:origin\s*:\s*["'`]\*|^\s*$)/i],
  ["Missing Input Validation", "high", "CWE-20", "Validate request input before use.", /(?:req\.(?:query|body|params)|@RequestParam|URL\.Query\(\)\.Get)/i],
  ["Unsafe File Upload", "high", "CWE-434", "Validate upload type, extension, size, and path.", /(?:multer\s*\(\s*\{\s*dest|\$_FILES)/i],
  ["Command Injection Risk", "critical", "CWE-78", "Use allowlisted process arguments without a shell.", /(?:shell\s*=\s*True|Runtime\.getRuntime\(\)\.exec|Process\.Start|exec\.Command|Command::new|system\s*\()/i],
  ["Unsafe Deserialization", "critical", "CWE-502", "Use a safe serialization format.", /(?:pickle\.loads?|ObjectInputStream)/i],
  ["Disabled Certificate Validation", "critical", "CWE-295", "Restore certificate validation.", /(?:InsecureSkipVerify\s*:\s*true|ServerCertificateCustomValidationCallback[^;\n]*true)/i],
  ["Unsafe Memory Function", "high", "CWE-120", "Use bounds-checked memory operations.", /\b(?:strcpy|strcat|sprintf|gets)\s*\(/],
  ["Unsafe Block Review", "medium", "CWE-119", "Minimize unsafe scope and document invariants.", /\bunsafe\s*\{/],
];

function scanText(code, filename) {
  const detectedLanguage = detectLanguage(filename, code);
  const issues = rules.filter((rule) => rule[4].test(code)).map((rule, index) => ({
    id: `SG-CLI-${String(index + 1).padStart(3, "0")}`,
    title: rule[0], severity: rule[1], cwe: rule[2], suggestedFix: rule[3], location: filename,
  }));
  const points = { critical: 25, high: 18, medium: 12, low: 6 };
  const riskScore = Math.min(100, issues.reduce((sum, issue) => sum + points[issue.severity], 0));
  return {
    scannerEngine: "market-language-rules",
    detectedLanguage,
    sourceName: filename,
    riskScore,
    mergeRecommendation: riskScore <= 30 ? "Approve with caution" : riskScore <= 70 ? "Review required" : "Block until fixed",
    issues,
    languageCoverageNote: "Market-language optimized through modular security rule packs. Not intended to claim perfect support for every programming language.",
  };
}

function toSarif(scan) {
  return {
    version: "2.1.0",
    runs: [{
      tool: { driver: { name: "SecureGuard-LM IQ", informationUri: "https://github.com/" } },
      results: scan.issues.map((issue) => ({
        ruleId: issue.cwe,
        level: issue.severity === "critical" || issue.severity === "high" ? "error" : issue.severity === "medium" ? "warning" : "note",
        message: { text: `${issue.title}: ${issue.suggestedFix}` },
        locations: [{ physicalLocation: { artifactLocation: { uri: issue.location } } }],
      })),
    }],
  };
}

function printText(scan) {
  console.log(`SecureGuard-LM IQ Security Courtroom\nLanguage: ${scan.detectedLanguage}\nRisk: ${scan.riskScore}/100\nVerdict: ${scan.mergeRecommendation}\n`);
  for (const issue of scan.issues) console.log(`[${issue.severity.toUpperCase()}] ${issue.title} (${issue.cwe})\n  ${issue.suggestedFix}`);
}

const args = process.argv.slice(2);
const [command, file] = args;
const mode = args.includes("--sarif") ? "sarif" : args.includes("--json") ? "json" : "text";

if (command !== "scan" || !file) {
  console.error("Usage: secureguard scan <file> [--json|--sarif]");
  process.exitCode = 1;
} else {
  try {
    const code = await readFile(file, "utf8");
    const scan = scanText(code, basename(file));
    if (mode === "sarif") console.log(JSON.stringify(toSarif(scan), null, 2));
    else if (mode === "json") console.log(JSON.stringify(scan, null, 2));
    else printText(scan);
  } catch (error) {
    console.error(
      `SecureGuard could not read or scan the requested file: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  }
}
