# Architecture — Agent Control Tower IQ

## Overview

Agent Control Tower IQ is a local-first security scanner for AI-generated projects. It runs entirely on the developer's machine: no source code is uploaded, no external API calls are made by default, and no project code is executed.

The product has three entry points: a **web portal**, a **CLI**, and a **VS Code extension**. All three share the same scan engine in `lib/watchtower/`.

---

## Directory Structure

```
.
├── app/                          # Next.js App Router pages
│   ├── watchtower/page.tsx       # Main scan, fix, report UI
│   ├── reports/page.tsx          # Latest report viewer
│   ├── compare/page.tsx          # Multi-project comparison
│   ├── integrations/page.tsx     # VS Code + CLI docs
│   ├── submission/page.tsx       # Hackathon submission summary
│   └── api/watchtower/           # API routes (Node.js runtime)
│       ├── ui-scan/route.ts
│       ├── apply-fixes/route.ts
│       ├── generate-patch/route.ts
│       ├── pdf-report/route.ts
│       ├── latest-report/route.ts
│       └── compare/route.ts
│
├── components/
│   ├── layout/AppShell.tsx       # Sticky nav, session status bar
│   ├── providers/PortalSessionProvider.tsx  # Global localStorage session
│   └── ui/                       # Shared design system components
│
├── lib/
│   ├── watchtower/               # Core scan engine
│   │   ├── watchtowerEngine.ts   # Orchestrates all checks
│   │   ├── safeFixEngine.ts      # Safe auto-fix application
│   │   ├── patchPreview.ts       # Patch generation for manual review
│   │   ├── pathValidation.ts     # Repo path normalization + validation
│   │   ├── projectComparison.ts  # Multi-project risk comparison
│   │   └── watchtowerUserReport.ts  # User-facing report format
│   ├── iq/                       # Foundry IQ integration layer
│   │   ├── MockFoundryIQProvider.ts   # Default demo provider
│   │   ├── FoundryIQProvider.ts       # Real Azure AI Search
│   │   └── getIQProvider.ts           # Environment-based selection
│   ├── reports/
│   │   └── watchtowerPdfReport.ts     # PDFKit PDF evidence report
│   ├── portal/
│   │   └── portalSessionStore.ts      # localStorage session persistence
│   └── security/
│       └── validateRequest.ts         # API request validation
│
├── vscode-extension/             # VS Code extension
│   ├── src/
│   │   ├── extension.ts          # Activation, commands
│   │   ├── diagnostics.ts        # Problems panel integration
│   │   ├── treeView.ts           # Findings tree view
│   │   ├── statusBar.ts          # Status bar
│   │   └── watchtowerRunner.ts   # Calls local CLI
│   └── out/                      # Compiled JS (committed for demo)
│
├── cli/
│   └── watchtower.mjs            # CLI entry point
│
├── scripts/
│   ├── live-watchtower-test.mjs  # Integration test script
│   ├── ui-doctor.mjs             # Portal health check
│   └── session-doctor.mjs        # Session + build check
│
├── test/
│   ├── watchtower.test.mjs       # 28 unit tests
│   └── studio.test.mjs           # Studio tests
│
└── types/
    └── security.ts               # Shared TypeScript types
```

---

## Scan Engine

`watchtowerEngine.ts` orchestrates all checks in a single pass:

| Check | What it inspects |
|---|---|
| `repo_safety` | `.agent-safety.yml`, `AGENTS.md`, `CLAUDE.md`, `.gitignore` |
| `agent_mcp_config` | MCP config files, agent tool permissions |
| `git_diff_scope` | Staged changes for scope creep, risky file modifications |
| `secrets_sensitive_data` | `.env*`, API keys, tokens in tracked files |
| `package_workflow_risks` | `package.json` scripts, GitHub Actions workflows |
| `output_firewall` | Agent output files for sensitive data leakage |
| `generate_repo_safety_files` | Generates missing safety files as a safe fix |
| `code_security_review` | Code patterns: SQL injection, XSS, path traversal, etc. |

Each finding has: `id`, `title`, `severity` (critical/high/medium/low/info), `file`, `line`, `shortNote`, `recommendation`, `safeFixAvailable`, `humanApprovalRequired`.

---

## Fix Plan

The scan engine produces a `fixPlan` array. Each fix is classified as:

- **Safe auto-fix** (`humanApprovalRequired: false`) — generates safety files, removes tracked secrets, adds config entries. Applied only when the user clicks "Fix Selected Safe Issues".
- **Manual review** (`humanApprovalRequired: true`) — code changes, workflow edits, dependency removals. Never auto-applied. Available only as a patch preview.

This distinction is enforced at the engine level and the API level. The `/api/watchtower/apply-fixes` route only applies fixes with `humanApprovalRequired === false`.

---

## Session Persistence

`PortalSessionProvider` wraps the entire app and stores session state in `localStorage` under key `agent-control-tower:portal-session`. State is restored on hydration and updated on every user action.

Persisted across navigation and browser refresh:
- Repo path, selected checks, last scan result
- Selected fix IDs, fix outcomes
- PDF path, patch path and preview
- Last decision, risk score, findings count (shown in AppShell status bar)
- Reports and Compare page state

`clearSession()` resets only localStorage UI state — it does not modify any project files.

---

## Foundry IQ Integration

Agent Control Tower IQ integrates Microsoft IQ through a Foundry IQ-compatible knowledge grounding layer backed by Azure AI Search. The Watchtower scanner detects repo, code, secret, workflow, and agent-configuration risks locally, then the IQ layer retrieves trusted policy guidance and citations to enrich each finding. The scanner does not upload source code by default.

The normal scan routes do not call Azure. Azure AI Search is called only when the user clicks **Enrich with Foundry IQ**, which posts normalized finding metadata to `/api/foundry-iq/enrich`. That route uses `process.env.AZURE_AI_SEARCH_API_KEY` server-side and calls `POST ${AZURE_AI_SEARCH_ENDPOINT}/indexes/${AZURE_AI_SEARCH_INDEX}/docs/search?api-version=2025-09-01`.

If Azure configuration is missing or retrieval fails, the route falls back to mock policy knowledge and returns `mode: "mock"` with `fallbackUsed: true`.

---


## Privacy and Local Execution Boundary

Agent Control Tower IQ scans project files locally. The scanner does not upload source code, execute the scanned application, or run project scripts. Foundry IQ enrichment is optional and only sends normalized finding metadata to Azure AI Search when Azure mode is configured. Mock IQ mode runs fully locally without Azure credentials.

---

## API Security

All API routes use `validateRequest.ts`:
- `readJsonObject()` — validates request body is a JSON object
- `RequestValidationError` — returns 400 JSON errors (never HTML)
- `validationErrorResponse()` — catches all errors, returns structured JSON
- `validateWatchtowerRepoPath()` — normalizes path, checks directory exists, resolves symlinks
- All paths validated against root and home directory traversal
- No HTML/Next.js error overlays reach the client — all errors are JSON

---

## CI

`.github/workflows/ci.yml` runs on every push and PR:
- `npm ci`
- `npm run lint`
- `npm test` (28 unit tests)
- `npm run build`
