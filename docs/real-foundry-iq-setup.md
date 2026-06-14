# Optional Real Azure AI Search / Microsoft Foundry IQ Setup

Real policy retrieval is optional. SecureGuard-LM IQ runs fully in default mock mode without Azure
credentials, using the local synthetic policy documents.

## Enable Real Mode

1. Create an Azure AI Search resource.
2. Create or import a knowledge base using the synthetic policy documents in `data/policies`.
3. Copy `.env.example` to `.env.local` and configure:

   ```env
   NEXT_PUBLIC_IQ_MODE=real
   AZURE_SEARCH_ENDPOINT=https://<search-service>.search.windows.net
   AZURE_SEARCH_API_KEY=<server-side-api-key>
   AZURE_SEARCH_KNOWLEDGE_BASE_NAME=<knowledge-base-name>
   AZURE_SEARCH_API_VERSION=2025-11-01-preview
   ```

4. Restart the Next.js app.
5. Run a scan and confirm the Microsoft IQ status card shows **Real Microsoft IQ Retrieval**.

The Azure Search API key is read only by the server-side provider. Do not prefix it with
`NEXT_PUBLIC_`, expose it to browser code, or commit it.

## Fallback Behavior

If `NEXT_PUBLIC_IQ_MODE=real` is set but required Azure Search variables are missing, the app safely
falls back to `MockFoundryIQProvider`. The scan response and UI identify this as **Real Mode
Fallback**.

Azure AI Search and Microsoft Foundry IQ preview API response shapes may vary by API version. The
request and defensive response mapping are isolated in `lib/iq/FoundryIQProvider.ts`; adjust that
adapter if the configured preview version returns a different shape.
