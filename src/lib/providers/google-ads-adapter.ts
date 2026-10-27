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

    return {
      provider: this.providerId,
      displayName: this.displayName,
      category: this.category,
      status: "CONNECTED",
      isConnected: true,
      hasCredentials: true,
      statusMessage: `Connected to Google Ads Customer Account (${conn.account_id || "Active Account"}).`,
      supportedCapabilities: this.supportedCapabilities,
      permissions: JSON.parse(conn.scopes_json || "[]"),
      propertyId: conn.property_id || undefined,
      accountId: conn.account_id || undefined,
      lastSyncAt: conn.last_sync_at || undefined,
      healthStatus: "HEALTHY",
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

  async handleCallback(params: {
    tenantId: string;
    code: string;
    redirectUri: string;
    mockTokens?: { accessToken: string; refreshToken: string; customerId?: string };
  }): Promise<{ success: boolean; customerId?: string; error?: string }> {
    if (params.mockTokens) {
      this.store.saveConnection({
        tenantId: params.tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken: params.mockTokens.accessToken,
        refreshToken: params.mockTokens.refreshToken,
        accountId: params.mockTokens.customerId || "customers/123-456-7890",
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });
      return { success: true, customerId: params.mockTokens.customerId || "customers/123-456-7890" };
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
      this.store.saveConnection({
        tenantId: params.tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        accountId: "customers/active",
        tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
      });

      return { success: true, customerId: "customers/active" };
    } catch (err: any) {
      return { success: false, error: err?.message || "Token exchange failed." };
    }
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

    return {
      provider: this.providerId,
      isAvailable: false,
      dataTimestamp: now,
      metrics: {},
      provenance: { source: "Google Ads", propertyOrAccount: conn.account_id || "UNKNOWN", fetchedAt: now },
      limitations: "Live Google Ads API queries require production manager account approval and active campaign spend.",
    };
  }

  async disconnect(tenantId: string): Promise<boolean> {
    return this.store.deleteConnection(tenantId, this.providerId);
  }
}
