import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import { SqliteScanDatabaseAdapter } from "../persistence/db";
import { seedInitialAccounts } from "../auth/seed";
import { integrationsManager } from "./analytics";
import { ProviderConnectionStore } from "./connection-store";
import { GA4Adapter } from "./ga4-adapter";
import { ShopifyCommerceAdapter } from "./shopify-adapter";
import { GoogleAdsAdapter } from "./google-ads-adapter";
import { SearchConsoleAdapter, calculateGscDateRange } from "./gsc-adapter";
import { BacklinksSerpAdapter } from "./backlinks-serp-adapter";
import { calculateCostOfInaction } from "../reports/cost-of-inaction";
import { projectOwnerReport } from "../reports/owner-projection";
import { projectExpertReport } from "../reports/expert-projection";
import { CrawlResult, AssessmentResult } from "@/types";

describe("Milestone 3 Correctness & Security Gate Tests", () => {
  let adapter: SqliteScanDatabaseAdapter;
  let store: ProviderConnectionStore;
  const tenantId = "tenant_comp_a";

  beforeEach(() => {
    process.env.SHOPIFY_API_KEY = "test_shopify_key";
    process.env.SHOPIFY_API_SECRET = "test_shopify_secret";
    process.env.SHOPIFY_API_VERSION = "2025-01";
    process.env.GA4_CLIENT_ID = "test_ga4_id";
    process.env.GA4_CLIENT_SECRET = "test_ga4_secret";
    process.env.GSC_CLIENT_ID = "test_gsc_id";
    process.env.GSC_CLIENT_SECRET = "test_gsc_secret";
    process.env.GOOGLE_ADS_CLIENT_ID = "test_ads_id";
    process.env.GOOGLE_ADS_CLIENT_SECRET = "test_ads_secret";
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = "test_ads_dev_token";
    delete process.env.SERP_API_KEY;
    delete process.env.BACKLINK_API_KEY;

    adapter = new SqliteScanDatabaseAdapter(":memory:");
    (globalThis as any).scanDbInstance = adapter;
    integrationsManager.reset();
    seedInitialAccounts((adapter as any).db);
    store = new ProviderConnectionStore((adapter as any).db);
  });

  afterEach(() => {
    integrationsManager.reset();
    (globalThis as any).scanDbInstance = undefined;
    try {
      adapter.close();
    } catch {}
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. GA4 PROPERTY FLOW TESTS
  // =========================================================================
  describe("1. GA4 Property Flow & Verification", () => {
    it("rejects invalid placeholder IDs like 'properties/active' and non-numeric formats", async () => {
      const ga4 = new GA4Adapter(store, "test_id", "test_secret");

      // Save a connection record without property
      store.saveConnection({
        tenantId,
        provider: "google_analytics_4",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
        accessToken: "test_token",
      });

      const badIds = ["properties/active", "active", "properties/foo-bar", "1234/bad", "properties/"];
      for (const badId of badIds) {
        const res = await ga4.selectProperty(tenantId, badId);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Invalid property identifier/i);
      }
    });

    it("returns clear unavailable state when no valid property is selected and never calls it verified traffic", async () => {
      const ga4 = new GA4Adapter(store, "test_id", "test_secret");

      // Connected record but property_id is missing or invalid placeholder
      store.saveConnection({
        tenantId,
        provider: "google_analytics_4",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
        accessToken: "test_token",
        propertyId: "properties/active", // Old legacy placeholder
      });

      const metricsResult = await ga4.fetchMetrics(tenantId);
      expect(metricsResult.isAvailable).toBe(false);
      expect(metricsResult.provenance.propertyOrAccount).toBe("NO_PROPERTY_SELECTED");
      expect(metricsResult.limitations).toContain("No valid Google Analytics 4 property selected or authorized");
      expect(metricsResult.metrics).toEqual({});
    });

    it("discovers accessible properties and verifies tenant ownership before selection", async () => {
      const ga4 = new GA4Adapter(store, "test_id", "test_secret");

      store.saveConnection({
        tenantId,
        provider: "google_analytics_4",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
        accessToken: "test_token",
      });

      // Mock Google Analytics Admin API accountSummaries response
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountSummaries: [
            {
              account: "accounts/100",
              displayName: "Acme Corp",
              propertySummaries: [
                { property: "properties/123456789", displayName: "Acme Production Web" },
                { property: "properties/987654321", displayName: "Acme Staging Web" },
              ],
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const discovery = await ga4.listAccessibleProperties(tenantId);
      expect(discovery.success).toBe(true);
      expect(discovery.properties).toHaveLength(2);
      expect(discovery.properties![0].propertyId).toBe("properties/123456789");

      // Attempting to select an inaccessible property should be rejected
      const inaccessibleRes = await ga4.selectProperty(tenantId, "properties/555555555");
      expect(inaccessibleRes.success).toBe(false);
      expect(inaccessibleRes.error).toContain("is not accessible by the authenticated Google Analytics account");

      // Selecting an accessible property succeeds and updates connection store
      const accessibleRes = await ga4.selectProperty(tenantId, "123456789"); // Should normalize to properties/123456789
      expect(accessibleRes.success).toBe(true);
      expect(accessibleRes.propertyId).toBe("properties/123456789");

      const updatedConn = store.getConnection(tenantId, "google_analytics_4");
      expect(updatedConn?.property_id).toBe("properties/123456789");
    });

    it("parses live GA4 Data API response accurately and handles API errors cleanly", async () => {
      const ga4 = new GA4Adapter(store, "test_id", "test_secret");

      store.saveConnection({
        tenantId,
        provider: "google_analytics_4",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
        accessToken: "test_token",
        propertyId: "properties/123456789",
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      // Mock successful Data API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          rows: [
            {
              metricValues: [
                { value: "25000" }, // sessions
                { value: "18000" }, // totalUsers
                { value: "750" },   // conversions
                { value: "2500000" } // userEngagementDurationSec
              ],
            },
          ],
        }),
      });

      const res = await ga4.fetchMetrics(tenantId);
      expect(res.isAvailable).toBe(true);
      expect(res.metrics.sessions).toBe(25000);
      expect(res.metrics.totalUsers).toBe(18000);
      expect(res.metrics.conversions).toBe(750);
      expect(res.metrics.conversionRatePct).toBe(3.0);
      expect(res.provenance.propertyOrAccount).toBe("properties/123456789");

      // Mock Data API 403 Forbidden error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      const errRes = await ga4.fetchMetrics(tenantId);
      expect(errRes.isAvailable).toBe(false);
      expect(errRes.limitations).toContain("Google Analytics Data API returned HTTP 403");
    });
  });

  // =========================================================================
  // 2. SHOPIFY CALLBACK AND FINANCIAL DATA SAFETY
  // =========================================================================
  describe("2. Shopify Callback & Financial Safety", () => {
    it("rejects OAuth callbacks when HMAC is missing or malformed in live flow", async () => {
      const shopify = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret", "2025-01");

      // 1. Missing HMAC parameter
      const missingHmacRes = await shopify.handleCallback({
        tenantId,
        shopDomain: "store.myshopify.com",
        code: "live_auth_code_123",
        queryParams: { code: "live_auth_code_123", shop: "store.myshopify.com" },
      });
      expect(missingHmacRes.success).toBe(false);
      expect(missingHmacRes.error).toContain("Missing required HMAC signature");

      // 2. Invalid / tampered HMAC
      const tamperedHmacRes = await shopify.handleCallback({
        tenantId,
        shopDomain: "store.myshopify.com",
        code: "live_auth_code_123",
        queryParams: {
          code: "live_auth_code_123",
          shop: "store.myshopify.com",
          hmac: "tampered_invalid_hmac_hex",
        },
      });
      expect(tamperedHmacRes.success).toBe(false);
      expect(tamperedHmacRes.error).toContain("Shopify OAuth HMAC signature verification failed");

      // 3. Isolated mock token path succeeds without HMAC for test contracts
      const mockRes = await shopify.handleCallback({
        tenantId,
        shopDomain: "store.myshopify.com",
        code: "mock_code",
        mockTokens: { accessToken: "shpat_mock_123", shopDomain: "store.myshopify.com" },
      });
      expect(mockRes.success).toBe(true);
    });

    it("paginates order retrieval completely across defined 30-day reporting window", async () => {
      const shopify = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret", "2025-01");

      store.saveConnection({
        tenantId,
        provider: "commerce_shopify",
        status: "CONNECTED",
        scopes: ["read_orders", "read_products"],
        accessToken: "shpat_test_token",
        accountId: "test-store.myshopify.com",
      });

      // Mock Shop API and paginated Orders API
      const page1Orders = [
        { id: 101, total_price: "100.00", currency: "USD", financial_status: "paid" },
        { id: 102, total_price: "50.00", currency: "USD", financial_status: "paid" },
      ];
      const page2Orders = [
        { id: 103, total_price: "150.00", currency: "USD", financial_status: "paid" },
        { id: 104, total_price: "75.00", currency: "USD", financial_status: "pending" }, // unpaid
      ];

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/shop.json")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ shop: { currency: "USD", name: "Test Store" } }),
          };
        }
        callCount++;
        if (callCount === 1) {
          // Page 1 returns Link header pointing to page 2
          return {
            ok: true,
            status: 200,
            headers: new Headers({
              Link: '<https://test-store.myshopify.com/admin/api/2025-01/orders.json?page_info=cursor_page_2>; rel="next"',
            }),
            json: async () => ({ orders: page1Orders }),
          };
        } else {
          // Page 2 has no next Link header
          return {
            ok: true,
            status: 200,
            headers: new Headers({}),
            json: async () => ({ orders: page2Orders }),
          };
        }
      });

      const metrics = await shopify.fetchMetrics(tenantId);
      expect(metrics.isAvailable).toBe(true);
      expect(metrics.metrics.totalOrders).toBe(4);
      expect(metrics.metrics.paidOrdersCount).toBe(3);
      expect(metrics.metrics.grossMerchandiseValue).toBe(300); // 100 + 50 + 150
      expect(metrics.metrics.averageOrderValue).toBe(100); // 300 / 3
      expect(metrics.metrics.currency).toBe("USD");
      expect(metrics.metrics.pagesRetrieved).toBe(2);
      expect(metrics.metrics.paginationComplete).toBe(true);
      expect(metrics.provenance.source).toContain("2025-01");
    });

    it("validates store currency and enforces zero customer PII", async () => {
      const shopify = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret", "2025-01");

      store.saveConnection({
        tenantId,
        provider: "commerce_shopify",
        status: "CONNECTED",
        scopes: ["read_orders", "read_products"],
        accessToken: "shpat_test_token",
        accountId: "uk-store.myshopify.com",
      });

      let requestedFields = "";
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/shop.json")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ shop: { currency: "GBP", name: "UK Merchant" } }),
          };
        }
        requestedFields = url;
        return {
          ok: true,
          status: 200,
          headers: new Headers({}),
          json: async () => ({
            orders: [
              { id: 201, total_price: "45.00", currency: "GBP", financial_status: "paid" },
            ],
          }),
        };
      });

      const metrics = await shopify.fetchMetrics(tenantId);
      expect(metrics.isAvailable).toBe(true);
      expect(metrics.metrics.currency).toBe("GBP");

      // Verify URL fields query only requests financial aggregates and strictly no customer PII
      expect(requestedFields).toContain("fields=id,total_price,currency,financial_status,created_at");
      expect(requestedFields).not.toContain("customer");
      expect(requestedFields).not.toContain("email");
      expect(requestedFields).not.toContain("address");
      expect(requestedFields).not.toContain("phone");
    });
  });

  // =========================================================================
  // 3. TRUTHFUL PROVIDER AVAILABILITY TESTS
  // =========================================================================
  describe("3. Truthful Provider Availability & Cost of Inaction Guard", () => {
    it("Google Ads: returns unavailable when developer token is missing or customer is unselected", async () => {
      delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
      const adsWithoutDevToken = new GoogleAdsAdapter(store, "test_id", "test_secret", undefined);

      store.saveConnection({
        tenantId,
        provider: "ads_google",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/adwords"],
        accessToken: "test_token",
      });

      const status = await adsWithoutDevToken.getConnectionStatus(tenantId);
      expect(status.statusMessage).toContain("GOOGLE_ADS_DEVELOPER_TOKEN");
      expect(status.status).toBe("NOT_CONFIGURED");

      const metrics = await adsWithoutDevToken.fetchMetrics(tenantId);
      expect(metrics.isAvailable).toBe(false);
      expect(metrics.limitations).toContain("Google Ads developer token (GOOGLE_ADS_DEVELOPER_TOKEN) is not configured");
    });

    it("Backlinks & SERP: returns unavailable when API key is missing and never reports fake metrics", async () => {
      const backlinks = new BacklinksSerpAdapter(store, undefined);

      store.saveConnection({
        tenantId,
        provider: "backlinks_serp",
        status: "CONNECTED",
        scopes: ["serp_read"],
      });

      const metrics = await backlinks.fetchMetrics(tenantId, "example.com");
      expect(metrics.isAvailable).toBe(false);
      expect(metrics.limitations).toContain("SERP_API_KEY / BACKLINK_API_KEY is not configured");
      expect(metrics.metrics).toEqual({});
    });

    it("Cost of Inaction: unavailable providers never feed fabricated values into financial calculations", () => {
      // Simulating a scenario where GA4 is not connected, but someone passed unavailable mock wrappers
      const result = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: { targetUrl: "https://example.com" },
        connectedMetrics: {
          google_analytics_4: { isAvailable: false, metrics: { sessions: 100000 } },
          ads_google: { isAvailable: false, metrics: { monthlySpend: 50000 } },
          backlinks_serp: { isAvailable: false, metrics: { domainRating: 85 } },
        },
      });

      // Must be INSUFFICIENT_INPUTS because GA4 is isAvailable: false and owner provided no sessions
      expect(result.status).toBe("INSUFFICIENT_INPUTS");
      expect(result.assumptions).toContain("[Input Required] Financial opportunity modeling requires verified monthly session traffic counts.");
    });
  });

  // =========================================================================
  // 4. SEARCH CONSOLE DATE HANDLING & PROVENANCE
  // =========================================================================
  describe("4. Search Console Date Handling & Provenance", () => {
    it("calculates rolling 28-day reporting period accounting for 3-day data lag with controlled clock", () => {
      const controlledDate = new Date("2026-10-27T12:00:00Z");
      const range = calculateGscDateRange(controlledDate, 28);

      // 3 days lag from Oct 27 = Oct 24
      expect(range.endDate).toBe("2026-10-24");
      // 28 days before Oct 24 = Sep 26
      expect(range.startDate).toBe("2026-09-26");
    });

    it("includes rolling date range in provenance and flags metrics as acquisition context only", async () => {
      const gsc = new SearchConsoleAdapter(store, "test_id", "test_secret");

      store.saveConnection({
        tenantId,
        provider: "search_console",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        accessToken: "test_token",
        propertyId: "sc-domain:example.com",
      });

      const controlledClock = new Date("2026-10-27T12:00:00Z");
      const res = await gsc.fetchMetrics(tenantId, {
        referenceDate: controlledClock,
        mockOverride: { clicks: 1200, impressions: 34000 },
      });

      expect(res.isAvailable).toBe(true);
      expect(res.dateRange?.endDate).toBe("2026-10-24");
      expect(res.dateRange?.startDate).toBe("2026-09-26");
      expect(res.provenance.reportingPeriod).toEqual({
        startDate: "2026-09-26",
        endDate: "2026-10-24",
        lagDays: 3,
        windowDays: 28,
      });
      expect(res.metrics.isAcquisitionContextOnly).toBe(true);
    });
  });

  // =========================================================================
  // 5. DUAL-REPORT SYNCHRONIZATION & COMMERCIAL PRECEDENCE
  // =========================================================================
  describe("5. Dual-Report Synchronization & Commercial Precedence", () => {
    it("propagates verified Shopify currency to Cost of Inaction and maintains immutable projection snapshot", () => {
      const crawlResult: CrawlResult = {
        pages: [
          {
            url: "https://shop.example.co.uk",
            finalUrl: "https://shop.example.co.uk",
            statusCode: 200,
            loadTimeMs: 450,
            documentType: "html",
            html: "<html><head><title>Shop</title></head><body><h1>Welcome</h1></body></html>",
            title: "Shop",
            metaDescription: "E-commerce store",
            headings: { h1: ["Welcome"], h2: [] },
            canonicalUrl: "https://shop.example.co.uk",
            headers: {},
            openGraph: {},
            wordCount: 150,
            resourceCounts: { images: 2, scripts: 1, stylesheets: 1, forms: 1 },
            internalLinks: [],
            externalLinks: [],
            discoveredUrls: [],
          } as any,
        ],
        coverage: {
          coveragePercentage: 100,
          discoveredPages: 5,
          testedPages: 5,
          skippedPages: 0,
          failedPages: 0,
          inaccessiblePages: 0,
          totalBytesFetched: 50000,
          totalPagesBudget: 10,
          crawlDepthReached: 1,
          cappedByBudget: false,
          stopReason: "completed",
        } as any,
        sitemapUrls: [],
        externalLinksTested: [],
        discoveredPageUrls: ["https://shop.example.co.uk"],
      };

      const results: AssessmentResult[] = [];

      // Verified connected metrics from Shopify (GBP currency, £45 AOV)
      const connectedMetrics = {
        google_analytics_4: {
          isAvailable: true,
          metrics: { sessions: 20000, conversionRatePct: 2.2 },
          provenance: { propertyOrAccount: "properties/123456789" },
        },
        commerce_shopify: {
          isAvailable: true,
          metrics: { averageOrderValue: 45.0, currency: "GBP", paidOrdersCount: 440 },
          provenance: { propertyOrAccount: "uk-store.myshopify.com" },
        },
      };

      const sharedCostOfInaction = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: { targetUrl: "https://shop.example.co.uk" }, // No owner override
        results,
        connectedMetrics,
      });

      expect(sharedCostOfInaction.currency).toBe("GBP");
      expect(sharedCostOfInaction.inputSource).toContain("Verified Connected Data");

      const scanRequest = {
        targetUrl: "https://shop.example.co.uk",
        businessCategory: "ecommerce" as const,
      } as any;

      // Verify Owner Report projection uses identical snapshot
      const ownerReport = projectOwnerReport(
        "scan_sync_test",
        scanRequest,
        crawlResult,
        results,
        {
          costOfInaction: sharedCostOfInaction,
        }
      );
      expect(ownerReport.costOfInaction?.currency).toBe("GBP");
      expect(ownerReport.costOfInaction?.scenarios?.conservative.monthlyOpportunity).toBe(
        sharedCostOfInaction.scenarios?.conservative.monthlyOpportunity
      );

      // Verify Expert Report projection uses identical snapshot
      const expertReport = projectExpertReport(
        "scan_sync_test",
        scanRequest,
        crawlResult,
        results,
        {
          costOfInaction: sharedCostOfInaction,
          connectedMetrics,
        }
      );
      expect(expertReport.costOfInaction?.currency).toBe("GBP");
      expect(expertReport.costOfInaction?.scenarios?.conservative.monthlyOpportunity).toBe(
        sharedCostOfInaction.scenarios?.conservative.monthlyOpportunity
      );
    });
  });
});
