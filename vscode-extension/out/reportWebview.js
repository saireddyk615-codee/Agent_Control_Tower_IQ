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
exports.openReportWebview = openReportWebview;
const vscode = __importStar(require("vscode"));
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
function openReportWebview(result, onCommand) {
    const panel = vscode.window.createWebviewPanel("agentWatchtowerReport", "Agent Watchtower Report", vscode.ViewColumn.Beside, { enableScripts: true });
    panel.webview.onDidReceiveMessage((message) => { if (message.command)
        onCommand?.(message.command); });
    const findings = result.findings.map((finding) => `<article><div><strong>${escape(finding.title)}</strong><span class="${escape(finding.severity)}">${escape(finding.severity)}</span></div><small>${escape(finding.file)}${finding.line ? `:${finding.line}` : ""}</small><p>${escape(finding.evidence)}</p><b>Fix:</b> ${escape(finding.recommendation)}</article>`).join("");
    const fixes = result.fixPlan.map((fix) => `<li><strong>${escape(fix.title)}</strong> ${escape(fix.file)}<br>${escape(fix.recommendedFix)} ${fix.humanApprovalRequired ? "<em>Human approval required</em>" : ""}</li>`).join("");
    const artifacts = result.artifacts.map((artifact) => `<li><code>${escape(artifact.path)}</code> - ${escape(artifact.description)}</li>`).join("");
    panel.webview.html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);padding:24px;line-height:1.5}header,article,section{border:1px solid var(--vscode-panel-border);border-radius:8px;padding:16px;margin-bottom:14px}header{background:var(--vscode-editor-inactiveSelectionBackground)}article div{display:flex;justify-content:space-between;gap:12px}.critical,.high{color:var(--vscode-errorForeground)}.medium{color:var(--vscode-editorWarning-foreground)}code{font-family:var(--vscode-editor-font-family)}small{opacity:.75}em{color:var(--vscode-errorForeground)}button{margin:0 8px 8px 0;padding:7px 11px;color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;border-radius:4px}</style></head><body><header><h1>Agent Watchtower</h1><p><strong>Decision:</strong> ${escape(result.decision)} &nbsp; <strong>Risk:</strong> ${result.riskScore}/100</p><p>${escape(result.summary)}</p><button data-command="full">Run Full Scan</button><button data-command="fix">Apply Safe Fixes</button><button data-command="instructions">Generate Agent Instructions</button><button data-command="folder">Open Report Folder</button></header><section><h2>Checks Run</h2><p>${escape(result.checksRun.join(", "))}</p></section><h2>Top Findings</h2>${findings || "<p>No findings.</p>"}<section><h2>Fix Plan</h2><ul>${fixes || "<li>No fixes required.</li>"}</ul></section><section><h2>Generated Artifacts</h2><ul>${artifacts}</ul></section><section><h2>Execution</h2><p><code>${escape(result.cliCommand)}</code></p><p>${escape(result.timestamp ?? new Date().toISOString())}</p></section><script>const vscode=acquireVsCodeApi();document.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>vscode.postMessage({command:button.dataset.command})));</script></body></html>`;
}
