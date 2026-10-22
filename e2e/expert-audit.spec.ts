import { test, expect } from "@playwright/test";

test.describe("Company B: Expert Diagnostic Workbench E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to expert-audit and load the controlled demo workbench
    await page.goto("/expert-audit");
    await expect(page.getByRole("heading", { name: /Company B — Expert Diagnostic Workbench/i })).toBeVisible();

    const loadDemoBtn = page.getByRole("button", { name: /Load Demo Workbench/i });
    await expect(loadDemoBtn).toBeVisible();
    await loadDemoBtn.click();

    // Wait for the workbench to render
    await expect(page.getByText("Milestone 2 • Company B Workbench")).toBeVisible({ timeout: 15000 });
  });

  test("Renders header with platform identity, overall score, and triage counters", async ({ page }) => {
    // Header KPIs
    await expect(page.getByText("Score / 100")).toBeVisible();
    await expect(page.getByText(/catalogue coverage/i)).toBeVisible();

    // Action buttons visible
    await expect(page.getByRole("link", { name: /View Owner Report/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Download Expert PDF/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export", exact: true })).toBeVisible();
  });

  test("Renders all 19 diagnostic sections in DOM structure", async ({ page }) => {
    // Verify each section ID exists
    const sectionIds = [
      "section-summary",
      "section-scope",
      "section-platform",
      "section-ledger",
      "section-urls",
      "section-seo",
      "section-links",
      "section-performance",
      "section-responsive",
      "section-security",
      "section-auth",
      "section-content",
      "section-geo-aeo",
      "section-analytics",
      "section-conversion",
      "section-competitors",
      "section-findings",
      "section-remediation",
      "section-manifest",
    ];

    for (const id of sectionIds) {
      const section = page.locator(`#${id}`);
      await expect(section).toBeAttached();
    }
  });

  test("Finding Explorer supports search, filtering, and detail expansion", async ({ page }) => {
    const findingsSection = page.locator("#section-findings");
    await expect(findingsSection).toBeVisible();

    // Finding search input
    const searchInput = findingsSection.getByPlaceholder(/Search findings by ID/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("SEC-01");

    // Check filtered results contain rule ID SEC-01
    await expect(findingsSection.getByText("SEC-01").first()).toBeVisible();

    // Click to expand finding card
    const firstFinding = findingsSection.locator("button").filter({ hasText: "SEC-01" }).first();
    await firstFinding.click();

    // Verify expanded technical details appear
    await expect(page.getByText("Observed Technical Discrepancy")).toBeVisible();
    await expect(page.getByText("Actionable Remediation Guidance")).toBeVisible();
    await expect(page.getByText("Engineering Validation Procedure")).toBeVisible();
  });

  test("URL Inventory table allows filtering and search", async ({ page }) => {
    const urlsSection = page.locator("#section-urls");
    await expect(urlsSection).toBeVisible();

    // Search input
    const urlSearchInput = urlsSection.getByPlaceholder(/Search by URL path/i);
    await expect(urlSearchInput).toBeVisible();
    await urlSearchInput.fill("products");

    // Verify filtered URL is displayed
    await expect(urlsSection.getByText(/https:\/\/example-shop\.demo\/products/i)).toBeVisible();
  });

  test("Export dropdown exposes multi-format download triggers", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: "Export", exact: true });
    await exportBtn.click();

    // Verify all export format options
    await expect(page.getByRole("link", { name: /CSV: Findings Ledger/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /CSV: URL Inventory/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /CSV: Workstream Tasks/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /JSON: Full Report Bundle/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /JSON: Integrity Manifest/i })).toBeVisible();
  });

  test("Seamlessly switches to Company A Owner Report", async ({ page }) => {
    const ownerLink = page.getByRole("link", { name: /View Owner Report/i });
    await expect(ownerLink).toBeVisible();
    await ownerLink.click();

    // Expect navigation to owner report page
    await expect(page).toHaveURL(/\/owner-report\?id=/);
    await expect(page.locator("h1")).toContainText(/Website Intelligence & Growth Audit/i);
  });
});
