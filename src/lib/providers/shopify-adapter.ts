import crypto from "node:crypto";
import { ProviderConnectionState, ProviderMetricsResult } from "./types";
import { ProviderConnectionStore } from "./connection-store";

export class ShopifyCommerceAdapter {
  readonly providerId = "commerce_shopify" as const;
  readonly displayName = "Shopify Commerce";
  readonly category = "commerce" as const;
  readonly supportedCapabilities = [
    "Monthly orders & transaction volume",
    "Average order value (AOV)",
    "Gross merchandise value (GMV)",
    "Online store checkout completion rate",
  ];
  readonly requiredScopes = ["read_orders", "read_products"];

  private store: ProviderConnectionStore;
  private apiKey?: string;
  private apiSecret?: string;

  constructor(store: ProviderConnectionStore, apiKey?: string, apiSecret?: string) {
    this.store = store;
    this.apiKey = apiKey || process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_CLIENT_ID;
    this.apiSecret = apiSecret || process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_CLIENT_SECRET;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiSecret);
  }

  /**
   * Validates merchant shop domain.
   * Rejects path traversal, protocols, invalid characters, and non-myshopify domains.
   */
  validateShopDomain(rawShop: string): { isValid: boolean; normalizedShop?: string; error?: string } {
    if (!rawShop || typeof rawShop !== "string") {
      return { isValid: false, error: "Shop domain is required." };
    }

    const trimmed = rawShop.trim();
    if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("?") || trimmed.includes("#")) {
      return { isValid: false, error: "Shop domain must not contain paths, slashes, or query characters." };
    }

    let cleaned = trimmed.toLowerCase();
    cleaned = cleaned.replace(/^https?:\/\//, "");

    if (!cleaned.includes(".")) {
      cleaned = `${cleaned}.myshopify.com`;
    }

    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
    if (!shopRegex.test(cleaned)) {
      return {
        isValid: false,
        error: "Invalid Shopify shop domain. Must be in the format 'your-store.myshopify.com'.",
      };
    }

    return { isValid: true, normalizedShop: cleaned };
  }

  /**
   * Validates Shopify OAuth HMAC signature per Shopify requirements.
   * Compares the computed SHA-256 HMAC of sorted query params against the provided hmac parameter.
   */
  validateHmac(queryParams: Record<string, string>): boolean {
    if (!this.apiSecret) return false;
    const { hmac, signature, ...rest } = queryParams;
    if (!hmac) return false;

    // Sort parameters lexicographically and join with &
    const message = Object.keys(rest)
      .sort()
      .map((k) => `${k}=${rest[k]}`)
      .join("&");

    const digest = crypto.createHmac("sha256", this.apiSecret).update(message).digest("hex");

    try {
      const digestBuf = Buffer.from(digest, "utf-8");
      const hmacBuf = Buffer.from(hmac, "utf-8");
      if (digestBuf.length !== hmacBuf.length) return false;
      return crypto.timingSafeEqual(digestBuf, hmacBuf);
    } catch {
      return false;
    }
  }

  async getConnectionStatus(tenantId: string): Promise<ProviderConnectionState> {
    const isConfigured = this.isConfigured();
    if (!isConfigured) {
      return {
        provider: this.providerId,
        displayName: this.displayName,
        category: this.category,
        status: "NOT_CONFIGURED",
        isConnected: false,
        hasCredentials: false,
        statusMessage: "SHOPIFY_API_KEY or SHOPIFY_API_SECRET environment variable is not configured. Shopify integration unavailable.",
        supportedCapabilities: this.supportedCapabilities,
        permissions: this.requiredScopes,
      };
    }

    const conn = this.store.getConnection(tenantId, this.providerId);
    if (!conn || conn.status === "NOT_CONNECTED") {
      return {
        provider: this.providerId,
        displayName: this.displayName,
        category: this.category,
        status: "NOT_CONNECTED",
        isConnected: false,
        hasCredentials: true,
        statusMessage: "Configured and ready. Tenant authorization required to connect Shopify merchant store.",
        supportedCapabilities: this.supportedCapabilities,
        permissions: this.requiredScopes,
      };
    }

    return {
      provider: this.providerId,
      displayName: this.displayName,
      category: this.category,
      status: "CONNECTED",
      isConnected: true,
      hasCredentials: true,
      statusMessage: `Connected to Shopify Store (${conn.account_id || "Active Store"}).`,
      supportedCapabilities: this.supportedCapabilities,
      permissions: JSON.parse(conn.scopes_json || "[]"),
      propertyId: conn.property_id || undefined,
      accountId: conn.account_id || undefined,
      lastSyncAt: conn.last_sync_at || undefined,
      healthStatus: "HEALTHY",
    };
  }

  startAuthorization(params: {
    shopDomain: string;
    redirectUri: string;
    state: string;
  }): string {
    if (!this.apiKey) {
      throw new Error("Cannot start authorization: SHOPIFY_API_KEY is not configured.");
    }
    const validation = this.validateShopDomain(params.shopDomain);
    if (!validation.isValid || !validation.normalizedShop) {
      throw new Error(validation.error || "Invalid Shopify shop domain.");
    }
    const cleanShop = validation.normalizedShop;
    const url = new URL(`https://${cleanShop}/admin/oauth/authorize`);
    url.searchParams.set("client_id", this.apiKey);
    url.searchParams.set("scope", this.requiredScopes.join(","));
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("state", params.state);
    return url.toString();
  }

  async handleCallback(params: {
    tenantId: string;
    shopDomain: string;
    code: string;
    queryParams?: Record<string, string>;
    mockTokens?: { accessToken: string; shopDomain?: string };
  }): Promise<{ success: boolean; shopDomain?: string; error?: string }> {
    const domainCheck = this.validateShopDomain(params.shopDomain);
    if (!domainCheck.isValid || !domainCheck.normalizedShop) {
      return { success: false, error: domainCheck.error || "Invalid shop domain." };
    }
    const cleanShop = domainCheck.normalizedShop;

    // Validate HMAC signature if queryParams containing hmac are provided
    if (params.queryParams && params.queryParams.hmac && !params.mockTokens) {
      const isHmacValid = this.validateHmac(params.queryParams);
      if (!isHmacValid) {
        return { success: false, error: "Shopify OAuth HMAC signature verification failed." };
      }
    }

    if (params.mockTokens) {
      this.store.saveConnection({
        tenantId: params.tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken: params.mockTokens.accessToken,
        accountId: cleanShop,
        propertyId: cleanShop,
      });
      return { success: true, shopDomain: cleanShop };
    }

    if (!this.apiKey || !this.apiSecret) {
      return { success: false, error: "Shopify API credentials not configured." };
    }

    try {
      const cleanShop = params.shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const tokenRes = await fetch(`https://${cleanShop}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          code: params.code,
        }),
      });

      if (!tokenRes.ok) {
        return { success: false, error: `Shopify token exchange failed with HTTP ${tokenRes.status}` };
      }

      const data = await tokenRes.json();
      this.store.saveConnection({
        tenantId: params.tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken: data.access_token,
        accountId: cleanShop,
        propertyId: cleanShop,
      });

      return { success: true, shopDomain: cleanShop };
    } catch (err: any) {
      return { success: false, error: err?.message || "Shopify connection failed." };
    }
  }

  async fetchMetrics(
    tenantId: string,
    options?: { mockOverride?: Record<string, any> }
  ): Promise<ProviderMetricsResult> {
    const conn = this.store.getConnection(tenantId, this.providerId);
    const now = new Date().toISOString();

    if (options?.mockOverride) {
      return {
        provider: this.providerId,
        isAvailable: true,
        dataTimestamp: now,
        metrics: options.mockOverride,
        provenance: {
          source: "Shopify Admin API (Mock Fixture)",
          propertyOrAccount: conn?.account_id || "demo-store.myshopify.com",
          isSimulatedOrMock: true,
          fetchedAt: now,
        },
      };
    }

    if (!conn || conn.status !== "CONNECTED") {
      return {
        provider: this.providerId,
        isAvailable: false,
        dataTimestamp: now,
        metrics: {},
        provenance: { source: "Shopify Commerce", propertyOrAccount: "NOT_CONNECTED", fetchedAt: now },
        limitations: "Shopify Commerce is not connected. Requires authorized tenant connection.",
      };
    }

    const { accessToken } = this.store.getDecryptedTokens(tenantId, this.providerId);
    if (!accessToken) {
      return {
        provider: this.providerId,
        isAvailable: false,
        dataTimestamp: now,
        metrics: {},
        provenance: { source: "Shopify Commerce", propertyOrAccount: conn.account_id || "UNKNOWN", fetchedAt: now },
        limitations: "Shopify access token unavailable. Re-connection required.",
      };
    }

    const shop = conn.account_id || "active-store.myshopify.com";
    try {
      const ordersRes = await fetch(`https://${shop}/admin/api/2024-01/orders.json?status=any&limit=250&fields=id,total_price,financial_status,created_at`, {
        headers: { "X-Shopify-Access-Token": accessToken },
      });

      if (!ordersRes.ok) {
        return {
          provider: this.providerId,
          isAvailable: false,
          dataTimestamp: now,
          metrics: {},
          provenance: { source: "Shopify Admin Orders API", propertyOrAccount: shop, fetchedAt: now },
          limitations: `Shopify Orders API returned HTTP ${ordersRes.status}.`,
        };
      }

      const data = await ordersRes.json();
      const orders = data?.orders || [];
      const paidOrders = orders.filter((o: any) => o.financial_status === "paid");
      const totalGmv = paidOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total_price || "0"), 0);
      const aov = paidOrders.length > 0 ? Math.round((totalGmv / paidOrders.length) * 100) / 100 : 0;

      return {
        provider: this.providerId,
        isAvailable: true,
        dataTimestamp: now,
        metrics: {
          totalOrders: orders.length,
          paidOrdersCount: paidOrders.length,
          grossMerchandiseValue: Math.round(totalGmv),
          averageOrderValue: aov,
        },
        provenance: {
          source: "Shopify Admin Orders API (Aggregated)",
          propertyOrAccount: shop,
          fetchedAt: now,
        },
      };
    } catch (err: any) {
      return {
        provider: this.providerId,
        isAvailable: false,
        dataTimestamp: now,
        metrics: {},
        provenance: { source: "Shopify Commerce", propertyOrAccount: shop, fetchedAt: now },
        limitations: `Failed to fetch Shopify metrics: ${err?.message || "Network error"}`,
      };
    }
  }

  async disconnect(tenantId: string): Promise<boolean> {
    return this.store.deleteConnection(tenantId, this.providerId);
  }
}
