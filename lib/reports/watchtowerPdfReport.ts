import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createWriteStream } from "node:fs";
import PDFDocument from "pdfkit";
import type { WatchtowerUserReport } from "../../types/security.ts";

export async function generateWatchtowerPdfReport(input: {
  projectName?: string;
  repoPath: string;
  result: WatchtowerUserReport;
  outputDir: string;
}): Promise<{ pdfPath: string; fileName: string }> {
  await mkdir(input.outputDir, { recursive: true });
  const fileName = "WATCHTOWER_SECURITY_REPORT.pdf";
  const pdfPath = join(input.outputDir, fileName);
  const document = new PDFDocument({ margin: 48, size: "LETTER", info: { Title: "Agent Watchtower Security Report" } });
  const stream = createWriteStream(pdfPath);
  document.pipe(stream);
  const heading = (title: string) => document.moveDown().fontSize(15).fillColor("#0f172a").text(title).moveDown(0.4);
  const row = (label: string, value: string | number) => document.fontSize(9).fillColor("#475569").text(`${label}: `, { continued: true }).fillColor("#0f172a").text(String(value));

  document.fontSize(22).fillColor("#0f172a").text("Agent Watchtower Security Report");
  document.fontSize(10).fillColor("#64748b").text("Local-first static security review for AI-generated projects.");
  heading("Executive Summary");
  row("Project", input.projectName ?? input.result.projectName);
  row("Project path", input.repoPath);
  row("Scan timestamp", input.result.scannedAt);
  row("Decision", input.result.decision.toUpperCase());
  row("Risk score", `${input.result.riskScore}/100`);
  row("Total findings", input.result.findings.length);
  row("Short risk note", input.result.shortRiskNote);
  heading("Findings Summary");
  input.result.findings.forEach((finding) => document.fontSize(8).fillColor("#0f172a").text(`${finding.severity.toUpperCase()} | ${finding.category} | ${finding.file ?? "repository"} | ${finding.shortNote}`));
  heading("Detailed Findings");
  input.result.findings.forEach((finding) => {
    document.fontSize(11).fillColor("#0f172a").text(`${finding.severity.toUpperCase()}: ${finding.title}`);
    row("File", `${finding.file ?? "repository"}${finding.line ? `:${finding.line}` : ""}`);
    row("What was identified", finding.explanation);
    row("Why it matters", finding.shortNote);
    row("Recommended fix", finding.recommendation);
    row("Safe auto-fix available", finding.safeFixAvailable ? "Yes" : "No");
    row("Human approval required", finding.humanApprovalRequired ? "Yes" : "No");
    document.moveDown(0.5);
  });
  heading("Recommended Fix Plan");
  input.result.fixPlan.forEach((fix) => {
    document.fontSize(10).fillColor("#0f172a").text(fix.title);
    row("File", fix.file ?? "repository");
    row("Recommended fix", fix.recommendedFix);
    row("Safe auto-fix available", fix.safeFixAvailable ? "Yes" : "No");
    row("Human approval required", fix.humanApprovalRequired ? "Yes" : "No");
  });
  heading("Safe Auto-Fixes");
  input.result.fixPlan.filter((fix) => !fix.humanApprovalRequired).forEach((fix) => document.fontSize(9).text(`${fix.file ?? "repository"}: ${fix.recommendedFix}`));
  if (!input.result.fixPlan.some((fix) => !fix.humanApprovalRequired)) document.fontSize(9).text("No safe auto-fixes are currently available.");
  heading("Manual Review Fixes");
  input.result.fixPlan.filter((fix) => fix.humanApprovalRequired).forEach((fix) => document.fontSize(9).text(`${fix.file ?? "repository"}: ${fix.recommendedFix}`));
  heading("Generated Artifacts");
  Object.values(input.result.reportPaths).forEach((path) => document.fontSize(8).text(path));
  input.result.artifacts.forEach((artifact) => document.fontSize(8).text(`${artifact.path}: ${artifact.description}`));
  heading("Security Model");
  ["Local scan only", "No source code upload", "No project code execution", "High-risk fixes require human review"].forEach((item) => document.fontSize(9).text(`• ${item}`));
  document.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
    document.on("error", reject);
  });
  return { pdfPath, fileName };
}
