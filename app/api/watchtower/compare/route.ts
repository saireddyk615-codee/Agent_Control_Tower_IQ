import { access } from "node:fs/promises";
import { basename, join } from "node:path";
import { readJsonObject, RequestValidationError, validationErrorResponse } from "@/lib/security/validateRequest";
import { compareProjectRisks, writeProjectRiskComparisonReports } from "@/lib/watchtower/projectComparison";
import { runWatchtowerOnce } from "@/lib/watchtower/watchtowerEngine";
import { validateWatchtowerRepoPath } from "@/lib/watchtower/watchtowerValidation";

export const runtime = "nodejs";

async function exists(path: string) {
  try { await access(path); return true; } catch { return false; }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!Array.isArray(body.repoPaths) || !body.repoPaths.length || body.repoPaths.length > 20 || !body.repoPaths.every((path) => typeof path === "string" && path.length <= 4_096)) {
      throw new RequestValidationError("repoPaths must be a non-empty bounded string array.");
    }
    const runIfMissing = body.runIfMissing === true;
    const repoPaths = await Promise.all(body.repoPaths.map((path) => validateWatchtowerRepoPath(path)));
    const reports = [];
    for (const repoPath of repoPaths) {
      const reportPath = join(repoPath, ".agent-control-tower", "watchtower-latest.json");
      if (!(await exists(reportPath)) && runIfMissing) {
        await runWatchtowerOnce({
          repoPath, projectName: basename(repoPath), watchMode: false, installGitHook: false,
          allowedFiles: [], blockedFiles: [], blockedTools: ["shell", "deploy", "publish", "credential-access"],
          approvalRequiredTools: ["write", "network", "dependency-install"], riskThreshold: 70,
          checks: ["repo_safety", "secrets_sensitive_data", "git_diff_scope", "code_security_review"],
        });
      }
      reports.push({ projectName: basename(repoPath), repoPath, reportPath });
    }
    const comparison = await compareProjectRisks({ reports });
    const reportPaths = await writeProjectRiskComparisonReports(comparison, process.cwd());
    return Response.json({ ...comparison, reportPaths });
  } catch (error) {
    return validationErrorResponse(error, "Watchtower could not compare the requested local projects.");
  }
}
