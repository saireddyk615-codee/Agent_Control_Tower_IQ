import * as vscode from "vscode";
import { updateDiagnostics } from "./diagnostics";
import { WatchtowerCodeActionProvider } from "./codeActions";
import { openReportWebview } from "./reportWebview";
import { createWatchtowerStatusBar } from "./statusBar";
import { WatchtowerTreeProvider } from "./treeView";
import { runWatchtowerCommand, runWatchtowerScan, type WatchtowerCliResult } from "./watchtowerRunner";

const instructionContent = `# Agent Watchtower Instructions

Before editing this repo:
1. Read \`.agent-safety.yml\`.
2. Do not read \`.env\`, private keys, tokens, or credential files.
3. Only modify files relevant to the approved task.
4. Do not modify package scripts, GitHub workflows, deployment config, or MCP config without explicit approval.
5. After changes, run:
   npm run watchtower -- scan --repo . --checks quick
6. If code changed, run:
   npm run watchtower -- scan --repo . --checks code_security_review,git_diff_scope,secrets_sensitive_data
7. Do not finalize if Watchtower returns BLOCKED.
8. Fix or explain every high/critical finding.
`;

const ignoredPath = /(^|[/\\])(?:node_modules|\.git|\.next|dist|build)([/\\]|$)|\.(?:png|jpe?g|gif|webp|svg|mp4|mov|zip|pdf)$/i;
const watchedPath = /(?:\.(?:ts|tsx|js|jsx|py|java|cs|go|php|rs|cpp|c)|[/\\]package\.json|[/\\]\.env(?:\.example)?|[/\\]\.github[/\\]workflows[/\\][^/\\]+|[/\\](?:\.mcp|mcp)\.json|[/\\](?:AGENTS|CLAUDE)\.md)$/i;

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Agent Control Tower IQ");
  const diagnostics = vscode.languages.createDiagnosticCollection("agent-watchtower");
  const status = createWatchtowerStatusBar();
  const tree = new WatchtowerTreeProvider();
  let latestResult: WatchtowerCliResult | undefined;
  let scanning = false;
  let queued = false;
  let watchEnabled = false;
  let debounce: NodeJS.Timeout | undefined;
  context.subscriptions.push(output, diagnostics, status.item, vscode.window.registerTreeDataProvider("agentWatchtower.results", tree), vscode.languages.registerCodeActionsProvider({ scheme: "file" }, new WatchtowerCodeActionProvider(), { providedCodeActionKinds: WatchtowerCodeActionProvider.kinds }));

  const workspacePath = () => {
    const path = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!path) void vscode.window.showWarningMessage("Open a workspace folder before running Agent Watchtower.");
    return path;
  };

  const scan = async (checks: "quick" | "full" | string, openReport = false, applySafeFixes = false): Promise<void> => {
    const path = workspacePath();
    if (!path) return;
    if (scanning) { queued = true; return; }
    scanning = true;
    status.scanning();
    output.show(true);
    try {
      latestResult = await runWatchtowerScan({ workspacePath: path, extensionPath: context.extensionPath, checks, applySafeFixes, output });
      updateDiagnostics(diagnostics, path, latestResult.findings);
      status.result(latestResult);
      tree.update(latestResult);
      output.appendLine(`Final decision: ${latestResult.decision}; risk score ${latestResult.riskScore}/100`);
      for (const finding of latestResult.findings.slice(0, 3)) output.appendLine(`- ${finding.severity.toUpperCase()} ${finding.file ?? "repository"}: ${finding.title}`);
      if (latestResult.decision === "blocked") void vscode.window.showErrorMessage("Agent Watchtower blocked this project state. Open the report for required fixes.");
      if (openReport) showReport();
    } catch (error) {
      status.idle();
      const message = error instanceof Error ? error.message : "Agent Watchtower scan failed.";
      output.appendLine(`Scan failed: ${message}`);
      void vscode.window.showErrorMessage(message);
    } finally {
      scanning = false;
      if (queued) { queued = false; await scan("quick"); }
    }
  };

  const scheduleQuickScan = (uri: vscode.Uri) => {
    if (!watchEnabled || ignoredPath.test(uri.fsPath) || !watchedPath.test(uri.fsPath)) return;
    output.appendLine(`File changed: ${vscode.workspace.asRelativePath(uri)}`);
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void scan("quick"), 1200);
  };
  const showReport = () => {
    if (!latestResult) return void vscode.window.showInformationMessage("Run an Agent Watchtower scan before opening the report.");
    openReportWebview(latestResult, (command) => {
      const mapping: Record<string, string> = { full: "agentWatchtower.runFullScan", fix: "agentWatchtower.applySafeFixes", instructions: "agentWatchtower.generateInstructions", folder: "agentWatchtower.openReportFolder" };
      if (mapping[command]) void vscode.commands.executeCommand(mapping[command]);
    });
  };

  const watcher = vscode.workspace.createFileSystemWatcher("**/*");
  watcher.onDidChange(scheduleQuickScan, null, context.subscriptions);
  watcher.onDidCreate(scheduleQuickScan, null, context.subscriptions);
  watcher.onDidDelete(scheduleQuickScan, null, context.subscriptions);
  context.subscriptions.push(watcher);

  context.subscriptions.push(
    vscode.commands.registerCommand("agentWatchtower.runFullScan", () => scan("full", true)),
    vscode.commands.registerCommand("agentWatchtower.runQuickScan", () => scan("quick")),
    vscode.commands.registerCommand("agentWatchtower.startWatch", () => {
      watchEnabled = true;
      output.show(true);
      output.appendLine("Realtime Watch started. Quick scans run 1200ms after relevant file changes.");
      void scan("quick");
    }),
    vscode.commands.registerCommand("agentWatchtower.stopWatch", () => {
      watchEnabled = false;
      if (debounce) clearTimeout(debounce);
      output.appendLine("Realtime Watch stopped.");
      void vscode.window.showInformationMessage("Agent Watchtower realtime watch stopped.");
    }),
    vscode.commands.registerCommand("agentWatchtower.openReport", showReport),
    vscode.commands.registerCommand("agentWatchtower.openReportFolder", () => {
      const path = workspacePath();
      if (path) void vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(`${path}/.agent-control-tower/WATCHTOWER_REPORT.md`));
    }),
    vscode.commands.registerCommand("agentWatchtower.applySafeFixes", async () => {
      const approval = await vscode.window.showWarningMessage("Apply only deterministic Agent Watchtower safety and instruction fixes?", { modal: true }, "Apply Safe Fixes");
      if (approval === "Apply Safe Fixes") await scan("full", false, true);
    }),
    vscode.commands.registerCommand("agentWatchtower.installHook", async () => {
      const path = workspacePath();
      if (!path) return;
      try { void vscode.window.showInformationMessage(await runWatchtowerCommand(path, context.extensionPath, "install-hook")); }
      catch (error) { void vscode.window.showErrorMessage(error instanceof Error ? error.message : "Could not install the pre-commit gate."); }
    }),
    vscode.commands.registerCommand("agentWatchtower.generateInstructions", async () => {
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) return void vscode.window.showWarningMessage("Open a workspace folder before generating instructions.");
      const approval = await vscode.window.showWarningMessage("Generate or update Agent Watchtower instruction files in this workspace?", { modal: true }, "Generate Files");
      if (approval !== "Generate Files") return;
      const files: Array<[string, string]> = [
        ["AGENTS.md", instructionContent],
        [".codex/watchtower-review.md", instructionContent],
        [".cursor/rules/watchtower-review.mdc", instructionContent],
        [".github/copilot-instructions.md", instructionContent],
        [".agent-safety.yml", "version: 1\ndefault_mode: deny\nblocked_tools:\n  - shell\n  - deploy\napproval_required_tools:\n  - package-scripts\n  - github-workflows\n  - mcp-config\n"],
      ];
      for (const [path, content] of files) {
        const uri = vscode.Uri.joinPath(folder.uri, ...path.split("/"));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(uri, ".."));
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
      }
      void vscode.window.showInformationMessage("Agent Watchtower instruction files generated.");
    }),
  );
}

export function deactivate() {}
