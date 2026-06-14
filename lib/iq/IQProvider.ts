import type { PolicyCitation } from "@/types/security";

export interface IQProvider {
  retrievePolicyEvidence(query: string, issueType?: string): Promise<PolicyCitation[]>;
}
