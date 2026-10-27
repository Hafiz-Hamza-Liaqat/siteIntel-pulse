import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { SqliteScanDatabaseAdapter } from "../persistence/db";
import { runMigrations } from "../persistence/migrator";
import { seedInitialAccounts } from "../auth/seed";
import { integrationsManager } from "./analytics";
import { OAuthStateManager } from "./oauth-manager";
import { ProviderConnectionStore } from "./connection-store";
import { ShopifyCommerceAdapter } from "./shopify-adapter";
import { GA4Adapter } from "./ga4-adapter";
import { calculateCostOfInaction } from "../reports/cost-of-inaction";
import { projectOwnerReport } from "../reports/owner-projection";
import { projectExpertReport } from "../reports/expert-projection";
import { CrawlResult, AssessmentResult, ScanRequest } from "@/types";

// Import Next.js route handlers
import { POST as connectHandler } from "@/app/api/providers/connect/route";
import { GET as callbackHandler } from "@/app/api/providers/callback/route";
import { POST as disconnectHandler } from "@/app/api/providers/disconnect/route";
import { GET as statusHandler } from "@/app/api/providers/status/route";
import { GET as metricsHandler } from "@/app/api/providers/metrics/route";

describe("Milestone 3: OAuth Callback Routing & Security Verification", () => {
  let adapter: SqliteScanDatabaseAdapter;
  let tokenTenantA: string;
  let tokenTenantB: string;
  const tenantAId = "tenant_comp_a";
  const tenantBId = "tenant_comp_b";

  beforeEach(() => {
    process.env.SHOPIFY_API_KEY = "mock_shopify_key";
    process.env.SHOPIFY_API_SECRET = "mock_shopify_secret";
    process.env.GA4_CLIENT_ID = "mock_ga4_id";
    process.env.GA4_CLIENT_SECRET = "mock_ga4_secret";
    process.env.HUBSPOT_CLIENT_ID = "mock_hs_id";
    process.env.HUBSPOT_CLIENT_SECRET = "mock_hs_secret";
    process.env.GSC_CLIENT_ID = "mock_gsc_id";
    process.env.GSC_CLIENT_SECRET = "mock_gsc_secret";
    process.env.GOOGLE_ADS_CLIENT_ID = "mock_ads_id";
    process.env.GOOGLE_ADS_CLIENT_SECRET = "mock_ads_secret";

    // In-memory test database
    adapter = new SqliteScanDatabaseAdapter(":memory:");
    (globalThis as any).scanDbInstance = adapter;
    integrationsManager.reset();
    seedInitialAccounts((adapter as any).db);

    const authService = adapter.getAuthService();
    tokenTenantA = authService.createSession("usr_companya_admin", tenantAId).token;
    tokenTenantB = authService.createSession("usr_companyb_owner", tenantBId).token;
  });

  afterEach(() => {
    integrationsManager.reset();
    (globalThis as any).scanDbInstance = undefined;
    try {
      adapter.close();
    } catch {}
    vi.restoreAllMocks();
  });

  function createAuthRequest(
    url: string,
    options: {
      method?: string;
      token?: string;
      body?: any;
    } = {}
  ): NextRequest {
    const headers = new Headers();
    if (options.token) {
      headers.set("Authorization", `Bearer ${options.token}`);
    }
    if (options.body) {
      headers.set("Content-Type", "application/json");
    }

    return new NextRequest(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  it("Connect Route: rejects unauthenticated requests", async () => {
    const req = createAuthRequest("http://localhost:3000/api/providers/connect", {
      method: "POST",
      body: { provider: "commerce_shopify", shopDomain: "test-shop.myshopify.com" },
    });
    const res = await connectHandler(req);
    expect(res.status).toBe(401);
  });

  it("Connect Route: enforces canonical redirect URI and rejects invalid Shopify store domains", async () => {
    // Missing/invalid Shopify domain
    const badDomains = [
      "not-a-shopify-domain.com",
      "https://attacker.com/store.myshopify.com",
      "test..myshopify.com",
      "-bad-prefix.myshopify.com",
      "store.myshopify.com/path/traversal",
      "",
    ];

    for (const badDomain of badDomains) {
      const req = createAuthRequest("http://localhost:3000/api/providers/connect", {
        method: "POST",
        token: tokenTenantA,
        body: { provider: "commerce_shopify", shopDomain: badDomain },
      });
      const res = await connectHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    }

    // Valid shop domain succeeds
    const goodReq = createAuthRequest("http://localhost:3000/api/providers/connect", {
      method: "POST",
      token: tokenTenantA,
      body: { provider: "commerce_shopify", shopDomain: "valid-merchant.myshopify.com" },
    });
    const goodRes = await connectHandler(goodReq);
    expect(goodRes.status).toBe(200);
    const goodData = await goodRes.json();
    expect(goodData.success).toBe(true);
    expect(goodData.authUrl).toContain("valid-merchant.myshopify.com");
    expect(goodData.authUrl).toContain("api%2Fproviders%2Fcallback%3Fprovider%3Dcommerce_shopify");
    expect(goodData.state).toBeDefined();
  });

  it("Callback Route: resolves provider dynamically from state without defaulting to GA4", async () => {
    const rawDb = adapter.getRawDb();
    const oauthManager = new OAuthStateManager(rawDb);

    // Create state explicitly bound to HubSpot CRM
    const { state } = oauthManager.createState(
      tenantAId,
      "crm_hubspot",
      "http://localhost:3000/api/providers/callback?provider=crm_hubspot"
    );

    // Call callback route with state and code, but WITHOUT provider in query param!
    // Before our fix, it would default to GA4 and fail.
    // With dynamic state lookup, it resolves to crm_hubspot automatically.
    const req = createAuthRequest(`http://localhost:3000/api/providers/callback?code=mock_hubspot_code&state=${state}`, {
      token: tokenTenantA,
    });

    const res = await callbackHandler(req);
    expect(res.status).toBe(307); // Successful redirect
    const redirectLocation = res.headers.get("location") || "";
    expect(redirectLocation).toContain("connected=crm_hubspot");
  });

  it("Callback Route: validates Shopify HMAC and rejects shop domain substitution attack", async () => {
    const rawDb = adapter.getRawDb();
    const oauthManager = new OAuthStateManager(rawDb);

    // Create state bound to legitimate-store.myshopify.com
    const { state } = oauthManager.createState(
      tenantAId,
      "commerce_shopify",
      "http://localhost:3000/api/providers/callback?provider=commerce_shopify",
      { shopDomain: "legitimate-store.myshopify.com" }
    );

    // Attacker attempts callback substituting attacker-store.myshopify.com
    const attackReq = createAuthRequest(
      `http://localhost:3000/api/providers/callback?code=mock_code&state=${state}&shop=attacker-store.myshopify.com`,
      { token: tokenTenantA }
    );
    const attackRes = await callbackHandler(attackReq);
    expect(attackRes.status).toBe(307);
    const attackLocation = decodeURIComponent(attackRes.headers.get("location") || "");
    expect(attackLocation).toContain("Shopify shop domain mismatch");

    // Legitimate callback with matching shopDomain succeeds
    const legitimateState = oauthManager.createState(
      tenantAId,
      "commerce_shopify",
      "http://localhost:3000/api/providers/callback?provider=commerce_shopify",
      { shopDomain: "legitimate-store.myshopify.com" }
    ).state;

    const legitReq = createAuthRequest(
      `http://localhost:3000/api/providers/callback?code=mock_code&state=${legitimateState}&shop=legitimate-store.myshopify.com`,
      { token: tokenTenantA }
    );
    const legitRes = await callbackHandler(legitReq);
    expect(legitRes.status).toBe(307);
    expect(legitRes.headers.get("location")).toContain("connected=commerce_shopify");
  });

  it("Callback Route: rejects expired OAuth state and replayed state", async () => {
    const rawDb = adapter.getRawDb();
    const oauthManager = new OAuthStateManager(rawDb);

    const { state } = oauthManager.createState(
      tenantAId,
      "google_analytics_4",
      "http://localhost:3000/api/providers/callback?provider=google_analytics_4"
    );

    // First call succeeds
    const req1 = createAuthRequest(`http://localhost:3000/api/providers/callback?code=mock_code&state=${state}`, {
      token: tokenTenantA,
    });
    const res1 = await callbackHandler(req1);
    expect(res1.status).toBe(307);
    expect(res1.headers.get("location")).toContain("connected=google_analytics_4");

    // Replay with same state must be rejected with error in redirect
    const req2 = createAuthRequest(`http://localhost:3000/api/providers/callback?code=mock_code&state=${state}`, {
      token: tokenTenantA,
    });
    const res2 = await callbackHandler(req2);
    expect(res2.status).toBe(307);
    const replayLocation = decodeURIComponent(res2.headers.get("location") || "");
    expect(replayLocation).toContain("potential replay attack");
  });

  it("Callback Route: handles provider authorization errors (e.g., access_denied)", async () => {
    const req = createAuthRequest(
      "http://localhost:3000/api/providers/callback?error=access_denied&error_description=The+user+denied+the+request",
      { token: tokenTenantA }
    );
    const res = await callbackHandler(req);
    expect(res.status).toBe(307);
    const location = decodeURIComponent(res.headers.get("location") || "");
    expect(location).toContain("access_denied");
  });

  it("Disconnect Route: purges credentials cleanly from persistent store", async () => {
    const rawDb = adapter.getRawDb();
    const store = new ProviderConnectionStore(rawDb);

    // Save a connection for tenant A
    store.saveConnection({
      tenantId: tenantAId,
      provider: "google_analytics_4",
      status: "CONNECTED",
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      accessToken: "plain_token",
      refreshToken: "plain_refresh",
    });
    expect(store.getConnection(tenantAId, "google_analytics_4")).not.toBeNull();

    // Disconnect via API route
    const req = createAuthRequest("http://localhost:3000/api/providers/disconnect", {
      method: "POST",
      token: tokenTenantA,
      body: { provider: "google_analytics_4" },
    });
    const res = await disconnectHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify row is deleted
    expect(store.getConnection(tenantAId, "google_analytics_4")).toBeNull();
  });

  it("Shopify Adapter: timing-safe HMAC verification succeeds for genuine requests and rejects tampered requests", () => {
    const rawDb = adapter.getRawDb();
    const store = new ProviderConnectionStore(rawDb);
    const shopifyAdapter = new ShopifyCommerceAdapter(store, "test_api_key", "test_secret_12345");

    const params: Record<string, string> = {
      code: "0907a61c0c8d55e99db179b68161bc00",
      shop: "some-shop.myshopify.com",
      timestamp: "1337178173",
    };

    // Correct HMAC computation
    const message = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    const hmac = crypto.createHmac("sha256", "test_secret_12345").update(message).digest("hex");

    expect(shopifyAdapter.validateHmac({ ...params, hmac })).toBe(true);

    // Tampered parameter rejected
    expect(shopifyAdapter.validateHmac({ ...params, shop: "evil-shop.myshopify.com", hmac })).toBe(false);

    // Tampered HMAC rejected
    expect(shopifyAdapter.validateHmac({ ...params, hmac: "bad_hmac_hex" })).toBe(false);
  });

  it("Token Refresh: refreshes access token using refresh token on expiration", async () => {
    const rawDb = adapter.getRawDb();
    const store = new ProviderConnectionStore(rawDb);
    const ga4Adapter = new GA4Adapter(store, "mock-id", "mock-secret");

    // Save an expired connection
    store.saveConnection({
      tenantId: tenantAId,
      provider: "google_analytics_4",
      status: "CONNECTED",
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      accessToken: "expired_token",
      refreshToken: "valid_refresh_token",
      tokenExpiresAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    });

    // Mock fetch for token refresh
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: any) => {
      if (typeof url === "string" && url.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({
            access_token: "refreshed_access_token_123",
            expires_in: 3600,
            token_type: "Bearer",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ rows: [] }), { status: 200 });
    });

    const refreshed = await ga4Adapter.refreshAccessToken(tenantAId);
    expect(refreshed.success).toBe(true);

    const decrypted = store.getDecryptedTokens(tenantAId, "google_analytics_4");
    expect(decrypted.accessToken).toBe("refreshed_access_token_123");
    expect(decrypted.isExpired).toBe(false);
  });
});

describe("Milestone 3: Cost of Inaction v2 & Connected Business Data Precedence", () => {
  const sampleResults: AssessmentResult[] = [
    {
      testId: "CRO-01",
      testVersion: "1.0.0",
      testName: "Primary Call to Action Prominence",
      category: "conversion_marketing",
      status: "FAIL",
      severity: "HIGH",
      maxPoints: 3,
      earnedPoints: 0,
      title: "Hero CTA Missing",
      summary: "No prominent call to action above the fold.",
      timestamp: new Date().toISOString(),
      confidence: "HIGH",
    },
    {
      testId: "PERF-01",
      testVersion: "1.0.0",
      testName: "Largest Contentful Paint (LCP)",
      category: "performance",
      status: "WARNING",
      severity: "MEDIUM",
      maxPoints: 3,
      earnedPoints: 1,
      title: "LCP exceeds 2.5s",
      summary: "Main content element took 3.2s to render.",
      timestamp: new Date().toISOString(),
      confidence: "HIGH",
    },
  ];

  it("strictly refuses to fabricate synthetic traffic when neither owner nor GA4 provides sessions", () => {
    const coi = calculateCostOfInaction({
      businessCategory: "ecommerce",
      request: { averageOrderValue: 90 },
      results: sampleResults,
    });

    expect(coi.status).toBe("INSUFFICIENT_INPUTS");
    expect(coi.scenarios).toBeUndefined();
    expect(coi.inputSource).toBe("Owner Input Required");
    expect(coi.confidence).toBe("LOW");
  });

  it("prefers explicit Owner Intake sessions over connected GA4 sessions", () => {
    const coi = calculateCostOfInaction({
      businessCategory: "ecommerce",
      request: {
        monthlySessions: 50000, // Owner Intake override
        averageOrderValue: 100,
        currency: "USD",
      },
      connectedMetrics: {
        google_analytics_4: {
          provider: "google_analytics_4",
          isAvailable: true,
          dataTimestamp: new Date().toISOString(),
          metrics: { sessionsCount: 25000, conversionRatePct: 2.1 },
          provenance: { source: "GA4", propertyOrAccount: "properties/123", fetchedAt: new Date().toISOString() },
        },
      },
      results: sampleResults,
    });

    expect(coi.status).toBe("ESTIMATED");
    expect(coi.inputsProvided.monthlySessions).toBe(50000);
    expect(coi.scenarios?.base.monthlyRevenueOpportunity).toBe(50000 * 0.005 * 100); // 2500
  });

  it("ingests verified GA4 sessions when Owner Intake traffic is omitted", () => {
    const coi = calculateCostOfInaction({
      businessCategory: "ecommerce",
      request: {
        averageOrderValue: 80,
        currency: "USD",
      },
      connectedMetrics: {
        google_analytics_4: {
          provider: "google_analytics_4",
          isAvailable: true,
          dataTimestamp: new Date().toISOString(),
          metrics: { sessionsCount: 18000, conversionRatePct: 1.9 },
          provenance: { source: "GA4", propertyOrAccount: "properties/123", fetchedAt: new Date().toISOString() },
        },
      },
      results: sampleResults,
    });

    expect(coi.status).toBe("ESTIMATED");
    expect(coi.inputsProvided.monthlySessions).toBe(18000);
    expect(coi.scenarios?.base.monthlyRevenueOpportunity).toBe(18000 * 0.005 * 80);
    expect(coi.assumptions.some((a) => a.includes("[Verified Provider - GA4]"))).toBe(true);
  });

  it("ingests verified Shopify AOV and HubSpot deal values without inventing sales", () => {
    // E-commerce with verified Shopify AOV
    const ecomCoi = calculateCostOfInaction({
      businessCategory: "ecommerce",
      request: { monthlySessions: 12000 },
      connectedMetrics: {
        commerce_shopify: {
          provider: "commerce_shopify",
          isAvailable: true,
          dataTimestamp: new Date().toISOString(),
          metrics: { averageOrderValue: 115.5, grossMerchandiseValue: 138000, currency: "GBP" },
          provenance: { source: "Shopify", propertyOrAccount: "store.myshopify.com", fetchedAt: new Date().toISOString() },
        },
      },
      results: sampleResults,
    });

    expect(ecomCoi.status).toBe("ESTIMATED");
    expect(ecomCoi.inputsProvided.averageOrderValue).toBe(115.5);
    expect(ecomCoi.currency).toBe("GBP");
    expect(ecomCoi.assumptions.some((a) => a.includes("[Verified Provider - Shopify]"))).toBe(true);

    // SaaS with verified HubSpot ACV and close rate
    const saasCoi = calculateCostOfInaction({
      businessCategory: "saas",
      request: { monthlySessions: 10000 },
      connectedMetrics: {
        crm_hubspot: {
          provider: "crm_hubspot",
          isAvailable: true,
          dataTimestamp: new Date().toISOString(),
          metrics: { averageDealValue: 120, leadToCustomerRatePct: 22.5 },
          provenance: { source: "HubSpot", propertyOrAccount: "portal-123", fetchedAt: new Date().toISOString() },
        },
      },
      results: sampleResults,
    });

    expect(saasCoi.status).toBe("ESTIMATED");
    expect(saasCoi.inputsProvided.customerValue).toBe(120);
    expect(saasCoi.inputsProvided.leadToCustomerRatePct).toBe(22.5);
    expect(saasCoi.assumptions.some((a) => a.includes("[Verified Provider - HubSpot]"))).toBe(true);
  });

  it("discloses acquisition context (GSC, Google Ads, Backlinks) without treating them as direct sales", () => {
    const coi = calculateCostOfInaction({
      businessCategory: "ecommerce",
      request: { monthlySessions: 15000, averageOrderValue: 90 },
      connectedMetrics: {
        search_console: {
          provider: "search_console",
          isAvailable: true,
          dataTimestamp: new Date().toISOString(),
          metrics: { impressions: 45000, clicks: 1850, averageCtrPct: 4.1, averagePosition: 11.2 },
          provenance: { source: "GSC", propertyOrAccount: "sc-domain:example.com", fetchedAt: new Date().toISOString() },
        },
        ads_google: {
          provider: "ads_google",
          isAvailable: true,
          dataTimestamp: new Date().toISOString(),
          metrics: { monthlySpend: 2500, clicks: 920 },
          provenance: { source: "Google Ads", propertyOrAccount: "customers/123", fetchedAt: new Date().toISOString() },
        },
        backlinks_serp: {
          provider: "backlinks_serp",
          isAvailable: true,
          dataTimestamp: new Date().toISOString(),
          metrics: { domainRating: 54, referringDomainsCount: 310, totalBacklinks: 8400 },
          provenance: { source: "SERP", propertyOrAccount: "example.com", fetchedAt: new Date().toISOString() },
        },
      },
      results: sampleResults,
    });

    expect(coi.status).toBe("ESTIMATED");
    // Verify clear disclosures that acquisition data != verified sales
    expect(coi.assumptions.some((a) => a.includes("[Verified Acquisition Context - Google Search Console]"))).toBe(true);
    expect(coi.assumptions.some((a) => a.includes("NOT treated as direct sales"))).toBe(true);
    expect(coi.assumptions.some((a) => a.includes("[Verified Acquisition Context - Google Ads]"))).toBe(true);
    expect(coi.assumptions.some((a) => a.includes("NOT treated as sales revenue"))).toBe(true);
    expect(coi.assumptions.some((a) => a.includes("[Verified Acquisition Context - SERP / Backlinks]"))).toBe(true);

    // Verify evidence ledger is populated with friction rules (CRO-*, PERF-*)
    expect(coi.inputsProvided.evidenceLedger).toHaveLength(2);
    expect(coi.inputsProvided.evidenceLedger[0].ruleId).toBe("CRO-01");
    expect(coi.inputsProvided.evidenceLedger[1].ruleId).toBe("PERF-01");
  });
});
