# Agent Control Tower IQ
### Foundry IQ Watchtower for AI-Generated Projects

**One-line pitch:** A Foundry IQ-ready Watchtower for AI-generated projects that scans repo risks, agent configs, diffs, secrets, outputs, and code security issues, then gives developers one final decision, recommended fixes, safe-fix approval, patch previews, and PDF reports.

---

## Problem

AI-assisted coding accelerates delivery, but insecure or misconfigured AI-generated projects can reach production faster than teams can review them. Developers need a structured final-review layer that is explainable, policy-grounded, and safe for human approval — not just another alert scanner.

## Solution

Agent Control Tower IQ provides a **local-first Watchtower** that performs one consolidated scan across all major risk surfaces of any project, produces a single decision and risk score, and gives developers a clear fix plan with safe auto-fix approval and patch previews for manual-review changes.

Agent Control Tower IQ integrates Microsoft IQ through a Foundry IQ-compatible knowledge grounding layer backed by Azure AI Search. The Watchtower scanner detects repo, code, secret, workflow, and agent-configuration risks locally, then the IQ layer retrieves trusted policy guidance and citations to enrich each finding. The scanner does not upload source code by default.

**No source code is uploaded. No project code is executed. No Azure credentials are required for the demo.**

---

## Final User Workflow

```
1. Open /watchtower in the web portal
2. Enter your project repo path (or click Load Demo Project)
3. Select checks (Quick Scan, Full Scan, or individual checks)
4. Click Run Scan
5. Review the decision, risk score, findings, and recommended fixes
6. Select safe fixes → click Fix Selected Safe Issues
7. Generate Patch for Review (manual-review changes — no auto-apply)
8. Download PDF Report (evidence pack)
9. Re-scan to verify fixes reduced risk
10. Navigate to Reports, Compare, IDE Extension with session preserved
```

---

## Architecture

```
web portal (Next.js)
├── /watchtower         — scan, review, fix, PDF export
├── /reports            — load latest report, re-export PDF
├── /compare            — multi-project risk comparison
├── /integrations       — VS Code extension + CLI docs
└── /submission         — project summary + demo script

API routes (Next.js app router, Node.js runtime)
├── /api/watchtower/ui-scan          — run full scan
├── /api/watchtower/apply-fixes      — apply selected safe fixes
├── /api/watchtower/generate-patch   — patch preview for manual review
├── /api/watchtower/pdf-report       — generate + stream PDF
├── /api/watchtower/latest-report    — load saved JSON report
├── /api/watchtower/compare          — compare multiple projects
└── /api/foundry-iq/enrich          — Foundry IQ policy enrichment (Azure or mock)

scan engine (lib/watchtower/)
├── watchtowerEngine.ts      — orchestrates all checks
├── safeFixEngine.ts         — applies approved safe fixes only
├── patchPreview.ts          — generates patch for manual review
├── pathValidation.ts        — normalize + validate repo paths
├── projectComparison.ts     — multi-project risk comparison
└── watchtowerUserReport.ts  — user-facing report format

Foundry IQ enrichment layer (lib/foundry-iq/)
├── types.ts         — shared enrichment types
├── client.ts        — Azure AI Search REST client (api-version 2025-09-01)
├── mockKnowledge.ts — keyword-based local policy fallback
└── enrichFinding.ts — tries Azure, falls back to mock if unconfigured

Legacy IQ layer (lib/iq/)
├── MockFoundryIQProvider.ts — original mock provider
├── FoundryIQProvider.ts     — legacy Azure provider
└── getIQProvider.ts         — environment-based provider selection

reports (lib/reports/)
└── watchtowerPdfReport.ts   — PDFKit-based evidence report

VS Code extension (vscode-extension/)
├── extension.ts     — activation, commands, Problems panel
├── diagnostics.ts   — inline findings as VS Code diagnostics
├── treeView.ts      — findings tree view
└── statusBar.ts     — scan status bar item

CLI (cli/)
└── watchtower.mjs   — scan, watch, apply-fixes from terminal
```

---

## Screenshots

> _Run `npm run dev` and open `http://localhost:3000/watchtower` to see the live portal._

---

## Setup

```bash
# Install dependencies
npm install

# Start web portal
npm run dev

# Open in browser
open http://localhost:3000/watchtower
```

## Foundry IQ Integration

Agent Control Tower IQ integrates Microsoft IQ through a **Foundry IQ-compatible knowledge grounding layer backed by Azure AI Search**.

The Watchtower scanner runs locally and detects repo, code, secret, workflow, and agent-configuration risks. When the user clicks **Enrich with Foundry IQ**, the app sends only normalized finding metadata to the IQ layer, including finding title, severity, category, file path, short evidence snippet, and recommended fix. It does **not** upload full source code by default.

The project supports two modes:

* **Mock IQ Mode** — default local fallback with no Azure credentials required.
* **Azure IQ Mode** — connects to Azure AI Search for policy-backed recommendations and citations.

Live Microsoft IQ verification:

* Search service: `actiq-search-615`
* Index: `agent-security-policies`
* API route: `/api/foundry-iq/enrich`
* Verified result: `mode: "azure"`, `fallbackUsed: false`
* Citations returned: `secrets-policy.md`, `safe-fix-policy.md`, `agent-safety-policy.md`

To enable Azure IQ Mode, copy `.env.example` to `.env.local` and set:

```bash
FOUNDRY_IQ_MODE=azure
AZURE_AI_SEARCH_ENDPOINT=https://<your-resource>.search.windows.net
AZURE_AI_SEARCH_INDEX=agent-security-policies
AZURE_AI_SEARCH_API_KEY=<query-key>
AZURE_AI_SEARCH_KNOWLEDGE_BASE=agent-control-tower-security-kb
```

Do not commit `.env.local` or API keys.


---


## Privacy and Local Execution Boundary

Agent Control Tower IQ scans project files locally. The scanner does not upload source code, execute the scanned application, or run project scripts. Foundry IQ enrichment is optional and only sends normalized finding metadata to Azure AI Search when Azure mode is configured. Mock IQ mode runs fully locally without Azure credentials.

---

## CLI Usage

```bash
# Quick scan (repo safety + secrets + git diff)
npm run watchtower -- scan --repo /path/to/project

# Full scan (all checks)
npm run watchtower -- scan --repo /path/to/project --checks full

# Realtime watch mode
npm run watchtower -- watch --repo /path/to/project

# Apply approved safe fixes
npm run watchtower -- apply-fixes --repo /path/to/project

# Live integration test
npm run live:test
```

---

## Web Portal Usage

1. `npm run dev` → open `http://localhost:3000`
2. Navigate to **Watchtower**
3. Enter repo path or click **Load Demo Project**
4. Select preset (Quick / Full) or individual checks
5. Click **Run Scan**
6. Review findings and fix plan
7. Select safe fixes → **Fix Selected Safe Issues**
8. **Generate Patch for Review** for manual-review items
9. **Download PDF Report**
10. **Re-scan** to confirm

Session is preserved across Watchtower → Reports → Compare → IDE Extension navigation and browser refresh. Click **Clear Session** to reset UI state only.

---

## VS Code Extension Usage

### Option A — Extension Development Host (F5)

```bash
cd vscode-extension
npm install
npm run compile
# Press F5 in VS Code to open Extension Development Host
```

### Option B — Install from VSIX

```bash
cd vscode-extension
npm run package          # generates .vsix
# In VS Code: Extensions → Install from VSIX → select the generated file
```

### Commands

| Command | Description |
|---|---|
| `Agent Watchtower: Run Quick Scan` | Runs repo safety + secrets + diff checks |
| `Agent Watchtower: Run Full Scan` | Runs all checks |
| `Agent Watchtower: Start Realtime Watch` | Watches for file changes |
| `Agent Watchtower: Stop Realtime Watch` | Stops watch mode |
| `Agent Watchtower: Apply Safe Fixes` | Applies approved safe fixes |
| `Agent Watchtower: Open Latest Report` | Opens PDF/JSON in editor |

Findings appear in the **Problems panel** and **Watchtower** tree view. Status bar shows scan state.

---

## Report Outputs

After a scan, reports are written to `.agent-control-tower/` inside the project:

| File | Description |
|---|---|
| `watchtower-latest.json` | Full scan result (machine-readable) |
| `WATCHTOWER_REPORT.md` | Human-readable Markdown report |
| `WATCHTOWER_SECURITY_REPORT.pdf` | PDF evidence pack |
| `WATCHTOWER_FIX_PLAN.md` | Recommended fix plan |
| `watchtower-suggested-fixes.patch` | Patch preview for manual review |

---

## Tests

```bash
npm test          # 28 unit tests — all pass
npm run lint      # ESLint — clean
npm run build     # Next.js production build
npm run live:test # Live integration test (requires target projects)
npm run ui:doctor # Portal health check (requires npm run dev)
```

---

## Foundry IQ Disclosure

This MVP includes a Foundry IQ integration layer with mock fallback. The default demo runs without Azure credentials, while the architecture supports real Foundry IQ / Azure AI Search retrieval when configured via `.env.local`. The scanner does not upload source code by default. All policy evidence in the demo is synthetic and local.

---

## Limitations

- Static local analysis only — no source upload, no runtime execution of scanned projects.
- Safe auto-fixes are limited to security file generation and low-risk configuration changes.
- Risky code changes always require human review via patch preview — never auto-applied.
- Foundry IQ retrieval uses mock policy documents in the default demo.
- The VS Code VSIX path may differ depending on npm package version.
- Human judgment remains the final gate before any production change.

---

## License

MIT — see [LICENSE](LICENSE)
