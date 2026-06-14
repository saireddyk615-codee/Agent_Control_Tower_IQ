import { buildSafeAgentHandoff, type TargetAgentRole } from "@/lib/studio/safeHandoffBuilder";
import { optionalText, readStudioBody, requiredText, validationErrorResponse } from "@/lib/studio/studioRequest";
import { RequestValidationError } from "@/lib/security/validateRequest";

const roles: TargetAgentRole[] = ["planner", "coder", "reviewer", "deployer", "analyst", "unknown"];

export async function POST(request: Request) {
  try {
    const body = await readStudioBody(request);
    if (!roles.includes(body.targetAgentRole as TargetAgentRole)) {
      throw new RequestValidationError("Select a valid target agent role.");
    }
    return Response.json(buildSafeAgentHandoff({
      sourceAgent: optionalText(body.sourceAgent, 240) ?? "Source Agent",
      targetAgent: optionalText(body.targetAgent, 240) ?? "Target Agent",
      task: requiredText(body.task, "Task", 10_000),
      rawContext: requiredText(body.rawContext, "Raw context"),
      targetAgentRole: body.targetAgentRole as TargetAgentRole,
    }));
  } catch (error) {
    return validationErrorResponse(error, "Safe Handoff Builder could not build the requested handoff.");
  }
}
