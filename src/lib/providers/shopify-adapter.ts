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
  readonly apiVersion: string;

  private store: ProviderConnectionStore;
  private apiKey?: string;
  private apiSecret?: string;

  constructor(
    store: ProviderConnectionStore,
    apiKey?: string,
    apiSecret?: string,
    apiVersion?: string
  ) {
    this.store = store;
    this.apiKey = apiKey || process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_CLIENT_ID;
    this.apiSecret = apiSecret || process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_CLIENT_SECRET;
    this.apiVersion = apiVersion || process.env.SHOPIFY_API_VERSION || "2026-10";
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

    // Explicit test-only mock path
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

    // In production/live flow, HMAC signature is strictly mandatory
    if (!params.queryParams || !params.queryParams.hmac) {
      return { success: false, error: "Missing required HMAC signature in Shopify OAuth callback." };
    }

    const isHmacValid = this.validateHmac(params.queryParams);
    if (!isHmacValid) {
      return { success: false, error: "Shopify OAuth HMAC signature verification failed." };
    }

    if (!this.apiKey || !this.apiSecret) {
      return { success: false, error: "Shopify API credentials not configured." };
    }

    try {
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
        dateRange: {
          startDate: options.mockOverride.reportingPeriod?.startDate || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
          endDate: options.mockOverride.reportingPeriod?.endDate || now.split("T")[0],
        },
        metrics: {
          currency: "USD",
          ...options.mockOverride,
        },
        provenance: {
          source: `Shopify GraphQL Admin API ${this.apiVersion} (Mock Fixture)`,
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
      let storeCurrency: string | undefined = undefined;
      let servedApiVersion: string | undefined = undefined;

      // 1. Fetch store metadata & currency via GraphQL Admin API
      const shopRes = await fetch(`https://${shop}/admin/api/${this.apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: `query GetShopMetadata {
            shop {
              currencyCode
              name
              myshopifyDomain
            }
          }`,
        }),
      });

      const shopVersionHeader = shopRes.headers?.get?.("X-Shopify-API-Version") || shopRes.headers?.get?.("x-shopify-api-version");
      if (shopVersionHeader) {
        servedApiVersion = shopVersionHeader;
      }

      if (shopRes.ok) {
        const shopData = await shopRes.json();
        const rawCurr = shopData?.data?.shop?.currencyCode;
        if (rawCurr && typeof rawCurr === "string") {
          const trimmed = rawCurr.trim().toUpperCase();
          if (/^[A-Z]{3}$/.test(trimmed)) {
            storeCurrency = trimmed;
          }
        }
      }

      // 2. Fetch orders within a defined recent 30-day window via GraphQL cursor pagination
      const reportingDays = 30;
      const createdAtMin = new Date(Date.now() - reportingDays * 24 * 60 * 60 * 1000).toISOString();
      const allOrders: any[] = [];
      let cursor: string | null = null;
      let hasNextPage = true;
      let pageCount = 0;
      const MAX_PAGES = 40; // Safely supports up to 10,000 orders

      while (hasNextPage && pageCount < MAX_PAGES) {
        pageCount++;
        const ordersRes: Response = await fetch(`https://${shop}/admin/api/${this.apiVersion}/graphql.json`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query: `query GetOrders($first: Int!, $after: String, $query: String) {
              orders(first: $first, after: $after, query: $query) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  createdAt
                  displayFinancialStatus
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }`,
            variables: {
              first: 250,
              after: cursor,
              query: `created_at:>=${createdAtMin}`,
            },
          }),
        });

        const ordersVersionHeader = ordersRes.headers?.get?.("X-Shopify-API-Version") || ordersRes.headers?.get?.("x-shopify-api-version");
        if (ordersVersionHeader && !servedApiVersion) {
          servedApiVersion = ordersVersionHeader;
        }

        if (!ordersRes.ok) {
          return {
            provider: this.providerId,
            isAvailable: false,
            dataTimestamp: now,
            metrics: {},
            provenance: {
              source: `Shopify GraphQL Admin API ${servedApiVersion || this.apiVersion}`,
              propertyOrAccount: shop,
              fetchedAt: now,
            },
            limitations: `Shopify Orders GraphQL API returned HTTP ${ordersRes.status} on page ${pageCount}.`,
          };
        }

        const data = await ordersRes.json();
        if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          const errMsg = data.errors.map((e: any) => e.message || "GraphQL error").join("; ");
          return {
            provider: this.providerId,
            isAvailable: false,
            dataTimestamp: now,
            metrics: {},
            provenance: {
              source: `Shopify GraphQL Admin API ${servedApiVersion || this.apiVersion}`,
              propertyOrAccount: shop,
              fetchedAt: now,
            },
            limitations: `Shopify Orders GraphQL API returned error on page ${pageCount}: ${errMsg}`,
          };
        }

        const ordersConnection = data?.data?.orders;
        const nodes = ordersConnection?.nodes || [];
        allOrders.push(...nodes);

        hasNextPage = Boolean(ordersConnection?.pageInfo?.hasNextPage);
        cursor = ordersConnection?.pageInfo?.endCursor || null;
      }

      // If hasNextPage is still true, pagination ceiling was reached without completing
      if (hasNextPage) {
        return {
          provider: this.providerId,
          isAvailable: false,
          dataTimestamp: now,
          metrics: {
            totalOrders: allOrders.length,
            paginationComplete: false,
            isIncomplete: true,
            pagesRetrieved: pageCount,
          },
          provenance: {
            source: `Shopify GraphQL Admin API ${servedApiVersion || this.apiVersion}`,
            propertyOrAccount: shop,
            fetchedAt: now,
          },
          limitations: `Shopify order volume exceeded maximum pagination limit (${pageCount} pages, ${allOrders.length} orders retrieved; additional pages remain). Incomplete financial figures cannot be certified as verified metrics.`,
        };
      }

      // 3. Currency Validation
      const uniqueOrderCurrencies = Array.from(
        new Set(
          allOrders
            .map((o: any) => {
              const code = o.totalPriceSet?.shopMoney?.currencyCode || o.currency;
              return typeof code === "string" ? code.trim().toUpperCase() : undefined;
            })
            .filter((c): c is string => Boolean(c && /^[A-Z]{3}$/.test(c)))
        )
      );

      // Multiple conflicting currencies cannot be summed as a single total
      if (uniqueOrderCurrencies.length > 1) {
        return {
          provider: this.providerId,
          isAvailable: false,
          dataTimestamp: now,
          metrics: {
            totalOrders: allOrders.length,
            orderCurrencies: uniqueOrderCurrencies,
          },
          provenance: {
            source: `Shopify GraphQL Admin API ${servedApiVersion || this.apiVersion}`,
            propertyOrAccount: shop,
            fetchedAt: now,
          },
          limitations: `Multiple conflicting order currencies detected (${uniqueOrderCurrencies.join(", ")}). Multi-currency normalization required.`,
        };
      }

      // If store currency was not obtained from shop settings, inspect order currencies
      if (!storeCurrency && uniqueOrderCurrencies.length === 1) {
        storeCurrency = uniqueOrderCurrencies[0];
      }

      // If store currency conflicts with single order currency
      if (storeCurrency && uniqueOrderCurrencies.length === 1 && uniqueOrderCurrencies[0] !== storeCurrency) {
        return {
          provider: this.providerId,
          isAvailable: false,
          dataTimestamp: now,
          metrics: {
            storeCurrency,
            orderCurrency: uniqueOrderCurrencies[0],
          },
          provenance: {
            source: `Shopify GraphQL Admin API ${servedApiVersion || this.apiVersion}`,
            propertyOrAccount: shop,
            fetchedAt: now,
          },
          limitations: `Store currency (${storeCurrency}) conflicts with order transactions currency (${uniqueOrderCurrencies[0]}).`,
        };
      }

      // If currency cannot be established at all, refuse silent USD fallback
      if (!storeCurrency) {
        return {
          provider: this.providerId,
          isAvailable: false,
          dataTimestamp: now,
          metrics: {
            totalOrders: allOrders.length,
          },
          provenance: {
            source: `Shopify GraphQL Admin API ${servedApiVersion || this.apiVersion}`,
            propertyOrAccount: shop,
            fetchedAt: now,
          },
          limitations: "Shopify store currency could not be established. Valid ISO 4217 currency is required to model financial metrics.",
        };
      }

      const paidOrders = allOrders.filter((o: any) => {
        const status = (o.displayFinancialStatus || o.financial_status || "").toUpperCase();
        return status === "PAID";
      });
      const totalGmv = paidOrders.reduce((sum: number, o: any) => {
        const amountStr = o.totalPriceSet?.shopMoney?.amount ?? o.total_price ?? "0";
        return sum + parseFloat(amountStr);
      }, 0);
      const aov = paidOrders.length > 0 ? Math.round((totalGmv / paidOrders.length) * 100) / 100 : 0;

      return {
        provider: this.providerId,
        isAvailable: true,
        dataTimestamp: now,
        dateRange: {
          startDate: createdAtMin.split("T")[0],
          endDate: now.split("T")[0],
        },
        metrics: {
          totalOrders: allOrders.length,
          paidOrdersCount: paidOrders.length,
          grossMerchandiseValue: Math.round(totalGmv),
          averageOrderValue: aov,
          currency: storeCurrency,
          reportingWindowDays: reportingDays,
          paginationComplete: true,
          pagesRetrieved: pageCount,
        },
        provenance: {
          source: `Shopify GraphQL Admin API ${servedApiVersion || this.apiVersion} (Aggregated)`,
          propertyOrAccount: shop,
          fetchedAt: now,
          ...(servedApiVersion && servedApiVersion !== this.apiVersion ? { servedVersionMismatch: { requested: this.apiVersion, served: servedApiVersion } } : {}),
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
