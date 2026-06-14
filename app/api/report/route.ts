import { generatePRReport } from "@/lib/report/generatePRReport";
import {
  readJsonObject,
  validateAttackReplays,
  validateFixResult,
  validateScanResult,
  validationErrorResponse,
} from "@/lib/security/validateRequest";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const report = generatePRReport({
      scanResult: validateScanResult(body.scanResult),
      fixResult: validateFixResult(body.fixResult),
      attackReplays: validateAttackReplays(body.attackReplays),
    });

    return Response.json({
      reportMarkdown: report.reportMarkdown,
      summary: report.summary,
    });
  } catch (error) {
    return validationErrorResponse(
      error,
      "SecureGuard could not generate the PR report. Review the request and try again.",
    );
  }
}
