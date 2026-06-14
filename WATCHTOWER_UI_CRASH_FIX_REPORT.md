# Watchtower UI Crash Fix Report

## 1. Root cause

The previous path validator passed pasted input directly to `path.resolve`. A valid path wrapped in quotes, such as `"/Users/shivareddy/IdeaProjects/Workout App"`, was resolved with the quotes included and rejected as a missing directory.

The API returned a JSON 400 response, but the Watchtower client converted handled non-200 responses into thrown exceptions and logged them with `console.error`. In Next.js development mode, that behavior could surface the error overlay instead of leaving the user on the page with a friendly error banner.

## 2. Fixes

- Added shared `normalizeRepoPath` and `validateRepoDirectory` helpers.
- Trims whitespace, removes matching wrapping quotes, expands `~`, preserves spaces, and safely rejects root/home/missing/file paths.
- Reused the shared validation through the CLI and Watchtower API routes.
- Changed Watchtower client requests to handle non-200 JSON responses without throwing.
- Invalid paths now render in the visible `ErrorBanner`.
- Load Demo Project now sets `/Users/shivareddy/IdeaProjects/Workout App`.
- Fix plans remain visible with recommendations, patch previews, and safe/manual status.
- Safe-fix selection is derived from fix plan items where `humanApprovalRequired === false`.
- Apply-fix, patch, PDF, and re-scan actions normalize the path before calling the API.
- Patch and PDF failures display friendly UI messages.

## 3. API verification

Valid quoted Workout App path:

- Request path: ` "/Users/shivareddy/IdeaProjects/Workout App" `
- Result: JSON scan response
- Decision: `blocked`
- Risk score: `75`
- Findings: `7`
- Response includes `findings`, `fixPlan`, `artifacts`, `summary`, and `reportPaths`.
- No HTML error page or stack trace.

Invalid path:

- Request path: `/bad/path`
- Status: `400`
- JSON response: `{"error":"Directory does not exist: /bad/path"}`
- No HTML error page or stack trace.

## 4. UI verification

- `/watchtower` loads at `http://localhost:3000/watchtower`.
- Load Demo Project sets the exact Workout App path.
- Paths with spaces and accidental wrapping quotes scan successfully.
- Invalid paths show a friendly visible error banner.
- No unhandled runtime error overlay appears.
- Real findings and the full fix plan are visible after scan.
- Safe fixes can be selected when the fix plan contains safe guardrail fixes.
- Apply Fixes writes only allowlisted guardrail files and reports applied/skipped items.
- Generate Patch for Review creates and displays `.agent-control-tower/watchtower-suggested-fixes.patch`.
- Download PDF creates and displays `.agent-control-tower/WATCHTOWER_SECURITY_REPORT.pdf`.
- Re-scan works with the normalized path.

## 5. Tests

| Command | Result |
| --- | --- |
| `npm test` | PASS, 28 tests |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm run test:e2e` | PASS, 5 tests |
| `npm run live:test` | PASS WITH MINOR ISSUES because real scanned projects retain manual-review findings |
| `npm run ui:doctor` | PASS, all required routes returned 200 |
