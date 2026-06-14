import { enrichFindingAzure, azureIsConfigured } from "./client.ts";
import { enrichFindingMock }                    from "./mockKnowledge.ts";
import type { EnrichmentFindingInput, EnrichResponse } from "./types.ts";

export async function enrichFindings(findings: EnrichmentFindingInput[]): Promise<EnrichResponse> {
  if (!findings.length) {
    return { ok: true, mode: "mock", fallbackUsed: false, enrichments: [] };
  }

  const useAzure = azureIsConfigured();

  if (!useAzure) {
    return {
      ok: true,
      mode: "mock",
      fallbackUsed: true,
      fallbackReason: "Azure credentials not configured or retrieval failed.",
      enrichments: findings.map(enrichFindingMock),
    };
  }

  /* Try Azure for each finding; collect failures */
  const enrichments = [];
  let fallbackUsed = false;
  let fallbackReason: string | undefined;

  for (const finding of findings) {
    const result = await enrichFindingAzure(finding);
    if (result.fallbackUsed) {
      fallbackUsed  = true;
      fallbackReason = result.reason;
      enrichments.push(enrichFindingMock(finding));
    } else {
      enrichments.push(result.enrichment);
    }
  }

  return {
    ok:            true,
    mode:          fallbackUsed ? "mock" : "azure",
    fallbackUsed,
    fallbackReason,
    enrichments,
  };
}
