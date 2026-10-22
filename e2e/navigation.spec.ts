import { test, expect } from "@playwright/test";

test.describe("Navigation & Public Routes", () => {
  test("Landing page renders product tagline, dual-audience breakdown, and links", async ({ page }) => {
    await page.goto("/");

    // Verify main title and branding
    await expect(page).toHaveTitle(/SiteIntel Pulse/);
    await expect(page.locator("h1")).toContainText("Discover Issues. Prove with Evidence.");

    // Verify audience cards exist
    await expect(page.getByText("Company A — Website Owner Report")).toBeVisible();
    await expect(page.getByText("Company B — Expert Diagnostic Workbench")).toBeVisible();

    // Verify Milestone 2 disclaimer tag
    await expect(page.getByText("Milestone 2 Preview")).toBeVisible();

    // Verify primary CTA links
    const ownerReportLink = page.getByRole("link", { name: /Launch Owner Audit/i });
    await expect(ownerReportLink).toBeVisible();
    await expect(ownerReportLink).toHaveAttribute("href", "/owner-report");

    const expertAuditLink = page.getByRole("link", { name: /Milestone 2 Expert Preview/i });
    await expect(expertAuditLink).toBeVisible();
    await expect(expertAuditLink).toHaveAttribute("href", "/expert-audit");
  });

  test("Expert Diagnostic Audit route renders Company B Expert Diagnostic Workbench", async ({ page }) => {
    await page.goto("/expert-audit");

    // Verify headline and milestone 2 indicator
    await expect(page.getByRole("heading", { name: /Company B — Expert Diagnostic Workbench/i })).toBeVisible();
    await expect(page.getByText("Milestone 2 • Company B Workbench")).toBeVisible();

    // Verify demo launch and live intake controls
    await expect(page.getByText("Instant Controlled Demonstration")).toBeVisible();
    await expect(page.getByRole("button", { name: /Load Demo Workbench/i })).toBeVisible();

    // Verify navigation back to home
    const backLink = page.getByRole("link", { name: /Back to Home/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/");
  });

  test("Website Owner Report route renders intake form with proper inputs and safety policy", async ({ page }) => {
    await page.goto("/owner-report");

    // Verify page header
    await expect(page.locator("h1")).toContainText("Website Intelligence & Growth Audit");

    // Verify intake fields
    await expect(page.getByLabel(/Website Domain or URL/i)).toBeVisible();
    await expect(page.getByLabel(/Platform \/ Brand Name/i)).toBeVisible();
    await expect(page.getByLabel(/Business Category/i)).toBeVisible();

    // Verify crawler safety notice
    await expect(page.getByText("Bounded Public Scope:")).toBeVisible();
    await expect(page.getByText("No login bypasses, destructive payloads")).toBeVisible();

    // Submit button visible and enabled
    const submitBtn = page.getByRole("button", { name: /Start Owner Audit/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });
});
