# Submission Checklist — Agent Control Tower IQ

## Core Functionality

- [x] Web portal running at `http://localhost:3000`
- [x] `/watchtower` page fully functional
- [x] Run Scan works with real local repo paths (including paths with spaces)
- [x] Load Demo Project button pre-fills demo path
- [x] Quick Scan and Full Scan presets work
- [x] Select All / Clear All check selection works
- [x] Findings table shows severity, file, short note, recommended fix, fix status
- [x] Filter by All / Critical / High / Safe fixes / Manual review
- [x] Search bar filters findings by file or keyword
- [x] Fix Plan cards show safe auto-fix and manual review badges
- [x] Select All Safe Fixes / Clear Fix Selection buttons work
- [x] Fix Selected Safe Issues applies only approved safe fixes
- [x] Generate Patch for Review produces patch preview (no risky files modified)
- [x] Download PDF Report generates and downloads PDF
- [x] Download JSON exports machine-readable report
- [x] Re-scan button works
- [x] Clear Session resets only UI state

## Session Persistence

- [x] Session preserved across Watchtower → Reports → Compare → IDE Extension navigation
- [x] Session survives browser refresh
- [x] Reports page auto-restores from Watchtower session
- [x] AppShell shows last scan status (decision, risk, project)
- [x] Clear Session resets localStorage only — no project files deleted

## API Routes

- [x] `/api/watchtower/ui-scan` — validates path, runs scan, returns JSON
- [x] `/api/watchtower/apply-fixes` — applies only safe fixes
- [x] `/api/watchtower/generate-patch` — generates patch preview
- [x] `/api/watchtower/pdf-report` — generates and streams PDF
- [x] `/api/watchtower/latest-report` — loads saved JSON report
- [x] `/api/watchtower/compare` — compares multiple projects
- [x] All routes return JSON errors (never HTML)
- [x] All routes handle paths with spaces and wrapping quotes
- [x] Path validation shared via `lib/watchtower/pathValidation.ts`

## Tests

- [x] `npm test` — 28/28 pass
- [x] `npm run lint` — clean
- [x] `npm run build` — passes on Mac (swc native binary not available in Linux sandbox)

## Reports

- [x] PDF report generated and downloadable
- [x] JSON report generated and downloadable
- [x] Markdown report written to `.agent-control-tower/WATCHTOWER_REPORT.md`
- [x] Fix plan written to `.agent-control-tower/WATCHTOWER_FIX_PLAN.md`
- [x] Patch preview written to `.agent-control-tower/watchtower-suggested-fixes.patch`

## VS Code Extension

- [x] `npm run extension:compile` — compiles successfully
- [x] `npm run extension:package` — generates `.vsix`
- [x] VSIX file present at `vscode-extension/agent-control-tower-iq-0.1.0.vsix`
- [x] Extension activates in Extension Development Host (F5)
- [x] Commands available in Command Palette
- [x] Findings appear in Problems panel
- [x] Watchtower tree view shows findings

## CI / GitHub

- [x] `.github/workflows/ci.yml` created
- [x] CI runs: npm ci, lint, test, build
- [x] README rewritten to match final product
- [x] `ARCHITECTURE.md` created
- [x] `DEMO_SCRIPT.md` created
- [x] `SUBMISSION_CHECKLIST.md` created (this file)
- [x] `CLAUDE_FINAL_READY_REPORT.md` created

## Safety Constraints

- [x] Scanner does NOT execute scanned project code
- [x] Scanner does NOT run scanned project npm scripts
- [x] Scanner does NOT auto-edit source code, package scripts, workflows, or Docker files
- [x] Safe fixes only apply pre-approved low-risk security file changes
- [x] Risky fixes always produce patch preview only — never auto-applied
- [x] No Azure credentials required for default demo
- [x] No source code uploaded

## Foundry IQ Disclosure

- [x] Mock Foundry IQ provider is the fallback/default local demo (no credentials needed)
- [x] Real Foundry IQ-compatible Azure AI Search retrieval available when `AZURE_AI_SEARCH_*` is configured
- [x] Azure AI Search route returns `mode: azure` and `fallbackUsed: false` when configured
- [x] Enrichment sends normalized finding metadata only, never full source files
- [x] Disclosure present in README, submission page, and AppShell badge

## Privacy and Local Execution Boundary

Agent Control Tower IQ scans project files locally. The scanner does not upload source code, execute the scanned application, or run project scripts. Foundry IQ enrichment is optional and only sends normalized finding metadata to Azure AI Search when Azure mode is configured. Mock IQ mode runs fully locally without Azure credentials.

## Live Microsoft IQ Verification

- Search service: `actiq-search-615`
- Index: `agent-security-policies`
- API route: `/api/foundry-iq/enrich`
- Verified result: `mode: azure`, `fallbackUsed: false`
- Verified citations: `secrets-policy.md`, `safe-fix-policy.md`, `agent-safety-policy.md`
- No API keys are shown in source, logs, UI, reports, or tests.
