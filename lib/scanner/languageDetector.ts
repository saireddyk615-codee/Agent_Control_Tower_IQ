import type { DetectedLanguage } from "@/types/security";

const EXTENSION_LANGUAGE: Record<string, DetectedLanguage> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".java": "java",
  ".cs": "csharp",
  ".go": "go",
  ".php": "php",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".c": "c",
  ".h": "c",
  ".rs": "rust",
};

const CONTENT_SIGNALS: Array<{ language: DetectedLanguage; patterns: RegExp[] }> = [
  { language: "python", patterns: [/from\s+fastapi\s+import/i, /import\s+flask/i, /@app\.get/i] },
  {
    language: "java",
    patterns: [/\bpublic\s+class\b/, /@RestController\b/, /\bPreparedStatement\b/, /\bStatement\b/],
  },
  {
    language: "csharp",
    patterns: [/using\s+Microsoft\.AspNetCore/, /\[HttpGet/, /\bSqlCommand\b/],
  },
  { language: "go", patterns: [/\bpackage\s+main\b/, /\bfunc\s+main\s*\(/, /http\.HandleFunc/] },
  { language: "php", patterns: [/<\?php/, /\$_GET\b/, /\$_POST\b/] },
  { language: "rust", patterns: [/\bfn\s+main\s*\(/, /\buse\s+std::/, /\bCommand::new\b/] },
  { language: "cpp", patterns: [/#include\s*</, /\bstd::/, /\bstrcpy\s*\(/, /\bsprintf\s*\(/] },
  {
    language: "javascript",
    patterns: [/require\s*\(\s*["']express["']/, /import\s+express\b/, /\bapp\.get\s*\(/],
  },
];

export function detectLanguage(code: string, filename?: string): DetectedLanguage {
  const normalizedFilename = filename?.trim().toLowerCase() ?? "";
  const extension = normalizedFilename.match(/\.[a-z0-9]+$/)?.[0];
  if (extension && EXTENSION_LANGUAGE[extension]) {
    return EXTENSION_LANGUAGE[extension];
  }

  for (const signal of CONTENT_SIGNALS) {
    if (signal.patterns.some((pattern) => pattern.test(code))) {
      return signal.language;
    }
  }

  if (/#include\s*</.test(code)) {
    return "c";
  }
  return "generic";
}
