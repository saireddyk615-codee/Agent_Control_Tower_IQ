import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readJsonObject, validationErrorResponse } from "@/lib/security/validateRequest";
import { validateWatchtowerRepoPath } from "@/lib/watchtower/watchtowerValidation";
import { toWatchtowerUserReport } from "@/lib/watchtower/watchtowerUserReport";
import type { WatchtowerRunResult } from "@/types/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const repoPath = await validateWatchtowerRepoPath(body.repoPath);
    const report = JSON.parse(await readFile(join(repoPath, ".agent-control-tower", "watchtower-latest.json"), "utf8")) as WatchtowerRunResult;
    return Response.json({ result: report, userReport: toWatchtowerUserReport(report) });
  } catch (error) {
    return validationErrorResponse(error, "No local Agent Watchtower report is available for this repository.");
  }
}
