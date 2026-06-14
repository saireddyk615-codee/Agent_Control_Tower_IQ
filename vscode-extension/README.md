# Agent Control Tower IQ VS Code Extension

Local-only realtime editor integration for Agent Watchtower. Findings appear in the Problems panel,
Output channel, status bar, and a local report webview.

Commands:

- `Agent Watchtower: Run Full Scan`
- `Agent Watchtower: Run Quick Scan`
- `Agent Watchtower: Start Realtime Watch`
- `Agent Watchtower: Stop Realtime Watch`
- `Agent Watchtower: Open Latest Report`
- `Agent Watchtower: Apply Safe Fixes`
- `Agent Watchtower: Install Pre-Commit Gate`
- `Agent Watchtower: Generate Agent Instructions`

The extension invokes the local Watchtower CLI with Node and a safe argument array. It scans the
currently opened workspace and does not upload files or execute project code.

The Agent Watchtower Activity Bar view summarizes status, risk, critical/high findings, fix plan,
artifacts, and report commands. File-level findings also expose safe-fix code actions where
applicable.
