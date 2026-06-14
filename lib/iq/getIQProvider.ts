import { FoundryIQProvider } from "@/lib/iq/FoundryIQProvider";
import type { IQProvider } from "@/lib/iq/IQProvider";
import { MockFoundryIQProvider } from "@/lib/iq/MockFoundryIQProvider";
import type { IQMode, IQProviderName } from "@/types/security";

export interface IQProviderStatus {
  provider: IQProvider;
  iqMode: IQMode;
  iqProvider: IQProviderName;
  realIqConfigured: boolean;
  realIqRequested: boolean;
  groundingSummary: string;
}

export function isFoundryIQConfigured(): boolean {
  return Boolean(
    process.env.AZURE_SEARCH_ENDPOINT &&
      process.env.AZURE_SEARCH_API_KEY &&
      process.env.AZURE_SEARCH_KNOWLEDGE_BASE_NAME,
  );
}

export function getIQProviderStatus(): IQProviderStatus {
  const realIqRequested = process.env.NEXT_PUBLIC_IQ_MODE === "real";
  const realIqConfigured = isFoundryIQConfigured();

  if (realIqRequested && realIqConfigured) {
    return {
      provider: new FoundryIQProvider(),
      iqMode: "real",
      iqProvider: "azure-ai-search-foundry-iq",
      realIqConfigured: true,
      realIqRequested: true,
      groundingSummary:
        "Grounded by Azure AI Search / Microsoft Foundry IQ knowledge base retrieval.",
    };
  }

  if (realIqRequested) {
    console.warn(
      "SecureGuard real IQ mode was requested, but Azure Search configuration is incomplete. Falling back to mock retrieval.",
    );
  }

  return {
    provider: new MockFoundryIQProvider(),
    iqMode: "mock",
    iqProvider: "mock-foundry-iq",
    realIqConfigured: false,
    realIqRequested,
    groundingSummary: realIqRequested
      ? "Real IQ mode was requested, but configuration was incomplete. Falling back to Foundry IQ-compatible mock retrieval."
      : "Grounded by Foundry IQ-compatible mock retrieval using synthetic security policy documents.",
  };
}

export function getIQMode(): IQMode {
  return getIQProviderStatus().iqMode;
}

export function getIQProvider(): IQProvider {
  return getIQProviderStatus().provider;
}
