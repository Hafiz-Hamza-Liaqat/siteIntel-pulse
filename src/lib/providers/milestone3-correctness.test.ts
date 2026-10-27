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
      const shopify = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret", "2026-10");

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
            headers: new Headers({ "X-Shopify-API-Version": "2026-10" }),
            json: async () => ({ shop: { currency: "GBP", name: "UK Merchant" } }),
          };
        }
        requestedFields = url;
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "X-Shopify-API-Version": "2026-10" }),
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
      expect(metrics.provenance.source).toContain("2026-10");

      // Verify URL fields query only requests financial aggregates and strictly no customer PII
      expect(requestedFields).toContain("fields=id,total_price,currency,financial_status,created_at");
      expect(requestedFields).not.toContain("customer");
      expect(requestedFields).not.toContain("email");
      expect(requestedFields).not.toContain("address");
      expect(requestedFields).not.toContain("phone");
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
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/shop.json")) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "X-Shopify-API-Version": "2026-10" }),
            json: async () => ({ shop: { currency: "USD", name: "High Volume" } }),
          };
        }
        pagesServed++;
        return {
          ok: true,
          status: 200,
          headers: new Headers({
            "X-Shopify-API-Version": "2026-10",
            Link: `<https://high-volume.myshopify.com/admin/api/2026-10/orders.json?page_info=cursor_${pagesServed + 1}>; rel="next"`,
          }),
          json: async () => ({
            // 250 orders per page
            orders: Array.from({ length: 250 }, (_, i) => ({
              id: pagesServed * 1000 + i,
              total_price: "20.00",
              currency: "USD",
              financial_status: "paid",
            })),
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
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/shop.json")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ shop: { currency: "USD" } }),
          };
        }
        page++;
        if (page === 1) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({
              Link: '<https://test.myshopify.com/admin/api/2026-10/orders.json?page_info=c2>; rel="next"',
            }),
            json: async () => ({
              orders: [{ id: 1, total_price: "50.00", currency: "USD", financial_status: "paid" }],
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
      expect(res.limitations).toContain("Shopify Orders API returned HTTP 500 on page 2");
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

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/shop.json")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ shop: { currency: null, name: "No Currency Store" } }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({}),
          json: async () => ({
            orders: [
              { id: 10, total_price: "30.00", currency: null, financial_status: "paid" },
            ],
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

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/shop.json")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ shop: { currency: "USD", name: "Multi Currency" } }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({}),
          json: async () => ({
            orders: [
              { id: 10, total_price: "100.00", currency: "USD", financial_status: "paid" },
              { id: 11, total_price: "85.00", currency: "EUR", financial_status: "paid" }, // Different currency!
            ],
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
