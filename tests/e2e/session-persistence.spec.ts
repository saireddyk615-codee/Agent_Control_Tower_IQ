import { expect, test, type Page } from "@playwright/test";

const workoutRepo = "/Users/shivareddy/IdeaProjects/Workout App";

test.describe.serial("portal-wide session persistence", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto("/watchtower");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("Watchtower result persists through Reports and back", async () => {
    await page.getByRole("button", { name: "Load Demo Project", exact: true }).click();
    await page.getByRole("button", { name: "Full Scan", exact: true }).click();
    await page.getByRole("button", { name: "Run Scan", exact: true }).click();
    await expect(page.getByText("Local Watchtower scan completed.", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fix Plan", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Reports", exact: true }).click();
    await expect(page.getByText("Loaded from last Watchtower session", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fix Plan", exact: true })).toBeVisible();
    await expect(page.getByText(/\/100/, { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Back to Watchtower", exact: true }).click();
    await expect(page.getByLabel("Repo path")).toHaveValue(workoutRepo);
    await expect(page.getByRole("heading", { name: "Fix Plan", exact: true })).toBeVisible();
    await expect(page.getByLabel("Code security review", { exact: true })).toBeChecked();
  });

  test("refresh restores result and timestamp", async () => {
    await page.reload();
    await expect(page.getByRole("heading", { name: "Fix Plan", exact: true })).toBeVisible();
    await expect(page.getByText(/^Last scan: \d/)).toBeVisible();
    await expect(page.getByLabel("Repo path")).toHaveValue(workoutRepo);
  });

  test("selected fixes persist when navigating away", async () => {
    const safeButton = page.getByRole("button", { name: "Select All Safe Fixes", exact: true });
    if (await safeButton.isEnabled()) {
      await safeButton.click();
      await expect(page.getByText(/[1-9]\d* safe fixes selected/)).toBeVisible();
    } else {
      const firstFinding = page.getByRole("checkbox", { name: /Select finding/ }).first();
      await firstFinding.check();
      await expect(firstFinding).toBeChecked();
    }
    await page.getByRole("link", { name: "Reports", exact: true }).click();
    await page.getByRole("link", { name: "Back to Watchtower", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: /Select finding/ }).first()).toBeChecked();
  });

  test("Compare and Integrations state persist", async () => {
    await page.getByRole("link", { name: "Compare", exact: true }).click();
    await page.getByRole("button", { name: "Load Demo Comparison", exact: true }).click();
    await page.getByRole("button", { name: "Compare Projects", exact: true }).click();
    await expect(page.getByText("Executive summary", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "IDE Extension", exact: true }).click();
    await page.getByRole("button", { name: "CLI", exact: true }).click();
    await page.getByRole("link", { name: "Compare", exact: true }).click();
    await expect(page.getByText("Executive summary", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "IDE Extension", exact: true }).click();
    await expect(page.getByRole("button", { name: "CLI", exact: true })).toHaveClass(/border-blue-600/);
  });

  test("visible nav is scoped and Clear Session removes browser state", async () => {
    for (const label of ["Watchtower", "Reports", "Compare", "IDE Extension", "Submission"]) await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
    for (const label of ["Agent Preflight", "Repo Guardian", "Diff Guard", "Output Firewall"]) await expect(page.getByRole("navigation").getByText(label, { exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Watchtower", exact: true }).click();
    await page.getByRole("button", { name: "Clear Session", exact: true }).last().click();
    await expect(page.getByLabel("Repo path")).toHaveValue("");
    await page.reload();
    await expect(page.getByLabel("Repo path")).toHaveValue("");
    await expect(page.getByRole("heading", { name: "Fix Plan", exact: true })).toHaveCount(0);
  });
});
