import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readJsonObject, RequestValidationError, validationErrorResponse } from "@/lib/security/validateRequest";
import { validateWatchtowerRepoPath } from "@/lib/watchtower/watchtowerValidation";
import { toWatchtowerUserReport } from "@/lib/watchtower/watchtowerUserReport";
import type { WatchtowerRunResult } from "@/types/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const repoPath = await validateWatchtowerRepoPath(body.repoPath);
    try {
      const report = JSON.parse(await readFile(join(repoPath, ".agent-control-tower", "watchtower-latest.json"), "utf8")) as WatchtowerRunResult;
      return Response.json(toWatchtowerUserReport(report));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new RequestValidationError("No latest Watchtower report found. Run a scan first.", 404);
      }
      throw error;
    }
  } catch (error) {
    return validationErrorResponse(error, "No latest Watchtower report found. Run a scan first.");
  }
}
