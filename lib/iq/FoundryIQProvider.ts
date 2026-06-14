import type { IQProvider } from "@/lib/iq/IQProvider";
import type { PolicyCitation } from "@/types/security";

const DEFAULT_API_VERSION = "2025-11-01-preview";
const MAX_EXCERPT_LENGTH = 1_200;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const firstString = (record: UnknownRecord, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const boundedExcerpt = (text: string) =>
  text.length > MAX_EXCERPT_LENGTH ? `${text.slice(0, MAX_EXCERPT_LENGTH)}...` : text;

function fallbackCitation(issueType: string, excerpt: string): PolicyCitation {
  return {
    policyId: "AZURE-IQ-UNPARSED",
    policyName: "Azure AI Search / Microsoft Foundry IQ",
    policyTitle: "Real retrieval response",
    section: "Retrieved evidence",
    title: "No parseable policy citation returned",
    excerpt: boundedExcerpt(excerpt),
    sourcePath: "azure-ai-search://knowledge-base",
    issueType,
    provider: "azure-ai-search-foundry-iq",
  };
}

function citationFromRecord(
  record: UnknownRecord,
  issueType: string,
  index: number,
): PolicyCitation | null {
  const excerpt = firstString(record, [
    "excerpt",
    "content",
    "text",
    "chunk",
    "answer",
    "description",
  ]);
  if (!excerpt) {
    return null;
  }

  const policyName =
    firstString(record, ["policyName", "documentTitle", "sourceName", "name"]) ??
    "Azure AI Search Policy Evidence";
  const section = firstString(record, ["section", "heading", "sectionName"]) ?? "Retrieved section";
  const title = firstString(record, ["title", "caption", "documentTitle"]) ?? issueType;
  const sourcePath =
    firstString(record, ["sourcePath", "source", "url", "uri", "path"]) ??
    "azure-ai-search://knowledge-base";

  return {
    policyId: firstString(record, ["policyId", "id", "key", "referenceId"]) ?? `AZURE-IQ-${index + 1}`,
    policyName,
    policyTitle: `${policyName} - ${title}`,
    section,
    title,
    excerpt: boundedExcerpt(excerpt),
    sourcePath,
    issueType,
    provider: "azure-ai-search-foundry-iq",
  };
}

function parseAzureSearchResponse(payload: unknown, issueType: string): PolicyCitation[] {
  if (!isRecord(payload)) {
    return [];
  }

  const candidates: unknown[] = [];
  if (Array.isArray(payload.references)) {
    candidates.push(...payload.references);
  }
  if (Array.isArray(payload.value)) {
    candidates.push(...payload.value);
  } else if (isRecord(payload.value)) {
    candidates.push(payload.value);
  }
  if (typeof payload.answer === "string") {
    candidates.push({ answer: payload.answer, title: "Knowledge base answer" });
  } else if (isRecord(payload.answer)) {
    candidates.push(payload.answer);
  }

  return candidates.flatMap((candidate, index) => {
    if (typeof candidate === "string") {
      return [fallbackCitation(issueType, candidate)];
    }
    if (!isRecord(candidate)) {
      return [];
    }
    const citation = citationFromRecord(candidate, issueType, index);
    return citation ? [citation] : [];
  });
}

export class FoundryIQProvider implements IQProvider {
  private readonly endpoint = process.env.AZURE_SEARCH_ENDPOINT?.replace(/\/+$/, "");
  private readonly apiKey = process.env.AZURE_SEARCH_API_KEY;
  private readonly knowledgeBaseName = process.env.AZURE_SEARCH_KNOWLEDGE_BASE_NAME;
  private readonly apiVersion = process.env.AZURE_SEARCH_API_VERSION || DEFAULT_API_VERSION;

  async retrievePolicyEvidence(query: string, issueType = "Security issue"): Promise<PolicyCitation[]> {
    if (!this.endpoint || !this.apiKey || !this.knowledgeBaseName) {
      return [];
    }

    try {
      const url = `${this.endpoint}/knowledgebases/${encodeURIComponent(this.knowledgeBaseName)}/retrieve?api-version=${encodeURIComponent(this.apiVersion)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.apiKey,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Retrieve secure coding policy evidence for: ${query}`,
            },
          ],
          targetReferences: true,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        return [
          fallbackCitation(
            issueType,
            `Real retrieval returned HTTP ${response.status} without parseable policy evidence.`,
          ),
        ];
      }

      const payload: unknown = await response.json();
      const citations = parseAzureSearchResponse(payload, issueType);
      return citations.length > 0
        ? citations
        : [fallbackCitation(issueType, "Real retrieval returned no parseable policy citation.")];
    } catch {
      return [
        fallbackCitation(
          issueType,
          "Real retrieval could not be completed. Verify the server-side Azure Search configuration and preview API shape.",
        ),
      ];
    }
  }
}
