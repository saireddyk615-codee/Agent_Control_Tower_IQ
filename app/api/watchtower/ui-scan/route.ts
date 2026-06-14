import { readJsonObject, RequestValidationError, validationErrorResponse } from "@/lib/security/validateRequest";
import { runWatchtowerOnce } from "@/lib/watchtower/watchtowerEngine";
import { toWatchtowerUserReport } from "@/lib/watchtower/watchtowerUserReport";
import { watchtowerConfigFromBody } from "@/lib/watchtower/watchtowerValidation";

export const runtime = "nodejs";
const allowedChecks = new Set([
  "repo_safety", "agent_mcp_config", "git_diff_scope", "secrets_sensitive_data",
  "package_workflow_risks", "output_firewall", "generate_repo_safety_files", "code_security_review",
]);

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!Array.isArray(body.checks) || !body.checks.length || body.checks.length > allowedChecks.size || !body.checks.every((check) => typeof check === "string" && allowedChecks.has(check))) {
      throw new RequestValidationError("Select at least one valid Watchtower check.");
    }
    const config = await watchtowerConfigFromBody(body);
    config.checks = body.checks as string[];
    return Response.json(toWatchtowerUserReport(await runWatchtowerOnce(config)));
  } catch (error) {
    return validationErrorResponse(error, "Agent Watchtower could not scan the requested local repository.");
  }
}
