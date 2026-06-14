import { analyzeRepoForAgentReadiness } from "@/lib/studio/repoGuardian";
import { optionalText, readStudioBody, requiredText, validationErrorResponse } from "@/lib/studio/studioRequest";

export async function POST(request: Request) {
  try {
    const body = await readStudioBody(request);
    return Response.json(analyzeRepoForAgentReadiness({
      content: requiredText(body.content, "Repo content"),
      projectName: optionalText(body.projectName, 240),
      filename: optionalText(body.filename, 240),
    }));
  } catch (error) {
    return validationErrorResponse(error, "Repo Guardian could not analyze the provided repository context.");
  }
}
