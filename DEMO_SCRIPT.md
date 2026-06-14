# Demo Script — Agent Control Tower IQ

## Setup (30 seconds)

```bash
cd "path/to/SecureGuard-LM IQ"
npm install
npm run dev
# Open http://localhost:3000/watchtower
```

---

## Demo Flow (5–7 minutes)

### 1. Homepage

Navigate to `http://localhost:3000`. Show the clean SaaS homepage:
- "Scan project → Review risks → Download PDF → Apply safe fixes → Re-scan"
- Click **Open Watchtower**.

---

### 2. Watchtower — Load Demo Project

On the Watchtower page:
- Click **Load Demo Project** to fill in the demo repo path.
- Show the check options. Note the preset selector (Quick / Full).
- Click **Select All** to show all 8 checks, then switch back to **Quick Scan** preset.

---

### 3. Run a Quick Scan

- Click **Run Scan**.
- While scanning, show the loading state on the button.
- When complete, metrics appear instantly:
  - Decision (safe / needs_review / blocked)
  - Risk score (0–100)
  - Findings count, fixes count, safe fix count, manual review count
- Session status in the header updates automatically.

---

### 4. Review Findings

Scroll to the findings table:
- Show severity badges (Critical, High, Medium, Low).
- Use the filter buttons (Critical, High, Safe fixes, Manual review).
- Use the search bar to filter by file name or keyword.
- Show the "Recommended fix" column — every finding has an actionable recommendation.

---

### 5. Fix Plan Cards

Scroll to Fix Plan:
- Show safe auto-fix cards (green badge) — "Safe auto-fix. No manual review required."
- Show manual review cards (amber badge) — "Manual review required. Patch preview available."
- Show the `safePatchPreview` code snippet inside each card.

---

### 6. Apply Safe Fixes

- Click **Select All Safe Fixes** to pre-select all auto-fix items.
- Click **Fix Selected Safe Issues**.
- Show the fix outcome: "X safe fixes applied. Y skipped. Re-scan to verify."
- Emphasize: only pre-approved low-risk changes are applied. No code changes auto-applied.

---

### 7. Generate Patch for Review

- Click **Generate Patch for Review**.
- Show the patch preview section — collapsed by default.
- Expand it to show the diff format.
- Emphasize: this is read-only. No risky files were modified.

---

### 8. Download PDF Report

- Click **Download PDF Report**.
- A PDF is downloaded: `WATCHTOWER_SECURITY_REPORT.pdf`.
- Show the PDF: project name, decision, risk score, findings list, fix plan, policy citations.
- Also click **Download JSON** to show machine-readable export.

---

### 9. Re-scan

- Click **Re-scan**.
- Show that risk score has decreased after safe fixes were applied.
- Show "Last scan: ..." in the header updates.

---

### 10. Session Persistence

- Navigate to **Reports** → session is restored automatically (repo path + last result).
- Click **Load Latest Report** → loads from `.agent-control-tower/watchtower-latest.json`.
- Click **Back to Watchtower** → scan results still visible.
- Refresh the browser → results still visible (localStorage).
- Click **Clear Session** → only UI state clears. Project files untouched.

---

### 11. Compare (bonus)

- Navigate to **Compare**.
- The demo paths are pre-filled.
- Click **Compare Projects** → shows which risks are repeated baseline noise vs. project-specific.

---

### 12. IDE Extension (bonus)

- Navigate to **IDE Extension**.
- Show the VS Code extension section with install commands.
- Open VS Code, press **F5** to launch Extension Development Host.
- Run `Agent Watchtower: Run Quick Scan` from the Command Palette.
- Show findings in the **Problems panel** and **Watchtower** tree view.

---

## Key Talking Points

- **Local-first**: No source upload, no project code execution.
- **Safe-fix boundary**: Only pre-approved low-risk changes auto-apply. Risky changes always require human approval via patch preview.
- **Foundry IQ integration**: Click Enrich with Foundry IQ to call the Foundry IQ-compatible Azure AI Search grounding route when configured. Mock IQ mode is the local fallback/default demo with no credentials.
- **Session persistence**: Full portal state preserved across navigation and browser refresh.
- **One decision**: Every scan produces a single clear decision — safe, needs_review, or blocked — not just a list of alerts.

## Privacy and Local Execution Boundary

Agent Control Tower IQ scans project files locally. The scanner does not upload source code, execute the scanned application, or run project scripts. Foundry IQ enrichment is optional and only sends normalized finding metadata to Azure AI Search when Azure mode is configured. Mock IQ mode runs fully locally without Azure credentials.

## Live Microsoft IQ Verification

- Search service: `actiq-search-615`
- Index: `agent-security-policies`
- API route: `/api/foundry-iq/enrich`
- Verified result: `mode: azure`, `fallbackUsed: false`
- Verified citations: `secrets-policy.md`, `safe-fix-policy.md`, `agent-safety-policy.md`
- No API keys are shown in source, logs, UI, reports, or tests.
