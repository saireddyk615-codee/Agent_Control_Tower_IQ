# Agent Control Tower IQ VS Code Extension

## Run locally

1. Open `vscode-extension` in VS Code.
2. Run `npm install`.
3. Run `npm run compile`.
4. Press F5 to launch Extension Development Host.
5. Open any project folder.
6. Run command: `Agent Watchtower: Run Full Scan`.

The extension locates the local Agent Watchtower CLI, scans the open workspace with static analysis,
and does not upload files or execute project code.

## Watch mode

Run `Agent Watchtower: Start Realtime Watch`.

The extension watches supported source files, package configuration, environment files, GitHub
workflows, MCP configuration, and agent instruction files. It waits 1200ms after changes and runs a
quick scan. Use `Agent Watchtower: Stop Realtime Watch` to stop.

## Problems panel

Findings with valid workspace file paths appear in the VS Code Problems panel. Critical and high
findings are errors, medium findings are warnings, and low findings are informational.

## Reports

Run `Agent Watchtower: Open Latest Report` to view the decision, risk score, checks, findings, fix
plan, generated artifacts, CLI command, and timestamp in a local webview.

## Other commands

- `Agent Watchtower: Run Quick Scan`
- `Agent Watchtower: Install Pre-Commit Gate`
- `Agent Watchtower: Generate Agent Instructions`

Instruction generation asks for confirmation before writing repository files.
