# Portal-Wide Session Persistence Report

## 1. Issue

Portal state disappeared when switching pages or refreshing because Watchtower, Reports, Compare, and Integrations kept their data only in page-local React state.

## 2. Scope Fixed

- Watchtower repo path, selected checks, findings, fix plan, selected fixes, scan timestamp, artifact paths, patch preview, apply-fix result, and errors
- Reports active repo, latest loaded report, PDF path, load timestamp, and errors
- Compare repo paths, latest comparison, comparison timestamp, and errors
- Integrations selected section, copied command, extension path, and VSIX path
- Submission remains intentionally static because it has no interactive state
- AppShell session status and global Clear Session action

## 3. Implementation

- Added a versioned `PortalSessionProvider` and client-safe localStorage store using `agent-control-tower:portal-session`.
- Added corruption handling, server-render guards, and a 1.5 MB storage limit with compact fallback behavior.
- Added shared active repo path and Watchtower decision/risk/finding summaries.
- Added `/api/watchtower/latest-report`, which validates the repo path and normalizes `.agent-control-tower/watchtower-latest.json`.
- Preserved Next.js `Link` navigation and the focused five-item visible product navigation.
- Added interrupted-scan state. Returning after navigation shows that the prior scan was interrupted and requires a rerun.
- Added page-level and global Clear Session actions. They clear browser UI state only and never delete project reports or files.

## 4. User Behavior Now

- Watchtower scan results survive navigation to Reports, Compare, Integrations, Submission, and back.
- Reports immediately displays the same result from the Watchtower browser session and can reload the disk source of truth.
- Browser refresh restores the active repo, selected checks, findings, fix plan, selected fixes, artifacts, and last action state.
- Compare and Integrations restore their latest interactive state.
- Selected safe-fix IDs use the same persisted selection collection as all selected finding IDs.
- Clear Session resets the portal UI and leaves `.agent-control-tower` files untouched.

## 5. Tests

| Command | Result |
| --- | --- |
| `npm test` | PASS, 28 tests |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm run test:e2e` | PASS, 10 tests |
| `npm run live:test` | PASS |
| `npm run ui:doctor` | PASS, all checked routes returned 200 |
| `npm run session:doctor` | PASS, API/report/build verified |

The production build continues to print the existing Turbopack dynamic filesystem tracing warning from the Watchtower engine. It does not fail compilation or TypeScript validation.

## 6. Persistence Browser Coverage

The new serial Playwright suite verifies:

1. Watchtower scan to Reports and back
2. Refresh restoration and visible last-scan timestamp
3. Selected fix persistence across navigation
4. Compare result and Integrations section persistence
5. Scoped internal navigation and Clear Session behavior
