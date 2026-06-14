import { readJsonObject, validationErrorResponse } from "@/lib/security/validateRequest";
import { installWatchtowerPreCommitHook } from "@/lib/watchtower/gitHookInstaller";
import { validateWatchtowerRepoPath } from "@/lib/watchtower/watchtowerValidation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const repoPath = await validateWatchtowerRepoPath(body.repoPath);
    return Response.json(await installWatchtowerPreCommitHook(repoPath));
  } catch (error) {
    return validationErrorResponse(error, "Agent Watchtower could not install the local pre-commit gate.");
  }
}
