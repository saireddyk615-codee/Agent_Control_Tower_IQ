import { readJsonObject, RequestValidationError, validationErrorResponse } from "@/lib/security/validateRequest";
import { enrichFindings } from "@/lib/foundry-iq/enrichFinding";
import type { EnrichmentFindingInput } from "@/lib/foundry-iq/types";

export const runtime = "nodejs";

const MAX_FINDINGS = 50;

function validateFinding(value: unknown, index: number): EnrichmentFindingInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestValidationError(`findings[${index}] must be an object.`);
  }
  const f = value as Record<string, unknown>;
  if (typeof f.id       !== "string" || !f.id.trim())       throw new RequestValidationError(`findings[${index}].id is required.`);
  if (typeof f.title    !== "string" || !f.title.trim())     throw new RequestValidationError(`findings[${index}].title is required.`);
  if (typeof f.severity !== "string" || !f.severity.trim())  throw new RequestValidationError(`findings[${index}].severity is required.`);
  if (typeof f.category !== "string" || !f.category.trim())  throw new RequestValidationError(`findings[${index}].category is required.`);
  return {
    id:             f.id.trim().slice(0, 200),
    title:          f.title.trim().slice(0, 500),
    severity:       f.severity.trim().slice(0, 50),
    category:       f.category.trim().slice(0, 200),
    file:           typeof f.file          === "string" ? f.file.trim().slice(0, 500)          : undefined,
    evidence:       typeof f.evidence      === "string" ? f.evidence.trim().slice(0, 1000)      : undefined,
    recommendedFix: typeof f.recommendedFix === "string" ? f.recommendedFix.trim().slice(0, 1000) : undefined,
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);

    if (!Array.isArray(body.findings)) {
      throw new RequestValidationError("findings must be an array.");
    }
    if (body.findings.length === 0) {
      throw new RequestValidationError("findings must contain at least one item.");
    }
    if (body.findings.length > MAX_FINDINGS) {
      throw new RequestValidationError(`findings must contain at most ${MAX_FINDINGS} items.`);
    }

    const findings = body.findings.map(validateFinding);
    const result   = await enrichFindings(findings);

    return Response.json(result);
  } catch (error) {
    return validationErrorResponse(error, "Foundry IQ enrichment failed.");
  }
}
