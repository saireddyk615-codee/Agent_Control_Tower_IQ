# Live VS Code Extension Test

1. Open VS Code.
2. Open folder: `~/IdeaProjects/SecureGuard-LM IQ/vscode-extension`
3. Run:

   ```bash
   npm install
   npm run compile
   ```

4. Press F5.
5. A new Extension Development Host window opens.
6. In that new window, open: `~/IdeaProjects/RoVora1/stealth-resume-ace`
7. Press `Cmd+Shift+P`.
8. Search: `Agent Watchtower`
9. Run: `Agent Watchtower: Run Full Scan`

Results appear in:

- Problems panel
- Output panel: Agent Control Tower IQ
- Status bar
- Agent Watchtower Activity Bar panel
- Agent Watchtower webview report

## Realtime test

1. Run `Agent Watchtower: Start Realtime Watch`.
2. Add a harmless temporary line to `README.md` and save.
3. Confirm the Output channel shows the changed file and a quick scan reruns after 1200ms.
4. Remove the temporary line and save.
5. Run `Agent Watchtower: Stop Realtime Watch`.

The extension and Watchtower CLI perform local static analysis only and do not execute scanned
project code.
