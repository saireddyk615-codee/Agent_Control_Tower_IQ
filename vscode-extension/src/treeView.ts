import * as vscode from "vscode";
import type { WatchtowerCliResult } from "./watchtowerRunner";

export class WatchtowerTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;
  private result?: WatchtowerCliResult;

  update(result: WatchtowerCliResult) {
    this.result = result;
    this.changed.fire();
  }

  getTreeItem(item: vscode.TreeItem) { return item; }

  getChildren(): vscode.TreeItem[] {
    if (!this.result) return [this.item("Status", "Idle")];
    const critical = this.result.findings.filter((finding) => finding.severity === "critical").length;
    const high = this.result.findings.filter((finding) => finding.severity === "high").length;
    return [
      this.item("Status", this.result.decision),
      this.item("Risk Score", `${this.result.riskScore}/100`),
      this.item("Critical Findings", String(critical)),
      this.item("High Findings", String(high)),
      this.item("Fix Plan", String(this.result.fixPlan.length)),
      this.item("Artifacts", String(this.result.artifacts.length)),
      this.item("Commands", "Open latest report"),
    ];
  }

  private item(label: string, description: string) {
    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
    item.description = description;
    item.command = { command: "agentWatchtower.openReport", title: "Open Latest Report" };
    return item;
  }
}
