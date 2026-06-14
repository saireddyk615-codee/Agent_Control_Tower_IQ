import { expect, test } from "@playwright/test";

const workoutRepo = "/Users/shivareddy/IdeaProjects/Workout App";
const appRepo = "/Users/shivareddy/IdeaProjects/SecureGuard-LM IQ";
const checks = ["Repo safety", "Agent/MCP config risks", "Git diff / scope creep", "Secrets and sensitive data", "Package and workflow risks", "Output firewall", "Generate repo safety files", "Code security review"];

test("Watchtower buttons drive the real local workflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto("/watchtower");
  await expect(page.getByRole("heading", { name: "Agent Watchtower" })).toBeVisible();
  for (const label of ["Watchtower", "Reports", "Compare", "IDE Extension", "Submission"]) await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
  for (const label of ["Agent Preflight", "Repo Guardian", "Diff Guard", "Output Firewall", "Safe Handoff", "Safety Compiler", "Control Tower"]) await expect(page.getByRole("navigation").getByText(label, { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Run Scan", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Load Demo Project", exact: true }).click();
  await expect(page.getByLabel("Repo path")).toHaveValue(workoutRepo);
  await page.getByRole("button", { name: "Select All", exact: true }).click();
  for (const label of checks) await expect(page.getByLabel(label, { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Clear All", exact: true }).click();
  for (const label of checks) await expect(page.getByLabel(label, { exact: true })).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Run Scan", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Quick Scan", exact: true }).click();
  await expect(page.getByLabel("Repo safety", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Code security review", { exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "Full Scan", exact: true }).click();
  for (const label of checks) await expect(page.getByLabel(label, { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Run Scan", exact: true }).click();
  await expect(page.getByText("Local Watchtower scan completed.", { exact: true })).toBeVisible();
  await expect(page.getByText("Unhandled Runtime Error", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Recommended fix", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fix Plan", exact: true })).toBeVisible();
  await expect(page.getByText("Raw JSON", { exact: true })).toBeVisible();
  await expect(page.locator("details").filter({ hasText: "Raw JSON" })).not.toHaveAttribute("open", "");
  const safeButton = page.getByRole("button", { name: "Select All Safe Fixes", exact: true });
  if (await safeButton.isEnabled()) {
    await safeButton.click();
    await expect(page.getByRole("button", { name: "Fix Selected Safe Issues", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Fix Selected Safe Issues", exact: true }).click();
    await expect(page.getByText(/safe fixes applied/i)).toBeVisible();
    await expect(page.getByText("Re-scan to verify.", { exact: true })).toBeVisible();
  } else {
    await expect(page.getByRole("button", { name: "Fix Selected Safe Issues", exact: true })).toBeDisabled();
  }
  await page.getByRole("button", { name: "Generate Patch for Review", exact: true }).click();
  await expect(page.getByText("Manual-review patch preview", { exact: true })).toBeVisible();
  await expect(page.getByText(/watchtower-suggested-fixes\.patch/)).toBeVisible();
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF Report", exact: true }).click();
  await pdfDownload;
  await expect(page.getByRole("status").getByText(/WATCHTOWER_SECURITY_REPORT\.pdf/)).toBeVisible();
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON", exact: true }).click();
  await jsonDownload;
  await page.getByRole("button", { name: "Re-scan", exact: true }).click();
  await expect(page.getByText("Local Watchtower scan completed.", { exact: true })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("Reports and integrations actions work", async ({ page }) => {
  await page.goto("/reports");
  const pathInput = page.getByLabel("Repo path", { exact: true });
  await pathInput.fill(workoutRepo);
  await expect(pathInput).toHaveValue(workoutRepo);
  const loadReport = page.getByRole("button", { name: "Load Latest Report", exact: true });
  await expect(loadReport).toBeEnabled();
  await loadReport.click();
  await expect(page.getByText("Latest findings and fix plan", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fix Plan", exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  await download;
  await expect(page.getByText(/PDF report generated and downloaded/)).toBeVisible();
  await page.goto("/integrations");
  await expect(page.getByText("Install from VSIX", { exact: true })).toBeVisible();
  await expect(page.getByText(/Agent Watchtower: Run Quick Scan/)).toBeVisible();
});

test("button APIs validate, scan, patch, and generate PDF", async ({ request }) => {
  const invalid = await request.post("/api/watchtower/ui-scan", { data: { repoPath: "/", checks: ["repo_safety"] } });
  expect(invalid.status()).toBe(400);
  const scan = await request.post("/api/watchtower/ui-scan", { data: { repoPath: appRepo, checks: ["repo_safety", "secrets_sensitive_data", "git_diff_scope"] } });
  expect(scan.ok()).toBeTruthy();
  const report = await scan.json();
  expect(report.findings.length).toBeGreaterThan(0);
  const manual = report.findings.find((finding: { humanApprovalRequired: boolean }) => finding.humanApprovalRequired);
  const patch = await request.post("/api/watchtower/generate-patch", { data: { repoPath: appRepo, fixIds: [`FIX-${manual.id}`] } });
  expect(patch.ok()).toBeTruthy();
  expect((await patch.json()).manualReviewRequired).toBe(true);
  const fixes = await request.post("/api/watchtower/apply-fixes", { data: { repoPath: appRepo, fixIds: [manual.id] } });
  expect(fixes.ok()).toBeTruthy();
  expect((await fixes.json()).skipped.length).toBe(1);
  const pdf = await request.post("/api/watchtower/pdf-report", { data: { repoPath: appRepo } });
  expect(pdf.ok()).toBeTruthy();
  expect((await pdf.body()).length).toBeGreaterThan(500);
});

test("invalid and quoted repo paths are handled without a Next.js error overlay", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto("/watchtower");
  await page.getByLabel("Repo path").fill("/bad/path");
  await page.getByRole("button", { name: "Run Scan", exact: true }).click();
  await expect(page.getByText("Directory does not exist: /bad/path", { exact: true })).toBeVisible();
  await expect(page.getByText("Unhandled Runtime Error", { exact: true })).toHaveCount(0);
  await page.getByLabel("Repo path").fill(` "${workoutRepo}" `);
  await page.getByRole("button", { name: "Run Scan", exact: true }).click();
  await expect(page.getByText("Local Watchtower scan completed.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Repo path")).toHaveValue(workoutRepo);
  expect(consoleErrors.filter((message) => !message.includes("status of 400"))).toEqual([]);
});

test("Compare page loads demo paths and compares existing local reports", async ({ page }) => {
  await page.goto("/compare");
  await page.getByRole("button", { name: "Load Demo Comparison", exact: true }).click();
  await expect(page.getByLabel("Repo paths, one per line")).toHaveValue(/SecureGuard-LM IQ/);
  await page.getByRole("button", { name: "Compare Projects", exact: true }).click();
  await expect(page.getByText("Executive summary", { exact: true })).toBeVisible();
  await expect(page.getByText("Repeated risks", { exact: true }).first()).toBeVisible();
});
