import {
  generateCICDGateSummary,
  generateComplianceEvidenceSummary,
  generatePRReviewComment,
  generateReviewerChecklist,
  generateSarifPreview,
  generateSecurityCourtroomSummary,
} from "@/lib/report/artifactGenerator";
import {
  readJsonObject,
  validateFixResult,
  validateScanResult,
  validationErrorResponse,
} from "@/lib/security/validateRequest";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const scanResult = validateScanResult(body.scanResult);
    const fixResult = validateFixResult(body.fixResult);
    const input = { scanResult, fixResult };

    return Response.json({
      prReviewComment: generatePRReviewComment(input),
      sarifPreview: generateSarifPreview({ scanResult }),
      cicdGateSummary: generateCICDGateSummary(input),
      reviewerChecklist: generateReviewerChecklist(input),
      complianceEvidenceSummary: generateComplianceEvidenceSummary({ scanResult }),
      securityCourtroomSummary: generateSecurityCourtroomSummary(input),
    });
  } catch (error) {
    return validationErrorResponse(
      error,
      "SecureGuard could not generate DevSecOps artifacts. Review the request and try again.",
    );
  }
}
