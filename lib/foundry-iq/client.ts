import type { EnrichmentCitation, EnrichmentFindingInput, FindingEnrichment } from "./types.ts";

const AZURE_API_VERSION = "2025-09-01";
const AZURE_TIMEOUT_MS  = 10_000;
const AZURE_TOP_RESULTS = 3;
const MAX_RECOMMENDATION_LENGTH = 420;

interface AzureSearchDoc {
  "@search.score"?: number;
  title?: string;
  source?: string;
  category?: string;
  content?: string;
  [key: string]: unknown;
}

interface AzureSearchResponse {
  value?: AzureSearchDoc[];
}

function azureIsConfigured(): boolean {
  return Boolean(
    process.env.FOUNDRY_IQ_MODE === "azure" &&
    process.env.AZURE_AI_SEARCH_ENDPOINT &&
    process.env.AZURE_AI_SEARCH_INDEX &&
    process.env.AZURE_AI_SEARCH_API_KEY,
  );
}

function buildSearchQuery(finding: EnrichmentFindingInput): string {
  return [finding.title, finding.category, finding.severity, finding.evidence ?? "", finding.recommendedFix ?? ""]
    .filter(Boolean)
    .join(" ");
}

function completeSentenceExcerpt(value: string, maxLength = MAX_RECOMMENDATION_LENGTH): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  const bounded = normalized.slice(0, maxLength);
  const sentenceEnd = Math.max(bounded.lastIndexOf(". "), bounded.lastIndexOf("! "), bounded.lastIndexOf("? "));
  if (sentenceEnd >= 80) return `${bounded.slice(0, sentenceEnd + 1).trim()} ...`;
  const wordEnd = bounded.lastIndexOf(" ");
  return `${bounded.slice(0, wordEnd > 80 ? wordEnd : maxLength).trim()} ...`;
}

function buildRecommendation(finding: EnrichmentFindingInput, docs: AzureSearchDoc[]): string {
  const policyText = docs.map((d) => d.content).filter((value): value is string => typeof value === "string" && value.trim().length > 0).join(" ");
  if (policyText) {
    const excerpt = completeSentenceExcerpt(policyText);
    return `Follow the retrieved policy guidance: ${excerpt}`;
  }
  return finding.recommendedFix
    ? completeSentenceExcerpt(finding.recommendedFix, 300)
    : "Follow organizational secure coding standards. Validate the finding, apply the least risky remediation, and require human review before merge.";
}

function docToCitation(doc: AzureSearchDoc): EnrichmentCitation {
  return {
    title:    String(doc.title    ?? "Security Policy"),
    source:   String(doc.source   ?? "azure-ai-search"),
    category: typeof doc.category === "string" ? doc.category : undefined,
    excerpt:  typeof doc.content  === "string" ? completeSentenceExcerpt(doc.content, 300) : undefined,
    score:    typeof doc["@search.score"] === "number" ? doc["@search.score"] : undefined,
  };
}

function deriveFindingEnrichment(finding: EnrichmentFindingInput, docs: AzureSearchDoc[]): FindingEnrichment {
  const citations = docs.map(docToCitation);
  const confidence: "high" | "medium" | "low" =
    docs.length >= 2 ? "high" : docs.length === 1 ? "medium" : "low";

  const recommendation = buildRecommendation(finding, docs);

  const rationale = citations.length
    ? `Grounded by ${citations.length} Azure AI Search policy document${citations.length !== 1 ? "s" : ""}: ${citations.map((c) => c.title).join(", ")}.`
    : "No matching policy documents found in Azure AI Search index.";

  return { findingId: finding.id, recommendation, rationale, citations, confidence };
}

export async function enrichFindingAzure(
  finding: EnrichmentFindingInput,
): Promise<{ enrichment: FindingEnrichment; fallbackUsed: false } | { fallbackUsed: true; reason: string }> {
  if (!azureIsConfigured()) {
    return { fallbackUsed: true, reason: "Azure AI Search environment variables not configured." };
  }

  const endpoint = process.env.AZURE_AI_SEARCH_ENDPOINT!.replace(/\/+$/, "");
  const index    = process.env.AZURE_AI_SEARCH_INDEX!;
  const apiKey   = process.env.AZURE_AI_SEARCH_API_KEY!;
  const url      = `${endpoint}/indexes/${encodeURIComponent(index)}/docs/search?api-version=${AZURE_API_VERSION}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({ search: buildSearchQuery(finding), top: AZURE_TOP_RESULTS }),
      signal: AbortSignal.timeout(AZURE_TIMEOUT_MS),
    });

    if (!res.ok) {
      return { fallbackUsed: true, reason: `Azure AI Search returned HTTP ${res.status}.` };
    }

    const payload = (await res.json()) as AzureSearchResponse;
    const docs = Array.isArray(payload.value) ? payload.value : [];
    return { enrichment: deriveFindingEnrichment(finding, docs), fallbackUsed: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { fallbackUsed: true, reason: `Azure AI Search request failed: ${msg}` };
  }
}

export { azureIsConfigured };
