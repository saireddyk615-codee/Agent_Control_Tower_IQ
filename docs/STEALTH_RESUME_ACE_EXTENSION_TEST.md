# Agent Watchtower Live Test: stealth-resume-ace

## Launch the extension

1. Open `/Users/shivareddy/IdeaProjects/SecureGuard-LM IQ/vscode-extension` in VS Code.
2. Run `npm install`.
3. Run `npm run compile`.
4. Press F5 to launch Extension Development Host.
5. In Extension Development Host, open `/Users/shivareddy/IdeaProjects/RoVora1/stealth-resume-ace`.
6. Open the Command Palette and run `Agent Watchtower: Run Full Scan`.

Confirm that:

- The `Agent Control Tower IQ` Output channel shows the scan and top findings.
- The status bar changes from Scanning to Blocked, Needs Review, or Safe.
- Findings with valid files appear in the Problems panel.
- The Agent Watchtower Activity Bar panel shows status, risk, findings, fixes, and artifacts.
- The report webview opens.

## Realtime watch

1. Run `Agent Watchtower: Start Realtime Watch`.
2. Modify and save a disposable supported source or configuration file.
3. Wait at least 1200ms.
4. Confirm the Output channel records the file change and a quick scan reruns.
5. Run `Agent Watchtower: Stop Realtime Watch`.

Do not add risky package scripts to the working branch. Use a disposable branch or synthetic test
repository for destructive-risk demonstrations.

## Safe fixes

Run `Agent Watchtower: Apply Safe Fixes`, confirm the modal, and verify these files:

- `AGENTS.md`
- `.agent-safety.yml`
- `.codex/watchtower-review.md`
- `.cursor/rules/watchtower-review.mdc`
- `.github/copilot-instructions.md`
- `.agent-control-tower/WATCHTOWER_FIX_PLAN.md`

Safe-fix mode does not modify application source, package scripts, workflows, or deployment files.
