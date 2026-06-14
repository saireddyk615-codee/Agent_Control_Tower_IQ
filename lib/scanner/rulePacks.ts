import type { DetectedLanguage, Severity } from "@/types/security";

export interface SecurityRule {
  id: string;
  language: DetectedLanguage | "generic";
  title: string;
  severity: Severity;
  category: string;
  cwe: string;
  owasp: string;
  confidence: "high" | "medium" | "low";
  description: string;
  suggestedFix: string;
  policyTopic: string;
  patterns: RegExp[];
}

const rule = (
  id: string,
  language: SecurityRule["language"],
  title: string,
  severity: Severity,
  category: string,
  cwe: string,
  owasp: string,
  confidence: SecurityRule["confidence"],
  description: string,
  suggestedFix: string,
  policyTopic: string,
  patterns: RegExp[],
): SecurityRule => ({
  id,
  language,
  title,
  severity,
  category,
  cwe,
  owasp,
  confidence,
  description,
  suggestedFix,
  policyTopic,
  patterns,
});

export const GENERIC_RULES: SecurityRule[] = [
  rule("GEN-SECRET", "generic", "Hardcoded Secret", "high", "Secrets Management", "CWE-798", "A02 Cryptographic Failures", "high", "A secret-like value appears embedded in source code.", "Move secrets to environment variables or an approved managed secret store.", "secrets-management", [/(?:secret|token|api[_-]?key|password|private[_-]?key)\s*[:=]\s*["'`][^"'`\n]{8,}["'`]/i]),
  rule("GEN-COMMAND", "generic", "Command Injection Risk", "critical", "Command Execution", "CWE-78", "A03 Injection", "medium", "Untrusted input may reach an operating-system command execution API.", "Avoid shell execution and pass validated allowlisted arguments to a safe process API.", "input-validation", [/(?:exec|system|shell_exec|Runtime\.getRuntime\(\)\.exec|Process\.Start|exec\.Command|Command::new)\s*\([^)\n]*(?:req\.|request\.|\$_(?:GET|POST)|args|input|param|query)/i]),
];

export const RULE_PACKS: Record<DetectedLanguage, SecurityRule[]> = {
  javascript: [
    rule("JS-SQL", "javascript", "SQL Injection Risk", "critical", "Injection", "CWE-89", "A03 Injection", "high", "A SQL statement concatenates or interpolates request-controlled data.", "Use parameterized queries and validate request input before database access.", "secure-coding", [/(?:SELECT|INSERT|UPDATE|DELETE)[^;\n]{0,220}(?:\+|`[^`]*\$\{)[^;\n]*(?:req\.|request\.)/i]),
    rule("JS-CORS", "javascript", "Weak CORS Configuration", "medium", "Security Misconfiguration", "CWE-942", "A05 Security Misconfiguration", "high", "CORS is unrestricted or uses a wildcard origin.", "Restrict CORS to an explicit trusted-origin allowlist.", "api-security", [/cors\s*\(\s*\)/i, /cors\s*\(\s*\{[^}]{0,180}origin\s*:\s*["'`]\*["'`]/i]),
    rule("JS-VALIDATION", "javascript", "Missing Input Validation", "high", "Input Validation", "CWE-20", "A04 Insecure Design / A03 Injection", "medium", "Request values are used directly without an observable validation boundary.", "Validate and reject malformed request values before processing.", "input-validation", [/(?:req|request)\.(?:query|body|params)\b/i]),
    rule("JS-UPLOAD", "javascript", "Unsafe File Upload", "high", "File Upload Security", "CWE-434", "A05 Security Misconfiguration", "high", "File upload handling lacks explicit type, size, or storage controls.", "Validate MIME type, extension, size, and normalized destination paths.", "file-upload-security", [/multer\s*\(\s*\{\s*dest\s*:/i, /\boriginalname\b/i]),
    rule("JS-EVAL", "javascript", "Unsafe Eval Usage", "high", "Code Injection", "CWE-95", "A03 Injection", "high", "Dynamic code evaluation can execute attacker-controlled JavaScript.", "Remove eval and use explicit parsing or allowlisted operations.", "secure-coding", [/\beval\s*\(/]),
    rule("JS-CMD", "javascript", "Command Injection Risk", "critical", "Command Execution", "CWE-78", "A03 Injection", "high", "Request-controlled input may reach child_process execution.", "Use execFile or spawn with validated allowlisted arguments and no shell.", "input-validation", [/(?:child_process|exec|execSync|spawn)\s*\([^)\n]*(?:req\.|request\.)/i]),
  ],
  typescript: [],
  python: [
    rule("PY-SQL", "python", "SQL Injection Risk", "critical", "Injection", "CWE-89", "A03 Injection", "high", "A SQL query is built with interpolation or string formatting.", "Use parameterized database queries and validate request values.", "secure-coding", [/(?:execute|query)\s*\(\s*(?:f["']|["'][^"'\n]*(?:%|\.format\(|\+))/i]),
    rule("PY-DEBUG", "python", "Debug Mode Enabled", "high", "Security Misconfiguration", "CWE-489", "A05 Security Misconfiguration", "high", "Application debug mode is enabled.", "Disable debug mode outside isolated local development.", "api-security", [/debug\s*=\s*True\b/, /uvicorn\.run\([^)]*reload\s*=\s*True/i]),
    rule("PY-SHELL", "python", "Command Injection Risk", "critical", "Command Execution", "CWE-78", "A03 Injection", "high", "A subprocess is launched with shell=True.", "Avoid shell=True and pass validated arguments as a list.", "input-validation", [/subprocess\.(?:run|Popen|call)\s*\([^)]{0,240}shell\s*=\s*True/i]),
    rule("PY-PICKLE", "python", "Unsafe Deserialization", "critical", "Deserialization", "CWE-502", "A08 Software and Data Integrity Failures", "high", "pickle.loads can execute code from untrusted serialized input.", "Use a safe serialization format and reject untrusted pickle data.", "input-validation", [/\bpickle\.loads?\s*\(/]),
    rule("PY-PATH", "python", "Path Traversal Risk", "high", "File System Security", "CWE-22", "A01 Broken Access Control", "medium", "A user-controlled filename may be joined into a file path.", "Resolve and validate paths against an approved base directory.", "file-upload-security", [/(?:open|Path|os\.path\.join)\s*\([^)\n]*(?:filename|request\.|user_)/i]),
  ],
  java: [
    rule("JAVA-SQL", "java", "SQL Injection Risk", "critical", "Injection", "CWE-89", "A03 Injection", "high", "A SQL query is constructed with string concatenation.", "Use PreparedStatement with bound parameters.", "secure-coding", [/(?:executeQuery|executeUpdate|createStatement)\s*\([^;\n]*\+/i, /String\s+(?:sql|query)\s*=\s*["'][^;\n]*\+/i]),
    rule("JAVA-CMD", "java", "Command Injection Risk", "critical", "Command Execution", "CWE-78", "A03 Injection", "high", "Runtime.exec may execute untrusted command input.", "Avoid Runtime.exec with user input; use validated ProcessBuilder arguments.", "input-validation", [/Runtime\.getRuntime\(\)\.exec\s*\(/]),
    rule("JAVA-DESER", "java", "Unsafe Deserialization", "critical", "Deserialization", "CWE-502", "A08 Software and Data Integrity Failures", "high", "ObjectInputStream may deserialize attacker-controlled objects.", "Avoid native Java deserialization for untrusted input.", "input-validation", [/\bObjectInputStream\b/]),
    rule("JAVA-TLS", "java", "Disabled Certificate Validation", "critical", "Transport Security", "CWE-295", "A02 Cryptographic Failures", "medium", "TLS certificate or hostname validation appears disabled.", "Restore platform certificate and hostname validation.", "api-security", [/(?:TrustAll|ALLOW_ALL_HOSTNAME_VERIFIER|checkServerTrusted\s*\([^)]*\)\s*\{\s*\})/i]),
    rule("JAVA-VALIDATION", "java", "Missing Input Validation", "high", "Input Validation", "CWE-20", "A04 Insecure Design", "medium", "Controller input is accepted without an observable validation annotation.", "Validate controller input with @Valid and constrained request models.", "input-validation", [/@RequestParam|@PathVariable|@RequestBody/]),
  ],
  csharp: [
    rule("CS-SQL", "csharp", "SQL Injection Risk", "critical", "Injection", "CWE-89", "A03 Injection", "high", "A SqlCommand query is built using interpolation or concatenation.", "Use parameterized SqlCommand values.", "secure-coding", [/new\s+SqlCommand\s*\([^;\n]*(?:\+|\$")/i]),
    rule("CS-CMD", "csharp", "Command Injection Risk", "critical", "Command Execution", "CWE-78", "A03 Injection", "high", "Process.Start may execute untrusted input.", "Avoid Process.Start with untrusted input and use validated arguments.", "input-validation", [/Process\.Start\s*\(/]),
    rule("CS-TLS", "csharp", "Disabled Certificate Validation", "critical", "Transport Security", "CWE-295", "A02 Cryptographic Failures", "high", "Certificate validation callback accepts any certificate.", "Remove permissive callbacks and restore certificate validation.", "api-security", [/ServerCertificateCustomValidationCallback\s*=\s*[^;\n]*=>\s*true/i]),
    rule("CS-PATH", "csharp", "Path Traversal Risk", "high", "File System Security", "CWE-22", "A01 Broken Access Control", "medium", "Request input may be combined into a file path.", "Normalize and validate the resolved path against an approved root.", "file-upload-security", [/Path\.(?:Combine|Join)\s*\([^)\n]*(?:Request|fileName|input|path)/i]),
  ],
  go: [
    rule("GO-SQL", "go", "SQL Injection Risk", "critical", "Injection", "CWE-89", "A03 Injection", "high", "fmt.Sprintf is used to construct a SQL query.", "Use database query parameters instead of fmt.Sprintf.", "secure-coding", [/(?:Query|Exec)\s*\(\s*fmt\.Sprintf/i, /fmt\.Sprintf\s*\(\s*["'`](?:SELECT|INSERT|UPDATE|DELETE)/i]),
    rule("GO-CMD", "go", "Command Injection Risk", "critical", "Command Execution", "CWE-78", "A03 Injection", "medium", "exec.Command may receive request-controlled input.", "Use allowlisted command arguments and validate all inputs.", "input-validation", [/exec\.Command\s*\(/i]),
    rule("GO-TLS", "go", "Disabled Certificate Validation", "critical", "Transport Security", "CWE-295", "A02 Cryptographic Failures", "high", "TLS certificate verification is disabled.", "Remove InsecureSkipVerify and use trusted certificates.", "api-security", [/InsecureSkipVerify\s*:\s*true/i]),
    rule("GO-PATH", "go", "Path Traversal Risk", "high", "File System Security", "CWE-22", "A01 Broken Access Control", "medium", "URL or query input may be joined into a file path.", "Clean and validate paths against an approved base directory.", "file-upload-security", [/filepath\.Join\s*\([^)\n]*(?:Query|FormValue|URL|input|name)/i]),
    rule("GO-VALIDATION", "go", "Missing Input Validation", "high", "Input Validation", "CWE-20", "A04 Insecure Design", "medium", "Request values are read without an observable validation boundary.", "Validate query, path, and body values before use.", "input-validation", [/(?:URL\.Query\(\)\.Get|FormValue)\s*\(/]),
  ],
  php: [
    rule("PHP-SQL", "php", "SQL Injection Risk", "critical", "Injection", "CWE-89", "A03 Injection", "high", "Superglobal request input is used in a SQL statement.", "Use prepared statements and validate request values.", "secure-coding", [/(?:SELECT|INSERT|UPDATE|DELETE)[^;\n]{0,220}\$_(?:GET|POST)/i]),
    rule("PHP-CMD", "php", "Command Injection Risk", "critical", "Command Execution", "CWE-78", "A03 Injection", "high", "A shell execution function may receive request input.", "Remove shell execution or pass strictly allowlisted arguments.", "input-validation", [/(?:exec|shell_exec|system)\s*\([^)\n]*\$_(?:GET|POST)/i]),
    rule("PHP-UPLOAD", "php", "Unsafe File Upload", "high", "File Upload Security", "CWE-434", "A05 Security Misconfiguration", "medium", "Uploaded file input lacks visible validation controls.", "Validate upload size, MIME type, extension, and destination path.", "file-upload-security", [/\$_FILES\b/]),
  ],
  cpp: [
    rule("CPP-BOUNDS", "cpp", "Unsafe Memory Function", "high", "Memory Safety", "CWE-120", "A06 Vulnerable and Outdated Components", "high", "An unsafe unbounded memory function is used.", "Use bounds-checked alternatives and explicit length validation.", "input-validation", [/\b(?:strcpy|strcat|sprintf|gets)\s*\(/]),
    rule("CPP-CMD", "cpp", "Command Injection Risk", "critical", "Command Execution", "CWE-78", "A03 Injection", "medium", "system() executes a shell command.", "Avoid system(); use a safe process API with validated arguments.", "input-validation", [/\bsystem\s*\(/]),
    rule("CPP-BOUNDS-MISSING", "cpp", "Missing Bounds Check", "medium", "Memory Safety", "CWE-119", "A04 Insecure Design", "low", "Buffer handling does not show an explicit bounds check.", "Validate destination capacity before copying data.", "input-validation", [/\bchar\s+\w+\s*\[\s*\d+\s*\]/]),
  ],
  c: [],
  rust: [
    rule("RUST-CMD", "rust", "Command Injection Risk", "high", "Command Execution", "CWE-78", "A03 Injection", "medium", "Command::new may receive untrusted command or arguments.", "Use fixed commands and validate allowlisted arguments.", "input-validation", [/Command::new\s*\([^)\n]*(?:args|input|user|env::args)/i]),
    rule("RUST-UNSAFE", "rust", "Unsafe Block Review", "medium", "Memory Safety", "CWE-119", "A04 Insecure Design", "medium", "An unsafe block requires focused memory-safety review.", "Minimize unsafe scope and document verified invariants.", "input-validation", [/\bunsafe\s*\{/]),
    rule("RUST-PATH", "rust", "Path Traversal Risk", "high", "File System Security", "CWE-22", "A01 Broken Access Control", "medium", "Untrusted input may be joined into a filesystem path.", "Canonicalize and validate paths against an approved base.", "file-upload-security", [/PathBuf::from\s*\([^)\n]*(?:args|input|user)/i, /\.join\s*\([^)\n]*(?:args|input|user)/i]),
  ],
  generic: [],
};

RULE_PACKS.typescript = RULE_PACKS.javascript;
RULE_PACKS.c = RULE_PACKS.cpp;
