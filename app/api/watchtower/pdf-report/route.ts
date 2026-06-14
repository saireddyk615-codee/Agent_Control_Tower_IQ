import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readJsonObject, RequestValidationError, validationErrorResponse } from "@/lib/security/validateRequest";
import { generateWatchtowerPdfReport } from "@/lib/reports/watchtowerPdfReport";
import { toWatchtowerUserReport } from "@/lib/watchtower/watchtowerUserReport";
import { validateWatchtowerRepoPath } from "@/lib/watchtower/watchtowerValidation";
import type { WatchtowerRunResult } from "@/types/security";
import type { FindingEnrichment } from "@/lib/foundry-iq/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const repoPath = await validateWatchtowerRepoPath(body.repoPath);
    const result = JSON.parse(await readFile(join(repoPath, ".agent-control-tower", "watchtower-latest.json"), "utf8")) as WatchtowerRunResult;
    const report = toWatchtowerUserReport(result);
    const foundryIqMode = body.foundryIqMode === "azure" || body.foundryIqMode === "mock" ? body.foundryIqMode : undefined;
    const foundryIqEvidence: { mode?: "azure" | "mock"; enrichments: FindingEnrichment[] } | undefined = Array.isArray(body.foundryIqEvidence)
      ? { mode: foundryIqMode, enrichments: body.foundryIqEvidence.slice(0, 50) as FindingEnrichment[] }
      : undefined;
    const output = await generateWatchtowerPdfReport({ repoPath, projectName: result.projectName, result: report, outputDir: join(repoPath, ".agent-control-tower"), foundryIqEvidence });
    return new Response(await readFile(output.pdfPath), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${output.fileName}"`, "X-Watchtower-PDF-Path": output.pdfPath },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return validationErrorResponse(new RequestValidationError("Run a scan before downloading PDF report."), "");
    }
    return validationErrorResponse(error, "No local Watchtower report is available for PDF generation.");
  }
}
