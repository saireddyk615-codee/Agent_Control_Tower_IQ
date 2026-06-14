import { existsSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";
import type { WatchtowerCliFinding } from "./watchtowerRunner";

export function diagnosticSeverity(severity: WatchtowerCliFinding["severity"]) {
  if (severity === "critical" || severity === "high") return vscode.DiagnosticSeverity.Error;
  if (severity === "medium") return vscode.DiagnosticSeverity.Warning;
  return vscode.DiagnosticSeverity.Information;
}

export function updateDiagnostics(collection: vscode.DiagnosticCollection, workspacePath: string, findings: WatchtowerCliFinding[]) {
  collection.clear();
  const grouped = new Map<string, vscode.Diagnostic[]>();
  for (const finding of findings) {
    if (!finding.file) continue;
    const path = join(workspacePath, finding.file);
    if (!existsSync(path)) continue;
    const line = Math.max(0, (finding.line ?? 1) - 1);
    const diagnostic = new vscode.Diagnostic(new vscode.Range(line, 0, line, 1), `[Agent Watchtower] ${finding.title} — ${finding.recommendation}`, diagnosticSeverity(finding.severity));
    diagnostic.source = "Agent Watchtower";
    diagnostic.code = finding.id;
    grouped.set(path, [...(grouped.get(path) ?? []), diagnostic]);
  }
  for (const [path, diagnostics] of grouped) collection.set(vscode.Uri.file(path), diagnostics);
}
