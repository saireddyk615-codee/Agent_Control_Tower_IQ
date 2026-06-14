import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readJsonObject, RequestValidationError, validationErrorResponse } from "@/lib/security/validateRequest";
import { applySelectedWatchtowerSafeFixes } from "@/lib/watchtower/safeFixEngine";
import { validateWatchtowerRepoPath } from "@/lib/watchtower/watchtowerValidation";
import type { WatchtowerRunResult } from "@/types/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const repoPath = await validateWatchtowerRepoPath(body.repoPath);
    if (!Array.isArray(body.fixIds) || body.fixIds.length > 200 || !body.fixIds.every((id) => typeof id === "string" && id.length <= 100)) {
      throw new RequestValidationError("fixIds must be a bounded string array.");
    }
    const result = JSON.parse(await readFile(join(repoPath, ".agent-control-tower", "watchtower-latest.json"), "utf8")) as WatchtowerRunResult;
    return Response.json(await applySelectedWatchtowerSafeFixes(repoPath, result, body.fixIds));
  } catch (error) {
    return validationErrorResponse(error, "Watchtower could not apply the selected safe fixes.");
  }
}
