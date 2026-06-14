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
exports.diagnosticSeverity = diagnosticSeverity;
exports.updateDiagnostics = updateDiagnostics;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const vscode = __importStar(require("vscode"));
function diagnosticSeverity(severity) {
    if (severity === "critical" || severity === "high")
        return vscode.DiagnosticSeverity.Error;
    if (severity === "medium")
        return vscode.DiagnosticSeverity.Warning;
    return vscode.DiagnosticSeverity.Information;
}
function updateDiagnostics(collection, workspacePath, findings) {
    collection.clear();
    const grouped = new Map();
    for (const finding of findings) {
        if (!finding.file)
            continue;
        const path = (0, node_path_1.join)(workspacePath, finding.file);
        if (!(0, node_fs_1.existsSync)(path))
            continue;
        const line = Math.max(0, (finding.line ?? 1) - 1);
        const diagnostic = new vscode.Diagnostic(new vscode.Range(line, 0, line, 1), `[Agent Watchtower] ${finding.title} — ${finding.recommendation}`, diagnosticSeverity(finding.severity));
        diagnostic.source = "Agent Watchtower";
        diagnostic.code = finding.id;
        grouped.set(path, [...(grouped.get(path) ?? []), diagnostic]);
    }
    for (const [path, diagnostics] of grouped)
        collection.set(vscode.Uri.file(path), diagnostics);
}
