import { ProviderConnectionState, ProviderMetricsResult } from "./types";
import { ProviderConnectionStore } from "./connection-store";

export class GoogleAdsAdapter {
  readonly providerId = "ads_google" as const;
  readonly displayName = "Google Ads";
  readonly category = "advertising" as const;
  readonly supportedCapabilities = [
    "Monthly advertising spend & budget utilization",
    "Paid search impressions & ad clicks",
    "Cost per click (CPC) & customer acquisition cost (CAC)",
    "Ad-attributed conversion actions",
  ];
  readonly requiredScopes = ["https://www.googleapis.com/auth/adwords"];

  private store: ProviderConnectionStore;
  private clientId?: string;
  private clientSecret?: string;
  private developerToken?: string;

  constructor(
    store: ProviderConnectionStore,
    clientId?: string,
    clientSecret?: string,
    developerToken?: string
  ) {
    this.store = store;
    this.clientId = clientId || process.env.GOOGLE_ADS_CLIENT_ID || process.env.GA4_CLIENT_ID;
    this.clientSecret = clientSecret || process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GA4_CLIENT_SECRET;
    this.developerToken = developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.developerToken);
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
        statusMessage: "GOOGLE_ADS_CLIENT_ID or GOOGLE_ADS_DEVELOPER_TOKEN environment variable is not configured. Google Ads integration unavailable.",
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
        statusMessage: "Configured and ready. Tenant authorization required to connect Google Ads customer account.",
        supportedCapabilities: this.supportedCapabilities,
        permissions: this.requiredScopes,
      };
    }

    const hasValidCustomer = Boolean(conn.account_id && /^customers\/[0-9\-]+$/.test(conn.account_id));
    const hasDevToken = Boolean(this.developerToken);

    let statusMsg = `Connected to Google Ads Customer Account (${conn.account_id}).`;
    let health: "HEALTHY" | "DEGRADED" = "HEALTHY";

    if (!hasDevToken) {
      statusMsg = "Connected via OAuth, but GOOGLE_ADS_DEVELOPER_TOKEN is not configured. Live queries unavailable.";
      health = "DEGRADED";
    } else if (!hasValidCustomer) {
      statusMsg = "Connected to Google Ads account. Customer account selection required before metrics can be retrieved.";
      health = "DEGRADED";
    }

    return {
      provider: this.providerId,
      displayName: this.displayName,
      category: this.category,
      status: "CONNECTED",
      isConnected: true,
      hasCredentials: true,
      statusMessage: statusMsg,
      supportedCapabilities: this.supportedCapabilities,
      permissions: JSON.parse(conn.scopes_json || "[]"),
      propertyId: conn.property_id || undefined,
      accountId: hasValidCustomer ? conn.account_id! : undefined,
      lastSyncAt: conn.last_sync_at || undefined,
      healthStatus: health,
    };
  }

  startAuthorization(params: {
    redirectUri: string;
    state: string;
  }): string {
    if (!this.clientId) {
      throw new Error("Cannot start authorization: GOOGLE_ADS_CLIENT_ID is not configured.");
    }
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.requiredScopes.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", params.state);
    return url.toString();
  }

  async listAccessibleCustomersWithToken(accessToken: string): Promise<string[]> {
    if (!this.developerToken) return [];
    try {
      const res = await fetch("https://googleads.googleapis.com/v16/customers:listAccessibleCustomers", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": this.developerToken,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.resourceNames) ? data.resourceNames : [];
    } catch {
      return [];
    }
  }

  async handleCallback(params: {
    tenantId: string;
    code: string;
    redirectUri: string;
    mockTokens?: { accessToken: string; refreshToken: string; customerId?: string };
  }): Promise<{ success: boolean; customerId?: string; error?: string }> {
    if (params.mockTokens) {
      const validMockCustomer =
        params.mockTokens.customerId && /^customers\/[0-9\-]+$/.test(params.mockTokens.customerId)
          ? params.mockTokens.customerId
          : undefined;

      this.store.saveConnection({
        tenantId: params.tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken: params.mockTokens.accessToken,
        refreshToken: params.mockTokens.refreshToken,
        accountId: validMockCustomer,
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });
      return { success: true, customerId: validMockCustomer };
    }

    if (!this.clientId || !this.clientSecret) {
      return { success: false, error: "Google Ads OAuth credentials not configured." };
    }

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: params.code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: params.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        return { success: false, error: `Google Ads token exchange failed with HTTP ${tokenRes.status}` };
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;

      let selectedCustomer: string | undefined = undefined;
      const discovered = await this.listAccessibleCustomersWithToken(accessToken);
      if (discovered.length === 1) {
        selectedCustomer = discovered[0];
      }

      this.store.saveConnection({
        tenantId: params.tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken,
        refreshToken,
        accountId: selectedCustomer,
        tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
      });

      return { success: true, customerId: selectedCustomer };
    } catch (err: any) {
      return { success: false, error: err?.message || "Token exchange failed." };
    }
  }

  async listAccessibleCustomers(tenantId: string): Promise<{ success: boolean; customers?: string[]; error?: string }> {
    const conn = this.store.getConnection(tenantId, this.providerId);
    if (!conn || conn.status !== "CONNECTED") {
      return { success: false, error: "Google Ads is not connected." };
    }

    if (!this.developerToken) {
      return {
        success: false,
        error: "GOOGLE_ADS_DEVELOPER_TOKEN is not configured. Google Ads API calls require an approved developer token.",
      };
    }

    let { accessToken, isExpired } = this.store.getDecryptedTokens(tenantId, this.providerId);
    if (isExpired || !accessToken) {
      const refreshed = await this.refreshAccessToken(tenantId);
      if (refreshed) {
        const tokens = this.store.getDecryptedTokens(tenantId, this.providerId);
        accessToken = tokens.accessToken;
      } else {
        return { success: false, error: "Access token expired and refresh failed." };
      }
    }

    try {
      const res = await fetch("https://googleads.googleapis.com/v16/customers:listAccessibleCustomers", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": this.developerToken,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        return { success: false, error: `Google Ads API returned HTTP ${res.status}` };
      }

      const data = await res.json();
      const customers = Array.isArray(data?.resourceNames) ? data.resourceNames : [];
      return { success: true, customers };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to list accessible customers." };
    }
  }

  async selectCustomer(
    tenantId: string,
    rawCustomerId: string
  ): Promise<{ success: boolean; customerId?: string; error?: string }> {
    const conn = this.store.getConnection(tenantId, this.providerId);
    if (!conn || conn.status !== "CONNECTED") {
      return { success: false, error: "Google Ads is not connected." };
    }

    if (!rawCustomerId || typeof rawCustomerId !== "string") {
      return { success: false, error: "Customer ID is required." };
    }

    let normalized = rawCustomerId.trim();
    if (!normalized.startsWith("customers/")) {
      normalized = `customers/${normalized}`;
    }

    if (!/^customers\/[0-9\-]+$/.test(normalized)) {
      return {
        success: false,
        error: `Invalid customer identifier "${rawCustomerId}". Expected format: customers/123-456-7890 (numeric only).`,
      };
    }

    this.store.updateAccountId(tenantId, this.providerId, normalized);
    return { success: true, customerId: normalized };
  }

  async refreshAccessToken(tenantId: string): Promise<boolean> {
    const conn = this.store.getConnection(tenantId, this.providerId);
    if (!conn) return false;
    const { refreshToken } = this.store.getDecryptedTokens(tenantId, this.providerId);
    if (!refreshToken) {
      this.store.updateStatus(tenantId, this.providerId, "AUTH_REQUIRED");
      return false;
    }
    if (!this.clientId || !this.clientSecret) {
      return false;
    }

    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!res.ok) {
        if (res.status === 400 || res.status === 401) {
          this.store.updateStatus(tenantId, this.providerId, "AUTH_REQUIRED");
        }
        return false;
      }

      const tokenData = await res.json();
      const newAccessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in || 3600;
      const newRefreshToken = tokenData.refresh_token || refreshToken;

      this.store.saveConnection({
        tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: JSON.parse(conn.scopes_json || "[]"),
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        propertyId: conn.property_id || undefined,
        accountId: conn.account_id || undefined,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });
      return true;
    } catch {
      return false;
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
          source: "Google Ads API v16 (Mock Fixture)",
          propertyOrAccount: conn?.account_id || "customers/123-456-7890",
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
        provenance: { source: "Google Ads", propertyOrAccount: "NOT_CONNECTED", fetchedAt: now },
        limitations: "Google Ads is not connected. Requires authorized tenant connection.",
      };
    }

    if (!this.developerToken) {
      return {
        provider: this.providerId,
        isAvailable: false,
        dataTimestamp: now,
        metrics: {},
        provenance: { source: "Google Ads API", propertyOrAccount: conn.account_id || "NOT_CONFIGURED", fetchedAt: now },
        limitations: "Google Ads developer token (GOOGLE_ADS_DEVELOPER_TOKEN) is not configured. Google Ads API calls require an approved developer token from Google.",
      };
    }

    if (!conn.account_id || !/^customers\/[0-9\-]+$/.test(conn.account_id)) {
      return {
        provider: this.providerId,
        isAvailable: false,
        dataTimestamp: now,
        metrics: {},
        provenance: { source: "Google Ads API", propertyOrAccount: "NO_CUSTOMER_SELECTED", fetchedAt: now },
        limitations: "No valid Google Ads customer account selected. Customer account selection is required before advertising metrics can be retrieved.",
      };
    }

    let { accessToken, isExpired } = this.store.getDecryptedTokens(tenantId, this.providerId);
    if (isExpired || !accessToken) {
      const refreshed = await this.refreshAccessToken(tenantId);
      if (refreshed) {
        const tokens = this.store.getDecryptedTokens(tenantId, this.providerId);
        accessToken = tokens.accessToken;
      } else {
        return {
          provider: this.providerId,
          isAvailable: false,
          dataTimestamp: now,
          metrics: {},
          provenance: { source: "Google Ads API", propertyOrAccount: conn.account_id, fetchedAt: now },
          limitations: "Access token expired and refresh failed. Re-authentication required.",
        };
      }
    }

    const cleanCustomer = conn.account_id;
    const loginCustomerId = cleanCustomer.replace("customers/", "").replace(/-/g, "");

    try {
      const res = await fetch(`https://googleads.googleapis.com/v16/${cleanCustomer}/googleAds:search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": this.developerToken,
          "login-customer-id": loginCustomerId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: "SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM customer WHERE segments.date DURING LAST_30_DAYS",
        }),
      });

      if (!res.ok) {
        return {
          provider: this.providerId,
          isAvailable: false,
          dataTimestamp: now,
          metrics: {},
          provenance: { source: "Google Ads API v16", propertyOrAccount: cleanCustomer, fetchedAt: now },
          limitations: `Google Ads API returned HTTP ${res.status}. Verify developer token approval and customer account access.`,
        };
      }

      const data = await res.json();
      const results = data?.results || [];
      let totalCostMicros = 0;
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalConversions = 0;

      for (const row of results) {
        totalCostMicros += Number(row?.metrics?.costMicros || 0);
        totalImpressions += Number(row?.metrics?.impressions || 0);
        totalClicks += Number(row?.metrics?.clicks || 0);
        totalConversions += Number(row?.metrics?.conversions || 0);
      }

      const spend = Math.round((totalCostMicros / 1000000) * 100) / 100;
      const cpc = totalClicks > 0 ? Math.round((spend / totalClicks) * 100) / 100 : 0;

      return {
        provider: this.providerId,
        isAvailable: true,
        dataTimestamp: now,
        dateRange: {
          startDate: "LAST_30_DAYS",
          endDate: "today",
        },
        metrics: {
          monthlySpend: spend,
          paidClicks: totalClicks,
          paidImpressions: totalImpressions,
          conversions: totalConversions,
          averageCpc: cpc,
          isAcquisitionContextOnly: true,
        },
        provenance: {
          source: "Google Ads API v16 (Live Search)",
          propertyOrAccount: cleanCustomer,
          fetchedAt: now,
        },
      };
    } catch (err: any) {
      return {
        provider: this.providerId,
        isAvailable: false,
        dataTimestamp: now,
        metrics: {},
        provenance: { source: "Google Ads API", propertyOrAccount: cleanCustomer, fetchedAt: now },
        limitations: `Failed to query Google Ads API: ${err?.message || "Network error"}`,
      };
    }
  }

  async disconnect(tenantId: string): Promise<boolean> {
    return this.store.deleteConnection(tenantId, this.providerId);
  }
}
