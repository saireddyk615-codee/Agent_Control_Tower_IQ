import { generateSecureFix } from "@/lib/fixer/secureFixer";
import {
  readJsonObject,
  validateCode,
  validateIssues,
  validationErrorResponse,
} from "@/lib/security/validateRequest";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const code = validateCode(body.code);
    const issues = validateIssues(body.issues);
    return Response.json(generateSecureFix(code, issues));
  } catch (error) {
    return validationErrorResponse(
      error,
      "SecureGuard could not generate a safer fix. Review the request and try again.",
    );
  }
}
