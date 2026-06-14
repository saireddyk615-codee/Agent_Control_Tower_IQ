import type { AttackReplay, SecurityIssue } from "@/types/security";

const REPLAY_BY_ISSUE: Record<string, Omit<AttackReplay, "issueId" | "issueTitle">> = {
  "SQL Injection Risk": {
    attackInput: "1 OR 1=1",
    beforeFix: "SELECT * FROM users WHERE id = 1 OR 1=1",
    risk: "Could expose unauthorized records through unsafe query concatenation.",
    afterFix: "Parameterized query with numeric ID validation.",
    result: "Attack blocked by validation and parameter binding.",
  },
  "Hardcoded Secret": {
    attackInput: "Source code disclosure or repository leak",
    beforeFix: "JWT secret is visible directly in source code.",
    risk: "Leaked credential can be reused by attackers.",
    afterFix: "Secret is loaded from process.env.JWT_SECRET or managed secret store.",
    result: "Secret removed from source code.",
  },
  "Weak CORS Configuration": {
    attackInput: "Request from https://evil.example",
    beforeFix: 'origin: "*"',
    risk: "Any domain can call the API from a browser context.",
    afterFix: "Trusted origin allowlist.",
    result: "Untrusted origins blocked.",
  },
  "Missing Input Validation": {
    attackInput: "malformed ID, unexpected type, or malicious body payload",
    beforeFix: "Input accepted directly from req.query or req.body.",
    risk: "Malformed input can reach business logic or database calls.",
    afterFix: "Input validated before use.",
    result: "Malformed input rejected.",
  },
  "Unsafe File Upload": {
    attackInput: "malware.exe or ../../server.js",
    beforeFix: "File accepted without strict validation.",
    risk: "Unsafe files or path traversal payloads could be stored.",
    afterFix: "MIME type, extension, size, and path validation.",
    result: "Unsafe upload blocked.",
  },
};

export function generateAttackReplays(issues: SecurityIssue[]): AttackReplay[] {
  return issues.flatMap((issue) => {
    const replay = REPLAY_BY_ISSUE[issue.title];
    return replay ? [{ issueId: issue.id, issueTitle: issue.title, ...replay }] : [];
  });
}
