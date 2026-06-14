import policies from "@/data/policies/secure-coding.json";
import type { SecurityPolicy } from "@/types/security";

export async function retrievePolicies(query: string): Promise<SecurityPolicy[]> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  return (policies as SecurityPolicy[]).filter((policy) => {
    const searchable = `${policy.title} ${policy.summary} ${policy.recommendation}`.toLowerCase();
    return terms.some((term) => searchable.includes(term));
  });
}
