import * as vscode from "vscode";

export class WatchtowerCodeActionProvider implements vscode.CodeActionProvider {
  static readonly kinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(_document: vscode.TextDocument, _range: vscode.Range, context: vscode.CodeActionContext) {
    if (!context.diagnostics.some((diagnostic) => diagnostic.source === "Agent Watchtower")) return [];
    const actions: vscode.CodeAction[] = [];
    const instructions = new vscode.CodeAction("Agent Watchtower: Generate Agent Instructions", vscode.CodeActionKind.QuickFix);
    instructions.command = { command: "agentWatchtower.generateInstructions", title: instructions.title };
    actions.push(instructions);
    const fixes = new vscode.CodeAction("Agent Watchtower: Apply Safe Fixes", vscode.CodeActionKind.QuickFix);
    fixes.command = { command: "agentWatchtower.applySafeFixes", title: fixes.title };
    actions.push(fixes);
    return actions;
  }
}
