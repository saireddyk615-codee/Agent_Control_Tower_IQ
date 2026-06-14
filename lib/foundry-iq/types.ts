export interface EnrichmentFindingInput {
  id: string;
  title: string;
  severity: string;
  category: string;
  file?: string;
  evidence?: string;
  recommendedFix?: string;
}

export interface EnrichmentCitation {
  title: string;
  source: string;
  category?: string;
  excerpt?: string;
  score?: number;
}

export interface FindingEnrichment {
  findingId: string;
  recommendation: string;
  rationale: string;
  citations: EnrichmentCitation[];
  confidence: "high" | "medium" | "low";
}

export interface EnrichResponse {
  ok: boolean;
  mode: "azure" | "mock";
  fallbackUsed: boolean;
  fallbackReason?: string;
  enrichments: FindingEnrichment[];
}
