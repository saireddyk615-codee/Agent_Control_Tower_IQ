import * as vscode from "vscode";
import type { WatchtowerCliResult } from "./watchtowerRunner";

export function createWatchtowerStatusBar() {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  item.command = "agentWatchtower.openReport";
  item.tooltip = "Open latest Agent Watchtower report";
  item.text = "$(shield) Watchtower: Idle";
  item.show();
  return {
    item,
    scanning() { item.text = "$(sync~spin) Watchtower: Scanning..."; },
    result(result: WatchtowerCliResult) {
      item.text = result.decision === "safe" ? "$(pass-filled) Watchtower: Safe" : result.decision === "blocked" ? "$(error) Watchtower: Blocked" : "$(warning) Watchtower: Needs Review";
    },
    idle() { item.text = "$(shield) Watchtower: Idle"; },
  };
}
