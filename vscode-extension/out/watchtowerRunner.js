"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findWatchtowerCli = findWatchtowerCli;
exports.parseWatchtowerResult = parseWatchtowerResult;
exports.runWatchtowerScan = runWatchtowerScan;
exports.runWatchtowerCommand = runWatchtowerCommand;
const node_child_process_1 = require("node:child_process");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
async function exists(path) {
    try {
        await (0, promises_1.access)(path);
        return true;
    }
    catch {
        return false;
    }
}
async function findWatchtowerCli(workspacePath, extensionPath) {
    const candidates = [
        (0, node_path_1.join)(workspacePath, "cli", "watchtower.mjs"),
        (0, node_path_1.resolve)(extensionPath, "..", "cli", "watchtower.mjs"),
        (0, node_path_1.join)(extensionPath, "cli", "watchtower.mjs"),
    ];
    for (const candidate of candidates)
        if (await exists(candidate))
            return candidate;
    throw new Error("Watchtower CLI not found. Run npm install in Agent Control Tower IQ project.");
}
function parseWatchtowerResult(value) {
    const parsed = JSON.parse(value);
    if (!["safe", "needs_review", "blocked"].includes(parsed.decision ?? "") || !Array.isArray(parsed.findings)) {
        throw new Error("Watchtower CLI returned an invalid result.");
    }
    return {
        decision: parsed.decision,
        riskScore: typeof parsed.riskScore === "number" ? parsed.riskScore : 0,
        checksRun: Array.isArray(parsed.checksRun) ? parsed.checksRun : [],
        findings: parsed.findings,
        fixPlan: Array.isArray(parsed.fixPlan) ? parsed.fixPlan : [],
        artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : [],
        summary: typeof parsed.summary === "string" ? parsed.summary : "Agent Watchtower scan complete.",
        timestamp: parsed.timestamp,
    };
}
async function runWatchtowerScan(options) {
    const cli = await findWatchtowerCli(options.workspacePath, options.extensionPath);
    const args = [cli, "scan", "--repo", options.workspacePath, "--checks", options.checks, ...(options.applySafeFixes ? ["--apply-safe-fixes"] : []), "--output", "json"];
    const command = `node ${args.map((item) => JSON.stringify(item)).join(" ")}`;
    options.output?.appendLine(`Scan started: ${options.checks}`);
    const stdout = await new Promise((resolvePromise, reject) => {
        const child = (0, node_child_process_1.spawn)(process.execPath, args, { cwd: (0, node_path_1.dirname)(cli), shell: false });
        let output = "";
        let error = "";
        child.stdout.on("data", (data) => { output += data.toString(); });
        child.stderr.on("data", (data) => { error += data.toString(); });
        child.on("error", reject);
        child.on("close", (code) => code === 0 ? resolvePromise(output.trim()) : reject(new Error(error.trim() || `Watchtower CLI exited with code ${code}.`)));
    });
    try {
        return { ...parseWatchtowerResult(stdout), cliCommand: command };
    }
    catch {
        const fallback = await (0, promises_1.readFile)((0, node_path_1.join)(options.workspacePath, ".agent-control-tower", "watchtower-latest.json"), "utf8");
        const raw = JSON.parse(fallback);
        return {
            decision: raw.decision, riskScore: raw.riskScore, checksRun: raw.checksRun ?? [], findings: raw.findings.map((finding) => ({ ...finding, title: finding.title ?? finding.explanation })),
            fixPlan: raw.findings.map((finding) => ({ title: finding.title ?? finding.explanation, file: finding.file, recommendedFix: finding.recommendation, humanApprovalRequired: ["critical", "high"].includes(finding.severity) })),
            artifacts: raw.generatedArtifacts ?? [], summary: raw.summary, timestamp: raw.generatedAt, cliCommand: command,
        };
    }
}
async function runWatchtowerCommand(workspacePath, extensionPath, command) {
    const cli = await findWatchtowerCli(workspacePath, extensionPath);
    return new Promise((resolvePromise, reject) => {
        const child = (0, node_child_process_1.spawn)(process.execPath, [cli, command, "--repo", workspacePath], { cwd: (0, node_path_1.dirname)(cli), shell: false });
        let output = "";
        let error = "";
        child.stdout.on("data", (data) => { output += data.toString(); });
        child.stderr.on("data", (data) => { error += data.toString(); });
        child.on("error", reject);
        child.on("close", (code) => code === 0 ? resolvePromise(output.trim()) : reject(new Error(error.trim() || `Watchtower CLI exited with code ${code}.`)));
    });
}
