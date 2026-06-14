import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readJsonObject, RequestValidationError, validationErrorResponse } from "@/lib/security/validateRequest";
import { generateWatchtowerPatchPreview } from "@/lib/watchtower/patchPreview";
import { validateWatchtowerRepoPath } from "@/lib/watchtower/watchtowerValidation";
import type { WatchtowerRunResult } from "@/types/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const repoPath = await validateWatchtowerRepoPath(body.repoPath);
    const ids = Array.isArray(body.fixIds) ? body.fixIds.map((id) => typeof id === "string" ? id.replace(/^FIX-/, "") : id) : body.findingIds;
    if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every((id) => typeof id === "string" && id.length <= 100)) {
      throw new RequestValidationError("Select at least one finding for the patch preview.");
    }
    const result = JSON.parse(await readFile(join(repoPath, ".agent-control-tower", "watchtower-latest.json"), "utf8")) as WatchtowerRunResult;
    return Response.json(await generateWatchtowerPatchPreview(repoPath, result, ids as string[]));
  } catch (error) {
    return validationErrorResponse(error, "Watchtower could not generate the manual-review patch preview.");
  }
}
