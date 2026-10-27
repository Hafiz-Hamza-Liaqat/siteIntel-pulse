import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { runMigrations } from "@/lib/persistence/migrator.ts";
import { OAuthStateManager } from "./oauth-manager.ts";
import { ProviderConnectionStore } from "./connection-store.ts";
import { GA4Adapter } from "./ga4-adapter.ts";
import { SearchConsoleAdapter } from "./gsc-adapter.ts";
import { HubSpotCrmAdapter } from "./hubspot-adapter.ts";
import { ShopifyCommerceAdapter } from "./shopify-adapter.ts";
import { GoogleAdsAdapter } from "./google-ads-adapter.ts";
import { BacklinksSerpAdapter } from "./backlinks-serp-adapter.ts";

function insertTenant(db: DatabaseSync, tenantId: string) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO tenants (id, name, slug, plan, max_concurrent_scans, scans_per_hour_quota, created_at)
    VALUES (?, ?, ?, 'free', 2, 10, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(tenantId, `Tenant ${tenantId}`, `tenant-${tenantId}`, now);
}

describe("Milestone 3: OAuth State Manager & Security", () => {
  let db: DatabaseSync;
  let oauthManager: OAuthStateManager;
  const testTenant = "tenant_test_oauth_123";

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    runMigrations(db);
    insertTenant(db, testTenant);
    oauthManager = new OAuthStateManager(db);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {}
  });

  it("generates cryptographically secure state with PKCE code challenge and verifier", () => {
    const { state, codeVerifier, codeChallenge } = oauthManager.createState(
      testTenant,
      "google_analytics_4",
      "https://app.siteintel.io/dashboard"
    );

    expect(state).toBeDefined();
    expect(state.length).toBeGreaterThanOrEqual(40);
    expect(codeVerifier).toBeDefined();
    expect(codeVerifier.length).toBeGreaterThanOrEqual(40);
    expect(codeChallenge).toBeDefined();
  });

  it("validates and consumes valid state in a single-use flow (prevents replay)", () => {
    const { state } = oauthManager.createState(
      testTenant,
      "commerce_shopify",
      "https://app.siteintel.io/dashboard"
    );

    // First consumption succeeds
    const res = oauthManager.validateAndConsumeState(state, testTenant, "commerce_shopify");
    expect(res.isValid).toBe(true);

    // Second consumption must fail (consumed once)
    const replayRes = oauthManager.validateAndConsumeState(state, testTenant, "commerce_shopify");
    expect(replayRes.isValid).toBe(false);
  });

  it("rejects state validation for mismatched tenant or mismatched provider", () => {
    const { state } = oauthManager.createState(
      testTenant,
      "crm_hubspot",
      "https://app.siteintel.io/dashboard"
    );

    const wrongTenant = oauthManager.validateAndConsumeState(state, "tenant_attacker", "crm_hubspot");
    expect(wrongTenant.isValid).toBe(false);

    const wrongProvider = oauthManager.validateAndConsumeState(state, testTenant, "google_analytics_4");
    expect(wrongProvider.isValid).toBe(false);
  });

  it("rejects expired OAuth state (>10 minutes)", () => {
    const { state } = oauthManager.createState(
      testTenant,
      "ads_google",
      "https://app.siteintel.io/dashboard"
    );

    // Backdate the state record by 15 minutes (in ms)
    const pastTime = Date.now() - 15 * 60 * 1000;
    db.prepare("UPDATE oauth_states SET expires_at = ? WHERE state_token = ?").run(pastTime, state);

    const expiredRes = oauthManager.validateAndConsumeState(state, testTenant, "ads_google");
    expect(expiredRes.isValid).toBe(false);
    expect(expiredRes.rejectionReason).toBeDefined();
  });
});

describe("Milestone 3: Provider Connection Store & Encrypted Persistence", () => {
  let db: DatabaseSync;
  let store: ProviderConnectionStore;
  const testTenant = "tenant_test_store_456";

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    runMigrations(db);
    insertTenant(db, testTenant);
    store = new ProviderConnectionStore(db);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {}
  });

  it("persists encrypted provider credentials and retrieves them cleanly", () => {
    store.saveConnection({
      tenantId: testTenant,
      provider: "google_analytics_4",
      status: "CONNECTED",
      accountId: "123456789",
      propertyId: "properties/123456789",
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      accessToken: "plain_access_token_mock",
      refreshToken: "plain_refresh_token_mock",
      tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      metadata: { accountName: "Example Store GA4" },
    });

    // Verify row in database is encrypted at rest (not plaintext)
    const row = db.prepare("SELECT encrypted_access_token, encrypted_refresh_token FROM provider_connections WHERE tenant_id = ? AND provider = ?").get(testTenant, "google_analytics_4") as any;
    expect(row.encrypted_access_token).not.toContain("plain_access_token_mock");
    expect(row.encrypted_refresh_token).not.toContain("plain_refresh_token_mock");
    expect(row.encrypted_access_token.split(":")).toHaveLength(3);

    // Verify retrieved connection decrypts seamlessly
    const decrypted = store.getDecryptedTokens(testTenant, "google_analytics_4");
    expect(decrypted.accessToken).toBe("plain_access_token_mock");
    expect(decrypted.refreshToken).toBe("plain_refresh_token_mock");
    expect(decrypted.isExpired).toBe(false);
  });

  it("disconnects and removes provider credentials for tenant", () => {
    store.saveConnection({
      tenantId: testTenant,
      provider: "crm_hubspot",
      status: "CONNECTED",
      scopes: ["crm.objects.deals.read"],
      accessToken: "hs_token",
    });

    expect(store.getConnection(testTenant, "crm_hubspot")).not.toBeNull();
    const removed = store.deleteConnection(testTenant, "crm_hubspot");
    expect(removed).toBe(true);
    expect(store.getConnection(testTenant, "crm_hubspot")).toBeNull();
  });
});

describe("Milestone 3: Provider Adapters & Telemetry Ingestion", () => {
  let db: DatabaseSync;
  let store: ProviderConnectionStore;
  const testTenant = "tenant_adapters_test";

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    runMigrations(db);
    insertTenant(db, testTenant);
    store = new ProviderConnectionStore(db);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {}
  });

  it("GA4 Adapter: starts authorization, handles callback, and parses metrics", async () => {
    const adapter = new GA4Adapter(store, "mock-client-id", "mock-client-secret");
    const authUrl = adapter.startAuthorization({ redirectUri: "https://siteintel.io/cb", state: "xyz-state-1" });
    expect(authUrl).toContain("accounts.google.com");
    expect(authUrl).toContain("analytics.readonly");

    const cbRes = await adapter.handleCallback({
      tenantId: testTenant,
      code: "mock_ga4_code",
      redirectUri: "https://siteintel.io/cb",
      mockTokens: { accessToken: "mock_access_token", refreshToken: "mock_refresh_token" },
    });
    expect(cbRes.success).toBe(true);

    const status = await adapter.getConnectionStatus(testTenant);
    expect(status.isConnected).toBe(true);
    expect(status.status).toBe("CONNECTED");

    // Live mock telemetry
    const metrics = await adapter.fetchMetrics(testTenant, {
      mockOverride: { sessionsCount: 15420, activeUsers: 11200, conversionsCount: 420 },
    });
    expect(metrics.provider).toBe("google_analytics_4");
    expect(metrics.metrics?.sessionsCount).toBe(15420);
    expect(metrics.metrics?.activeUsers).toBe(11200);
  });

  it("Search Console Adapter: ingests search clicks and impressions", async () => {
    const adapter = new SearchConsoleAdapter(store, "mock-client-id", "mock-client-secret");
    await adapter.handleCallback({
      tenantId: testTenant,
      code: "mock_gsc_code",
      redirectUri: "https://siteintel.io/cb",
      mockTokens: { accessToken: "mock_gsc_access", refreshToken: "mock_gsc_refresh" },
    });

    const metrics = await adapter.fetchMetrics(testTenant, {
      mockOverride: { clicksCount: 8400, impressionsCount: 195000, averageCtrPct: 4.3, averagePosition: 12.4 },
    });
    expect(metrics.provider).toBe("search_console");
    expect(metrics.metrics?.clicksCount).toBeGreaterThan(0);
    expect(metrics.metrics?.impressionsCount).toBeGreaterThan(0);
  });

  it("HubSpot CRM Adapter: ingests deals won and revenue pipeline", async () => {
    const adapter = new HubSpotCrmAdapter(store, "mock-hubspot-id", "mock-hubspot-secret");
    await adapter.handleCallback({
      tenantId: testTenant,
      code: "mock_hs_code",
      redirectUri: "https://siteintel.io/cb",
      mockTokens: { accessToken: "mock_hs_access", refreshToken: "mock_hs_refresh" },
    });

    const metrics = await adapter.fetchMetrics(testTenant, {
      mockOverride: { dealsWonCount: 38, totalDealValue: 142000, pipelineConversionRatePct: 18.5 },
    });
    expect(metrics.provider).toBe("crm_hubspot");
    expect(metrics.metrics?.dealsWonCount).toBeGreaterThan(0);
    expect(metrics.metrics?.totalDealValue).toBeGreaterThan(0);
  });

  it("Shopify Adapter: ingests GMV and orders while strictly omitting customer PII", async () => {
    const adapter = new ShopifyCommerceAdapter(store, "mock-shopify-key", "mock-shopify-secret");
    await adapter.handleCallback({
      tenantId: testTenant,
      shopDomain: "my-shop.myshopify.com",
      code: "mock_shopify_code",
      mockTokens: { accessToken: "shpat_mock_token" },
    });

    const metrics = await adapter.fetchMetrics(testTenant, {
      mockOverride: { grossMerchandiseValue: 89400, ordersCount: 1240, averageOrderValue: 72.1 },
    });
    expect(metrics.provider).toBe("commerce_shopify");
    expect(metrics.metrics?.grossMerchandiseValue).toBeGreaterThan(0);
    expect(metrics.metrics?.ordersCount).toBeGreaterThan(0);

    // Security check: no customer PII
    const serialized = JSON.stringify(metrics);
    expect(serialized).not.toContain("customerEmail");
    expect(serialized).not.toContain("customerName");
    expect(serialized).not.toContain("shippingAddress");
  });

  it("Google Ads Adapter: ingests ad spend, clicks, and impressions", async () => {
    const adapter = new GoogleAdsAdapter(store, "mock-ads-id", "mock-ads-secret");
    await adapter.handleCallback({
      tenantId: testTenant,
      code: "mock_ads_code",
      redirectUri: "https://siteintel.io/cb",
      mockTokens: { accessToken: "mock_ads_access", refreshToken: "mock_ads_refresh" },
    });

    const metrics = await adapter.fetchMetrics(testTenant, {
      mockOverride: { adSpend: 4500, impressionsCount: 78000, clicksCount: 3200, roas: 3.8 },
    });
    expect(metrics.provider).toBe("ads_google");
    expect(metrics.metrics?.adSpend).toBeGreaterThan(0);
    expect(metrics.metrics?.impressionsCount).toBeGreaterThan(0);
  });

  it("Backlinks & SERP Adapter: ingests domain rating and backlink counts", async () => {
    const adapter = new BacklinksSerpAdapter(store, "mock-api-key");
    const metrics = await adapter.fetchMetrics(testTenant, "https://example.com", {
      mockOverride: { domainRating: 65, totalBacklinks: 12500, rankingKeywordsCount: 450 },
    });
    expect(metrics.provider).toBe("backlinks_serp");
    expect(metrics.metrics?.domainRating).toBeGreaterThanOrEqual(0);
    expect(metrics.metrics?.totalBacklinks).toBeGreaterThan(0);
  });
});
