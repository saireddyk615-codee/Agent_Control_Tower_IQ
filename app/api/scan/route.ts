import { getIQProviderStatus } from "@/lib/iq/getIQProvider";
import { scanMarketLanguageCode } from "@/lib/scanner/marketLanguageScanner";
import {
  readJsonObject,
  validateCode,
  validationErrorResponse,
} from "@/lib/security/validateRequest";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const code = validateCode(body.code);
    const filename = typeof body.filename === "string" ? body.filename.slice(0, 240) : undefined;

    const result = scanMarketLanguageCode({ code, filename });
    const iqStatus = getIQProviderStatus();
    const issues = await Promise.all(
      result.issues.map(async (issue) => ({
        ...issue,
        citations: await iqStatus.provider.retrievePolicyEvidence(
          `${issue.title}: ${issue.description} ${issue.suggestedFix}`,
          issue.title,
        ),
      })),
    );

    return Response.json({
      ...result,
      iqMode: iqStatus.iqMode,
      iqProvider: iqStatus.iqProvider,
      realIqConfigured: iqStatus.realIqConfigured,
      realIqRequested: iqStatus.realIqRequested,
      groundingSummary: iqStatus.groundingSummary,
      issues,
    });
  } catch (error) {
    return validationErrorResponse(
      error,
      "SecureGuard could not scan the provided code. Verify the request and try again.",
    );
  }
}
