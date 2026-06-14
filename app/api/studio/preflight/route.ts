import { runAgentPreflight } from "@/lib/studio/agentPreflight";
import { readStudioBody, requiredText, stringList, validationErrorResponse } from "@/lib/studio/studioRequest";

export async function POST(request: Request) {
  try {
    const body = await readStudioBody(request);
    return Response.json(runAgentPreflight({
      task: requiredText(body.task, "Agent task", 10_000),
      rawContext: requiredText(body.rawContext, "Raw context"),
      allowedFiles: stringList(body.allowedFiles),
      requestedTools: stringList(body.requestedTools),
    }));
  } catch (error) {
    return validationErrorResponse(error, "Agent Preflight could not analyze the requested mission.");
  }
}
