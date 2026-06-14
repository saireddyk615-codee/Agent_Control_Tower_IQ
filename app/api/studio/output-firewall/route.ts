import { scanAgentFinalOutput } from "@/lib/studio/outputFirewall";
import { optionalText, readStudioBody, requiredText, validationErrorResponse } from "@/lib/studio/studioRequest";

export async function POST(request: Request) {
  try {
    const body = await readStudioBody(request);
    return Response.json(scanAgentFinalOutput({
      outputText: requiredText(body.outputText, "Agent output"),
      honeyCanary: optionalText(body.honeyCanary, 1_000),
    }));
  } catch (error) {
    return validationErrorResponse(error, "Output Firewall could not scan the provided output.");
  }
}
