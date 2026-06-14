import { analyzeAgentDiff } from "@/lib/studio/agentDiffGuard";
import { readStudioBody, requiredText, stringList, validationErrorResponse } from "@/lib/studio/studioRequest";

export async function POST(request: Request) {
  try {
    const body = await readStudioBody(request);
    return Response.json(analyzeAgentDiff({
      approvedTask: requiredText(body.approvedTask, "Approved task", 10_000),
      allowedFiles: stringList(body.allowedFiles),
      blockedFiles: stringList(body.blockedFiles),
      diffText: requiredText(body.diffText, "Agent diff"),
    }));
  } catch (error) {
    return validationErrorResponse(error, "Diff Guard could not analyze the provided diff.");
  }
}
