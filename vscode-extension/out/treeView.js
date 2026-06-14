"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatchtowerTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class WatchtowerTreeProvider {
    changed = new vscode.EventEmitter();
    onDidChangeTreeData = this.changed.event;
    result;
    update(result) {
        this.result = result;
        this.changed.fire();
    }
    getTreeItem(item) { return item; }
    getChildren() {
        if (!this.result)
            return [this.item("Status", "Idle")];
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
    item(label, description) {
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
        item.description = description;
        item.command = { command: "agentWatchtower.openReport", title: "Open Latest Report" };
        return item;
    }
}
exports.WatchtowerTreeProvider = WatchtowerTreeProvider;
