import { readJsonObject, validationErrorResponse } from "@/lib/security/validateRequest";
import { runWatchtowerOnce } from "@/lib/watchtower/watchtowerEngine";
import { watchtowerConfigFromBody } from "@/lib/watchtower/watchtowerValidation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const config = await watchtowerConfigFromBody(await readJsonObject(request));
    return Response.json({ result: await runWatchtowerOnce(config) });
  } catch (error) {
    return validationErrorResponse(error, "Agent Watchtower could not scan the requested local repository.");
  }
}
