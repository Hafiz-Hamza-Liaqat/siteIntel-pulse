import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
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
import { POST as googleAdsCustomerSelectionPost } from "@/app/api/providers/google-ads/customers/route";
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

    it("fails closed on GA4 property authorization when list is empty, API errors occur, or refresh fails", async () => {
      const ga4 = new GA4Adapter(store, "test_id", "test_secret");

      store.saveConnection({
        tenantId,
        provider: "google_analytics_4",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
        accessToken: "test_token",
        propertyId: undefined,
      });

      // 1. Upstream API failure returns 500: must fail closed and never authorize property
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const apiErrRes = await ga4.selectProperty(tenantId, "properties/123456789");
      expect(apiErrRes.success).toBe(false);
      expect(apiErrRes.error).toContain("Unable to verify property access");
      expect(store.getConnection(tenantId, "google_analytics_4")?.property_id || undefined).toBeUndefined();

      // 2. Empty properties list: must fail closed and never authorize property
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ accountSummaries: [] }),
      });

      const emptyRes = await ga4.selectProperty(tenantId, "properties/123456789");
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.error).toContain("No accessible Google Analytics properties found");
      expect(store.getConnection(tenantId, "google_analytics_4")?.property_id || undefined).toBeUndefined();

      // 3. Expired token with refresh failure: must fail closed and never authorize
      store.saveConnection({
        tenantId,
        provider: "google_analytics_4",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
        accessToken: "expired_token",
        refreshToken: "bad_refresh",
        tokenExpiresAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const refreshFailRes = await ga4.selectProperty(tenantId, "properties/123456789");
      expect(refreshFailRes.success).toBe(false);
      expect(refreshFailRes.error).toContain("Unable to verify property access");
      expect(store.getConnection(tenantId, "google_analytics_4")?.property_id || undefined).toBeUndefined();
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

    it("paginates order retrieval completely across defined 30-day reporting window via GraphQL Admin API", async () => {
      const shopify = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret", "2025-01");

      store.saveConnection({
        tenantId,
        provider: "commerce_shopify",
        status: "CONNECTED",
        scopes: ["read_orders", "read_products"],
        accessToken: "shpat_test_token",
        accountId: "test-store.myshopify.com",
      });

      // Mock Shop GraphQL API and paginated Orders GraphQL API
      const page1Nodes = [
        {
          id: "gid://shopify/Order/101",
          totalPriceSet: { shopMoney: { amount: "100.00", currencyCode: "USD" } },
          displayFinancialStatus: "PAID",
          createdAt: "2025-01-10T12:00:00Z",
        },
        {
          id: "gid://shopify/Order/102",
          totalPriceSet: { shopMoney: { amount: "50.00", currencyCode: "USD" } },
          displayFinancialStatus: "PAID",
          createdAt: "2025-01-11T12:00:00Z",
        },
      ];
      const page2Nodes = [
        {
          id: "gid://shopify/Order/103",
          totalPriceSet: { shopMoney: { amount: "150.00", currencyCode: "USD" } },
          displayFinancialStatus: "PAID",
          createdAt: "2025-01-12T12:00:00Z",
        },
        {
          id: "gid://shopify/Order/104",
          totalPriceSet: { shopMoney: { amount: "75.00", currencyCode: "USD" } },
          displayFinancialStatus: "PENDING", // unpaid
          createdAt: "2025-01-13T12:00:00Z",
        },
      ];

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        expect(url).toContain("/admin/api/2025-01/graphql.json");
        const body = JSON.parse((init?.body as string) || "{}");

        if (body.query?.includes("GetShopMetadata")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: {
                shop: { currencyCode: "USD", name: "Test Store", myshopifyDomain: "test-store.myshopify.com" },
              },
            }),
          };
        }

        callCount++;
        if (callCount === 1) {
          // Page 1 returns hasNextPage: true
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "X-Shopify-API-Version": "2025-01" }),
            json: async () => ({
              data: {
                orders: {
                  pageInfo: { hasNextPage: true, endCursor: "cursor_page_2" },
                  nodes: page1Nodes,
                },
              },
            }),
          };
        } else {
          // Page 2 has hasNextPage: false
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "X-Shopify-API-Version": "2025-01" }),
            json: async () => ({
              data: {
                orders: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: page2Nodes,
                },
              },
            }),
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
      expect(metrics.provenance.source).toContain("Shopify GraphQL Admin API 2025-01");
    });

    it("validates store currency and enforces zero customer PII in GraphQL queries", async () => {
      const shopify = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret", "2026-10");

      store.saveConnection({
        tenantId,
        provider: "commerce_shopify",
        status: "CONNECTED",
        scopes: ["read_orders", "read_products"],
        accessToken: "shpat_test_token",
        accountId: "uk-store.myshopify.com",
      });

      const executedQueries: string[] = [];
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        expect(url).toContain("/admin/api/2026-10/graphql.json");
        const body = JSON.parse((init?.body as string) || "{}");
        executedQueries.push(body.query || "");

        if (body.query?.includes("GetShopMetadata")) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "X-Shopify-API-Version": "2026-10" }),
            json: async () => ({
              data: {
                shop: { currencyCode: "GBP", name: "UK Merchant", myshopifyDomain: "uk-store.myshopify.com" },
              },
            }),
          };
        }

        return {
          ok: true,
          status: 200,
          headers: new Headers({ "X-Shopify-API-Version": "2026-10" }),
          json: async () => ({
            data: {
              orders: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [
                  {
                    id: "gid://shopify/Order/201",
                    totalPriceSet: { shopMoney: { amount: "45.00", currencyCode: "GBP" } },
                    displayFinancialStatus: "PAID",
                    createdAt: "2026-10-15T10:00:00Z",
                  },
                ],
              },
            },
          }),
        };
      });

      const metrics = await shopify.fetchMetrics(tenantId);
      expect(metrics.isAvailable).toBe(true);
      expect(metrics.metrics.currency).toBe("GBP");
      expect(metrics.provenance.source).toContain("Shopify GraphQL Admin API 2026-10");

      // Verify all GraphQL queries strictly omit customer PII
      for (const query of executedQueries) {
        expect(query).not.toContain("customer");
        expect(query).not.toContain("email");
        expect(query).not.toContain("shippingAddress");
        expect(query).not.toContain("billingAddress");
        expect(query).not.toContain("phone");
      }
    });

    it("Shopify: records served version mismatch when response header differs from requested", async () => {
      const shopify = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret", "2026-10");

      store.saveConnection({
        tenantId,
        provider: "commerce_shopify",
        status: "CONNECTED",
        scopes: ["read_orders", "read_products"],
        accessToken: "shpat_test_token",
        accountId: "version-test.myshopify.com",
      });

      global.fetch = vi.fn().mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "X-Shopify-API-Version": "2026-07" }), // Returned older version
          json: async () => ({
            data: {
              shop: { currencyCode: "USD", name: "Version Store" },
              orders: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [],
              },
            },
          }),
        };
      });

      const metrics = await shopify.fetchMetrics(tenantId);
      expect(metrics.isAvailable).toBe(true);
      expect(metrics.provenance.servedVersionMismatch).toEqual({
        requested: "2026-10",
        served: "2026-07",
      });
    });

    it("Shopify: safely handles large order volume (>2500 orders) and marks incomplete if pagination limit is reached", async () => {
      const shopify = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret", "2026-10");

      store.saveConnection({
        tenantId,
        provider: "commerce_shopify",
        status: "CONNECTED",
        scopes: ["read_orders", "read_products"],
        accessToken: "shpat_test_token",
        accountId: "high-volume.myshopify.com",
      });

      // Simulate infinite pagination that exceeds MAX_PAGES (40 pages = 10,000 orders)
      let pagesServed = 0;
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const body = JSON.parse((init?.body as string) || "{}");
        if (body.query?.includes("GetShopMetadata")) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "X-Shopify-API-Version": "2026-10" }),
            json: async () => ({ data: { shop: { currencyCode: "USD", name: "High Volume" } } }),
          };
        }
        pagesServed++;
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "X-Shopify-API-Version": "2026-10" }),
          json: async () => ({
            data: {
              orders: {
                pageInfo: { hasNextPage: true, endCursor: `cursor_${pagesServed + 1}` },
                nodes: Array.from({ length: 250 }, (_, i) => ({
                  id: `gid://shopify/Order/${pagesServed * 1000 + i}`,
                  totalPriceSet: { shopMoney: { amount: "20.00", currencyCode: "USD" } },
                  displayFinancialStatus: "PAID",
                })),
              },
            },
          }),
        };
      });

      const metrics = await shopify.fetchMetrics(tenantId);
      // Because pagination ceiling was reached with remaining pages, it must fail closed and NOT return partial figures as complete verified metrics
      expect(metrics.isAvailable).toBe(false);
      expect(metrics.metrics.paginationComplete).toBe(false);
      expect(metrics.metrics.isIncomplete).toBe(true);
      expect(metrics.metrics.pagesRetrieved).toBe(40);
      expect(metrics.metrics.totalOrders).toBe(10000);
      expect(metrics.limitations).toContain("exceeded maximum pagination limit");
    });

    it("Shopify: handles GraphQL API errors cleanly", async () => {
      const shopify = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret", "2026-10");

      store.saveConnection({
        tenantId,
        provider: "commerce_shopify",
        status: "CONNECTED",
        scopes: ["read_orders", "read_products"],
        accessToken: "shpat_test_token",
        accountId: "test.myshopify.com",
      });

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const body = JSON.parse((init?.body as string) || "{}");
        if (body.query?.includes("GetShopMetadata")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { shop: { currencyCode: "USD" } } }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            errors: [{ message: "Throttled: API rate limit exceeded" }],
          }),
        };
      });

      const res = await shopify.fetchMetrics(tenantId);
      expect(res.isAvailable).toBe(false);
      expect(res.limitations).toContain("Throttled: API rate limit exceeded");
    });

    it("Shopify: handles mid-pagination network/API errors cleanly", async () => {
      const shopify = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret", "2026-10");

      store.saveConnection({
        tenantId,
        provider: "commerce_shopify",
        status: "CONNECTED",
        scopes: ["read_orders", "read_products"],
        accessToken: "shpat_test_token",
        accountId: "test.myshopify.com",
      });

      let page = 0;
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const body = JSON.parse((init?.body as string) || "{}");
        if (body.query?.includes("GetShopMetadata")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { shop: { currencyCode: "USD" } } }),
          };
        }
        page++;
        if (page === 1) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: {
                orders: {
                  pageInfo: { hasNextPage: true, endCursor: "c2" },
                  nodes: [
                    {
                      id: "gid://shopify/Order/1",
                      totalPriceSet: { shopMoney: { amount: "50.00", currencyCode: "USD" } },
                      displayFinancialStatus: "PAID",
                    },
                  ],
                },
              },
            }),
          };
        }
        // Page 2 fails with 500
        return {
          ok: false,
          status: 500,
        };
      });

      const res = await shopify.fetchMetrics(tenantId);
      expect(res.isAvailable).toBe(false);
      expect(res.limitations).toContain("Shopify Orders GraphQL API returned HTTP 500 on page 2");
    });

    it("Shopify: refuses silent USD fallback when currency cannot be established", async () => {
      const shopify = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret", "2026-10");

      store.saveConnection({
        tenantId,
        provider: "commerce_shopify",
        status: "CONNECTED",
        scopes: ["read_orders", "read_products"],
        accessToken: "shpat_test_token",
        accountId: "unspecified-currency.myshopify.com",
      });

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const body = JSON.parse((init?.body as string) || "{}");
        if (body.query?.includes("GetShopMetadata")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { shop: { currencyCode: null, name: "No Currency Store" } } }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              orders: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [
                  {
                    id: "gid://shopify/Order/10",
                    totalPriceSet: { shopMoney: { amount: "30.00", currencyCode: null } },
                    displayFinancialStatus: "PAID",
                  },
                ],
              },
            },
          }),
        };
      });

      const res = await shopify.fetchMetrics(tenantId);
      expect(res.isAvailable).toBe(false);
      expect(res.limitations).toContain("Shopify store currency could not be established");
    });

    it("Shopify: rejects summing mixed/conflicting order currencies as a single amount", async () => {
      const shopify = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret", "2026-10");

      store.saveConnection({
        tenantId,
        provider: "commerce_shopify",
        status: "CONNECTED",
        scopes: ["read_orders", "read_products"],
        accessToken: "shpat_test_token",
        accountId: "multi-currency.myshopify.com",
      });

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        const body = JSON.parse((init?.body as string) || "{}");
        if (body.query?.includes("GetShopMetadata")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { shop: { currencyCode: "USD", name: "Multi Currency" } } }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              orders: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [
                  {
                    id: "gid://shopify/Order/10",
                    totalPriceSet: { shopMoney: { amount: "100.00", currencyCode: "USD" } },
                    displayFinancialStatus: "PAID",
                  },
                  {
                    id: "gid://shopify/Order/11",
                    totalPriceSet: { shopMoney: { amount: "85.00", currencyCode: "EUR" } }, // Different currency!
                    displayFinancialStatus: "PAID",
                  },
                ],
              },
            },
          }),
        };
      });

      const res = await shopify.fetchMetrics(tenantId);
      expect(res.isAvailable).toBe(false);
      expect(res.limitations).toContain("Multiple conflicting order currencies detected (USD, EUR)");
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

    it("Google Ads: auto-selects only on single account; requires selection on multiple; handles zero accounts", async () => {
      const ads = new GoogleAdsAdapter(store, "test_id", "test_secret", "test_dev_token", "v26");

      // 1. Single account discovered: auto-selects
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/token")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: "mock_acc", refresh_token: "mock_ref", expires_in: 3600 }),
          };
        }
        if (url.includes("/customers:listAccessibleCustomers")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ resourceNames: ["customers/111-222-3333"] }),
          };
        }
        return { ok: false, status: 404 };
      });

      const singleRes = await ads.handleCallback({
        tenantId,
        code: "auth_code_1",
        redirectUri: "https://example.com/callback",
      });
      expect(singleRes.success).toBe(true);
      expect(singleRes.customerId).toBe("customers/111-222-3333");
      expect(store.getConnection(tenantId, "ads_google")?.account_id).toBe("customers/111-222-3333");

      // 2. Multiple accounts discovered: leaves unselected so tenant must choose
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/token")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: "mock_acc_multi", refresh_token: "mock_ref", expires_in: 3600 }),
          };
        }
        if (url.includes("/customers:listAccessibleCustomers")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              resourceNames: ["customers/111-222-3333", "customers/444-555-6666"],
            }),
          };
        }
        if (url.includes("/customers/4445556666/googleAds:search")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [
                {
                  customer: {
                    id: 4445556666,
                    descriptiveName: "Acme Advertiser Direct",
                    manager: false,
                  },
                },
              ],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const multiRes = await ads.handleCallback({
        tenantId,
        code: "auth_code_2",
        redirectUri: "https://example.com/callback",
      });
      expect(multiRes.success).toBe(true);
      expect(multiRes.customerId).toBeUndefined();
      expect(store.getConnection(tenantId, "ads_google")?.account_id || undefined).toBeUndefined();

      const degradedStatus = await ads.getConnectionStatus(tenantId);
      expect(degradedStatus.healthStatus).toBe("DEGRADED");
      expect(degradedStatus.statusMessage).toContain("Customer account selection required");

      // 3. Selection fails closed if customer is not in accessible list
      const selectInvalid = await ads.selectCustomer(tenantId, "customers/999-999-9999");
      expect(selectInvalid.success).toBe(false);
      expect(selectInvalid.error).toContain("is not accessible by the authenticated Google Ads user");

      // 4. Selection succeeds for accessible customer
      const selectValid = await ads.selectCustomer(tenantId, "444-555-6666"); // normalizes to customers/444-555-6666
      expect(selectValid.success).toBe(true);
      expect(selectValid.customerId).toBe("customers/444-555-6666");
      expect(store.getConnection(tenantId, "ads_google")?.account_id).toBe("customers/444-555-6666");
    });

    it("Google Ads: rejects invalid API version format and handles token refresh failure", async () => {
      // Invalid version format
      const badVersionAds = new GoogleAdsAdapter(store, "test_id", "test_secret", "test_dev_token", "invalid_ver");

      store.saveConnection({
        tenantId,
        provider: "ads_google",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/adwords"],
        accessToken: "valid_token",
        accountId: "customers/111-222-3333",
      });

      const listRes = await badVersionAds.listAccessibleCustomers(tenantId);
      expect(listRes.success).toBe(false);
      expect(listRes.error).toContain("Unsupported Google Ads API version");

      const metricRes = await badVersionAds.fetchMetrics(tenantId);
      expect(metricRes.isAvailable).toBe(false);
      expect(metricRes.limitations).toContain("Unsupported Google Ads API version");

      // Valid version v26, but token expired and refresh fails
      const adsV26 = new GoogleAdsAdapter(store, "test_id", "test_secret", "test_dev_token", "v26");
      store.saveConnection({
        tenantId,
        provider: "ads_google",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/adwords"],
        accessToken: "expired_token",
        refreshToken: "bad_refresh",
        accountId: "customers/111-222-3333",
        tokenExpiresAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });

      const refreshFailRes = await adsV26.fetchMetrics(tenantId);
      expect(refreshFailRes.isAvailable).toBe(false);
      expect(refreshFailRes.limitations).toContain("Access token expired and refresh failed");
    });

    it("Google Ads: queries v26 search endpoint and produces accurate metrics and provenance", async () => {
      const ads = new GoogleAdsAdapter(store, "test_id", "test_secret", "test_dev_token", "v26");

      store.saveConnection({
        tenantId,
        provider: "ads_google",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/adwords"],
        accessToken: "valid_token",
        accountId: "customers/123-456-7890",
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      let requestedUrl = "";
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        requestedUrl = url;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [
              {
                metrics: {
                  costMicros: "1500000000", // $1500.00
                  impressions: "45000",
                  clicks: "1200",
                  conversions: "85",
                },
              },
            ],
          }),
        };
      });

      const res = await ads.fetchMetrics(tenantId);
      expect(res.isAvailable).toBe(true);
      expect(requestedUrl).toContain("https://googleads.googleapis.com/v26/customers/123-456-7890/googleAds:search");
      expect(res.metrics.monthlySpend).toBe(1500);
      expect(res.metrics.paidClicks).toBe(1200);
      expect(res.metrics.paidImpressions).toBe(45000);
      expect(res.metrics.conversions).toBe(85);
      expect(res.metrics.averageCpc).toBe(1.25);
      expect(res.metrics.isAcquisitionContextOnly).toBe(true);
      expect(res.provenance.source).toContain("Google Ads API v26 (Live Search)");
      expect(res.provenance.propertyOrAccount).toBe("customers/123-456-7890");
    });

    it("Google Ads: direct account access strictly omits login-customer-id header", async () => {
      const ads = new GoogleAdsAdapter(store, "test_id", "test_secret", "test_dev_token", "v26");

      store.saveConnection({
        tenantId,
        provider: "ads_google",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/adwords"],
        accessToken: "valid_token",
        accountId: "customers/123-456-7890",
        metadata: { isDirect: true },
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      let capturedHeaders: HeadersInit | undefined;
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        capturedHeaders = init?.headers;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{ metrics: { costMicros: "500000000", impressions: "1000", clicks: "100", conversions: "5" } }],
          }),
        };
      });

      const res = await ads.fetchMetrics(tenantId);
      expect(res.isAvailable).toBe(true);
      expect((capturedHeaders as Record<string, string>)["login-customer-id"]).toBeUndefined();
      expect(res.provenance.propertyOrAccount).toBe("customers/123-456-7890");
    });

    it("Google Ads: manager-to-client access (MCC) sends manager account ID in login-customer-id header", async () => {
      const ads = new GoogleAdsAdapter(store, "test_id", "test_secret", "test_dev_token", "v26");

      store.saveConnection({
        tenantId,
        provider: "ads_google",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/adwords"],
        accessToken: "valid_token",
        accountId: "customers/123-456-7890",
        metadata: { managerCustomerId: "customers/987-654-3210", isDirect: false },
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      let capturedHeaders: HeadersInit | undefined;
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        capturedHeaders = init?.headers;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{ metrics: { costMicros: "500000000", impressions: "1000", clicks: "100", conversions: "5" } }],
          }),
        };
      });

      const res = await ads.fetchMetrics(tenantId);
      expect(res.isAvailable).toBe(true);
      // Assert login-customer-id header contains manager ID digits, NOT client ID
      expect((capturedHeaders as Record<string, string>)["login-customer-id"]).toBe("9876543210");
      expect(res.provenance.propertyOrAccount).toContain("via MCC customers/987-654-3210");
    });

    it("Google Ads: customer selection under manager validates accessibility and child hierarchy", async () => {
      const ads = new GoogleAdsAdapter(store, "test_id", "test_secret", "test_dev_token", "v26");

      store.saveConnection({
        tenantId,
        provider: "ads_google",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/adwords"],
        accessToken: "valid_token",
      });

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes("/customers:listAccessibleCustomers")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ resourceNames: ["customers/987-654-3210"] }),
          };
        }
        if (url.includes("/customers/9876543210/googleAds:search")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [
                {
                  customerClient: {
                    clientCustomer: "customers/123-456-7890",
                    id: 1234567890,
                    descriptiveName: "Client Operating Account",
                    manager: false,
                    status: "ENABLED",
                  },
                },
                {
                  customerClient: {
                    clientCustomer: "customers/555-555-5555",
                    id: 5555555555,
                    descriptiveName: "Sub Manager Account",
                    manager: true,
                    status: "ENABLED",
                  },
                },
              ],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      // 1. Success selecting valid child client account under manager
      const successRes = await ads.selectCustomer(tenantId, "customers/123-456-7890", {
        managerCustomerId: "customers/987-654-3210",
      });
      expect(successRes.success).toBe(true);
      expect(successRes.customerId).toBe("customers/123-456-7890");
      expect(successRes.managerCustomerId).toBe("customers/987-654-3210");

      const status = await ads.getConnectionStatus(tenantId);
      expect(status.statusMessage).toContain("via Manager (customers/987-654-3210)");

      // 2. Fails when selecting a sub-manager account as advertiser account
      const managerChildRes = await ads.selectCustomer(tenantId, "customers/555-555-5555", {
        managerCustomerId: "customers/987-654-3210",
      });
      expect(managerChildRes.success).toBe(false);
      expect(managerChildRes.error).toContain("is a manager account");

      // 3. Fails when selecting non-existent child under manager
      const nonChildRes = await ads.selectCustomer(tenantId, "customers/000-000-0000", {
        managerCustomerId: "customers/987-654-3210",
      });
      expect(nonChildRes.success).toBe(false);
      expect(nonChildRes.error).toContain("is not accessible under manager account");

      // 4. Fails when manager account is not in accessible accounts
      const invalidManagerRes = await ads.selectCustomer(tenantId, "customers/123-456-7890", {
        managerCustomerId: "customers/111-111-1111",
      });
      expect(invalidManagerRes.success).toBe(false);
      expect(invalidManagerRes.error).toContain("Manager account \"customers/111-111-1111\" is not accessible");
    });

    it("Google Ads: prevents manager account from being mistaken for advertiser account with clear explanation", async () => {
      const ads = new GoogleAdsAdapter(store, "test_id", "test_secret", "test_dev_token", "v26");

      store.saveConnection({
        tenantId,
        provider: "ads_google",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/adwords"],
        accessToken: "valid_token",
      });

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes("/customers:listAccessibleCustomers")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ resourceNames: ["customers/987-654-3210"] }),
          };
        }
        if (url.includes("/customers/9876543210/googleAds:search")) {
          const body = JSON.parse((init?.body as string) || "{}");
          if (body.query?.includes("customer.manager")) {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                results: [
                  {
                    customer: {
                      id: 9876543210,
                      descriptiveName: "Agency MCC",
                      manager: true,
                    },
                  },
                ],
              }),
            };
          }
        }
        return { ok: false, status: 404 };
      });

      const res = await ads.selectCustomer(tenantId, "customers/987-654-3210");
      expect(res.success).toBe(false);
      expect(res.error).toContain("is a Google Ads Manager (MCC) account");
      expect(res.error).toContain("Manager accounts do not serve ads or hold campaign spend directly");
    });

    it("Google Ads: preserves manager metadata on token refresh and sends unhyphenated manager login-customer-id", async () => {
      const ads = new GoogleAdsAdapter(store, "test_id", "test_secret", "test_dev_token", "v26");

      // 1. Initial connection with manager selection
      store.saveConnection({
        tenantId,
        provider: "ads_google",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/adwords"],
        accessToken: "expired_token_1",
        refreshToken: "valid_refresh_token_1",
        accountId: "customers/123-456-7890",
        tokenExpiresAt: new Date(Date.now() - 3600 * 1000).toISOString(), // expired
        metadata: {
          managerCustomerId: "customers/987-654-3210",
          isDirect: false,
          customLabel: "Agency MCC Flow",
        },
      });

      let tokenRefreshCalled = false;
      let capturedSearchHeaders: Record<string, string> | undefined;

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes("oauth2.googleapis.com/token")) {
          tokenRefreshCalled = true;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: "refreshed_access_token_999",
              refresh_token: "valid_refresh_token_1",
              expires_in: 3600,
            }),
          };
        }

        if (url.includes("/customers/123-456-7890/googleAds:search") || url.includes("/customers/1234567890/googleAds:search")) {
          capturedSearchHeaders = init?.headers as Record<string, string>;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [
                {
                  metrics: {
                    costMicros: "2500000000",
                    impressions: "50000",
                    clicks: "2500",
                    conversions: "120",
                  },
                },
              ],
            }),
          };
        }

        return { ok: false, status: 404 };
      });

      // 2. Call fetchMetrics which triggers refreshAccessToken internally
      const metricsRes = await ads.fetchMetrics(tenantId);
      expect(metricsRes.isAvailable).toBe(true);
      expect(tokenRefreshCalled).toBe(true);

      // 3. Verify reporting request header sends manager customer ID digits without hyphens
      expect(capturedSearchHeaders).toBeDefined();
      expect(capturedSearchHeaders!["login-customer-id"]).toBe("9876543210");
      expect(metricsRes.provenance.propertyOrAccount).toContain("via MCC customers/987-654-3210");

      // 4. Verify database record still preserves all metadata after upsert
      const conn = store.getConnection(tenantId, "ads_google");
      expect(conn).not.toBeNull();
      const meta = JSON.parse(conn!.metadata_json || "{}");
      expect(meta.managerCustomerId).toBe("customers/987-654-3210");
      expect(meta.isDirect).toBe(false);
      expect(meta.customLabel).toBe("Agency MCC Flow");

      // 5. Verify getConnectionStatus still reports manager account connection
      const status = await ads.getConnectionStatus(tenantId);
      expect(status.managerCustomerId).toBe("customers/987-654-3210");
      expect(status.statusMessage).toContain("via Manager (customers/987-654-3210)");
    });

    it("Google Ads: direct-account verification strictly requires customer.manager === false, rejects missing/null/non-boolean/manager, and does not persist unverified accounts", async () => {
      const ads = new GoogleAdsAdapter(store, "test_id", "test_secret", "test_dev_token", "v26");

      store.saveConnection({
        tenantId,
        provider: "ads_google",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/adwords"],
        accessToken: "valid_token",
      });

      const accessibleCustomersMock = {
        ok: true,
        status: 200,
        json: async () => ({ resourceNames: ["customers/123-456-7890"] }),
      };

      // 1. HTTP 500 error fails closed and does not persist
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/customers:listAccessibleCustomers")) return accessibleCustomersMock;
        if (url.includes("/customers/1234567890/googleAds:search")) return { ok: false, status: 500 };
        return { ok: false, status: 404 };
      });

      const httpErrRes = await ads.selectCustomer(tenantId, "customers/123-456-7890");
      expect(httpErrRes.success).toBe(false);
      expect(httpErrRes.error).toContain("Upstream Google Ads API returned HTTP 500 while verifying account type");
      expect(store.getConnection(tenantId, "ads_google")?.account_id).toBeNull();

      // 2. Network error fails closed and does not persist
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/customers:listAccessibleCustomers")) return accessibleCustomersMock;
        if (url.includes("/customers/1234567890/googleAds:search")) {
          throw new Error("ETIMEDOUT: Connection reset by peer");
        }
        return { ok: false, status: 404 };
      });

      const netErrRes = await ads.selectCustomer(tenantId, "customers/123-456-7890");
      expect(netErrRes.success).toBe(false);
      expect(netErrRes.error).toContain("Network error verifying account type");
      expect(store.getConnection(tenantId, "ads_google")?.account_id).toBeNull();

      // 3. Empty results array fails closed and does not persist
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/customers:listAccessibleCustomers")) return accessibleCustomersMock;
        if (url.includes("/customers/1234567890/googleAds:search")) {
          return { ok: true, status: 200, json: async () => ({ results: [] }) };
        }
        return { ok: false, status: 404 };
      });

      const emptyRes = await ads.selectCustomer(tenantId, "customers/123-456-7890");
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.error).toContain("indeterminate or malformed response");
      expect(store.getConnection(tenantId, "ads_google")?.account_id).toBeNull();

      // 4. Malformed results (missing customer object) fails closed and does not persist
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/customers:listAccessibleCustomers")) return accessibleCustomersMock;
        if (url.includes("/customers/1234567890/googleAds:search")) {
          return { ok: true, status: 200, json: async () => ({ results: [{ otherField: true }] }) };
        }
        return { ok: false, status: 404 };
      });

      const malformedRes = await ads.selectCustomer(tenantId, "customers/123-456-7890");
      expect(malformedRes.success).toBe(false);
      expect(malformedRes.error).toContain("indeterminate or malformed response");
      expect(store.getConnection(tenantId, "ads_google")?.account_id).toBeNull();

      // 5. Manager account (customer.manager === true) is rejected and not persisted
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/customers:listAccessibleCustomers")) return accessibleCustomersMock;
        if (url.includes("/customers/1234567890/googleAds:search")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [{ customer: { id: 1234567890, descriptiveName: "Agency MCC", manager: true } }],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const mgrRes = await ads.selectCustomer(tenantId, "customers/123-456-7890");
      expect(mgrRes.success).toBe(false);
      expect(mgrRes.error).toContain("is a Google Ads Manager (MCC) account");
      expect(mgrRes.error).toContain("Manager accounts do not serve ads");
      expect(store.getConnection(tenantId, "ads_google")?.account_id).toBeNull();

      // 6. Missing customer.manager property is rejected as indeterminate and not persisted
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/customers:listAccessibleCustomers")) return accessibleCustomersMock;
        if (url.includes("/customers/1234567890/googleAds:search")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [{ customer: { id: 1234567890, descriptiveName: "Missing Field Co" } }],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const missingRes = await ads.selectCustomer(tenantId, "customers/123-456-7890");
      expect(missingRes.success).toBe(false);
      expect(missingRes.error).toContain("indeterminate account type");
      expect(missingRes.error).toContain("missing");
      expect(store.getConnection(tenantId, "ads_google")?.account_id).toBeNull();

      // 7. customer.manager === null is rejected as indeterminate and not persisted
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/customers:listAccessibleCustomers")) return accessibleCustomersMock;
        if (url.includes("/customers/1234567890/googleAds:search")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [{ customer: { id: 1234567890, descriptiveName: "Null Field Co", manager: null } }],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const nullRes = await ads.selectCustomer(tenantId, "customers/123-456-7890");
      expect(nullRes.success).toBe(false);
      expect(nullRes.error).toContain("indeterminate account type");
      expect(nullRes.error).toContain("null");
      expect(store.getConnection(tenantId, "ads_google")?.account_id).toBeNull();

      // 8. Non-boolean string customer.manager === "false" is rejected and not persisted
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/customers:listAccessibleCustomers")) return accessibleCustomersMock;
        if (url.includes("/customers/1234567890/googleAds:search")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [{ customer: { id: 1234567890, descriptiveName: "String Field Co", manager: "false" } }],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const strRes = await ads.selectCustomer(tenantId, "customers/123-456-7890");
      expect(strRes.success).toBe(false);
      expect(strRes.error).toContain("indeterminate account type");
      expect(strRes.error).toContain("non-boolean");
      expect(store.getConnection(tenantId, "ads_google")?.account_id).toBeNull();

      // 9. Non-boolean number customer.manager === 0 is rejected and not persisted
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/customers:listAccessibleCustomers")) return accessibleCustomersMock;
        if (url.includes("/customers/1234567890/googleAds:search")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [{ customer: { id: 1234567890, descriptiveName: "Zero Field Co", manager: 0 } }],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const numRes = await ads.selectCustomer(tenantId, "customers/123-456-7890");
      expect(numRes.success).toBe(false);
      expect(numRes.error).toContain("indeterminate account type");
      expect(numRes.error).toContain("non-boolean");
      expect(store.getConnection(tenantId, "ads_google")?.account_id).toBeNull();

      // 10. Explicit customer.manager === false is accepted, persisted, and omits login-customer-id
      let searchHeaders: Record<string, string> | undefined;
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes("/customers:listAccessibleCustomers")) return accessibleCustomersMock;
        if (url.includes("/customers/1234567890/googleAds:search") || url.includes("/customers/123-456-7890/googleAds:search")) {
          searchHeaders = init?.headers as Record<string, string>;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [
                {
                  customer: {
                    id: 1234567890,
                    descriptiveName: "Direct Advertiser Corp",
                    manager: false,
                  },
                  metrics: {
                    costMicros: "1000000000",
                    impressions: "10000",
                    clicks: "500",
                    conversions: "20",
                  },
                },
              ],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const verifiedRes = await ads.selectCustomer(tenantId, "customers/123-456-7890");
      expect(verifiedRes.success).toBe(true);
      expect(verifiedRes.customerId).toBe("customers/123-456-7890");

      // Verify connection is properly persisted
      const persistedConn = store.getConnection(tenantId, "ads_google");
      expect(persistedConn?.account_id).toBe("customers/123-456-7890");
      const meta = JSON.parse(persistedConn?.metadata_json || "{}");
      expect(meta.isDirect).toBe(true);
      expect(meta.managerCustomerId).toBeNull();

      // Fetch metrics and confirm login-customer-id header is strictly omitted on direct access
      const metrics = await ads.fetchMetrics(tenantId);
      expect(metrics.isAvailable).toBe(true);
      expect(searchHeaders).toBeDefined();
      expect(searchHeaders!["login-customer-id"]).toBeUndefined();
      expect(metrics.provenance.propertyOrAccount).toBe("customers/123-456-7890");
    });

    it("Google Ads: customer selection API route ignores client-supplied bypass options and enforces verification", async () => {
      // Seed session and connection for tenant_comp_a
      const authService = adapter.getAuthService();
      const session = authService.createSession("usr_companya_admin", tenantId);

      store.saveConnection({
        tenantId,
        provider: "ads_google",
        status: "CONNECTED",
        scopes: ["https://www.googleapis.com/auth/adwords"],
        accessToken: "valid_token",
      });

      // Mock accessible customers
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/customers:listAccessibleCustomers")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ resourceNames: ["customers/123-456-7890"] }),
          };
        }
        if (url.includes("/customers/1234567890/googleAds:search")) {
          // Upstream returns indeterminate (manager: null)
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [{ customer: { id: 1234567890, descriptiveName: "Test Co", manager: null } }],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      // Attempt to bypass verification via malicious request body properties
      const maliciousReq = new NextRequest("http://localhost:3000/api/providers/google-ads/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: "customers/123-456-7890",
          skipVerification: true,
          mockAccountType: "advertiser",
          mockOverride: { skipVerification: true },
        }),
      });

      const res = await googleAdsCustomerSelectionPost(maliciousReq);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("indeterminate account type");
      // Confirm account was not persisted
      expect(store.getConnection(tenantId, "ads_google")?.account_id).toBeNull();
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

    it("Backlinks & SERP: truthfully reports SERP search index capability and leaves backlink profile undefined", async () => {
      const backlinks = new BacklinksSerpAdapter(store, "test_serp_key");

      store.saveConnection({
        tenantId,
        provider: "backlinks_serp",
        status: "CONNECTED",
        scopes: ["serp_read"],
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          search_information: { total_results: 1420 },
          organic_results: [
            { position: 1, title: "Example Home", link: "https://example.com" },
            { position: 2, title: "Example About", link: "https://example.com/about" },
          ],
        }),
      });

      const res = await backlinks.fetchMetrics(tenantId, "https://example.com");
      expect(res.isAvailable).toBe(true);
      expect(res.metrics.indexedPagesEstimate).toBe(1420);
      expect(res.metrics.organicRankingsCount).toBe(2);
      expect(res.metrics.topRankingUrl).toBe("https://example.com");
      expect(res.metrics.referringDomains).toBeUndefined();
      expect(res.metrics.backlinksCount).toBeUndefined();
      expect(res.metrics.capabilityScope).toBe("SERP_SEARCH_INDEX_ONLY");
      expect(res.metrics.isAcquisitionContextOnly).toBe(true);
      expect(res.provenance.note).toContain("Verified SERP search index intelligence only");
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

    it("Cost of Inaction: refuses incomplete or currency-conflicted Shopify data as verified inputs", () => {
      // 1. Incomplete Shopify pagination: must fall back to illustrative baseline with clear notice
      const incompleteShopifyResult = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: { targetUrl: "https://example.com", monthlySessions: 10000 },
        connectedMetrics: {
          commerce_shopify: {
            isAvailable: false,
            metrics: {
              averageOrderValue: 120.0,
              currency: "USD",
              paginationComplete: false,
              isIncomplete: true,
            },
          },
        },
      });

      expect(incompleteShopifyResult.status).toBe("ESTIMATED");
      expect(incompleteShopifyResult.inputsProvided.averageOrderValue).toBe(85); // Uses illustrative baseline default
      expect(incompleteShopifyResult.assumptions.some(a => a.includes("connected Shopify data is incomplete or unavailable"))).toBe(true);

      // 2. Conflicting currency: owner requested EUR, Shopify is GBP
      const currencyConflictResult = calculateCostOfInaction({
        businessCategory: "ecommerce",
        request: { targetUrl: "https://example.com", monthlySessions: 10000, currency: "EUR" },
        connectedMetrics: {
          commerce_shopify: {
            isAvailable: true,
            metrics: {
              averageOrderValue: 95.0,
              currency: "GBP", // Mismatch with requested EUR
              paginationComplete: true,
            },
          },
        },
      });

      expect(currencyConflictResult.currency).toBe("EUR");
      expect(currencyConflictResult.assumptions.some(a => a.includes("baseline assumed because owner did not specify AOV"))).toBe(true);
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
