import { ProviderConnectionState, ProviderMetricsResult } from "./types";
import { ProviderConnectionStore } from "./connection-store";

export class GA4Adapter {
  readonly providerId = "google_analytics_4" as const;
  readonly displayName = "Google Analytics 4 (GA4)";
  readonly category = "analytics" as const;
  readonly supportedCapabilities = [
    "Active users & sessions tracking",
    "Conversion event counts",
    "Average engagement duration",
    "Traffic acquisition sources",
  ];
  readonly requiredScopes = ["https://www.googleapis.com/auth/analytics.readonly"];

  private store: ProviderConnectionStore;
  private clientId?: string;
  private clientSecret?: string;

  constructor(store: ProviderConnectionStore, clientId?: string, clientSecret?: string) {
    this.store = store;
    this.clientId = clientId || process.env.GA4_CLIENT_ID;
    this.clientSecret = clientSecret || process.env.GA4_CLIENT_SECRET;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
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
        statusMessage: "GA4_CLIENT_ID or GA4_CLIENT_SECRET environment variable is not configured. Google Analytics 4 integration unavailable.",
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
        statusMessage: "Configured and ready. Tenant authorization required to connect Google Analytics 4 property.",
        supportedCapabilities: this.supportedCapabilities,
        permissions: this.requiredScopes,
      };
    }

    const hasValidProperty = Boolean(conn.property_id && /^properties\/[0-9]+$/.test(conn.property_id));
    return {
      provider: this.providerId,
      displayName: this.displayName,
      category: this.category,
      status: "CONNECTED",
      isConnected: true,
      hasCredentials: true,
      statusMessage: hasValidProperty
        ? `Connected to Google Analytics 4 Property (${conn.property_id}).`
        : "Connected to Google Analytics account. Property selection required before traffic can be verified.",
      supportedCapabilities: this.supportedCapabilities,
      permissions: JSON.parse(conn.scopes_json || "[]"),
      propertyId: hasValidProperty ? conn.property_id! : undefined,
      accountId: conn.account_id || undefined,
      lastSyncAt: conn.last_sync_at || undefined,
      healthStatus: hasValidProperty ? "HEALTHY" : "DEGRADED",
    };
  }

  startAuthorization(params: {
    redirectUri: string;
    state: string;
    codeChallenge?: string;
  }): string {
    if (!this.clientId) {
      throw new Error("Cannot start authorization: GA4_CLIENT_ID is not configured.");
    }
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.requiredScopes.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", params.state);
    if (params.codeChallenge) {
      url.searchParams.set("code_challenge", params.codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
    }
    return url.toString();
  }

  async listAccessiblePropertiesWithToken(accessToken: string): Promise<
    Array<{ propertyId: string; displayName: string; accountName?: string }>
  > {
    try {
      const res = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const results: Array<{ propertyId: string; displayName: string; accountName?: string }> = [];
      const summaries = data?.accountSummaries || [];
      for (const account of summaries) {
        for (const prop of account.propertySummaries || []) {
          if (prop.property) {
            results.push({
              propertyId: prop.property,
              displayName: prop.displayName || prop.property,
              accountName: account.displayName || account.account,
            });
          }
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  async handleCallback(params: {
    tenantId: string;
    code: string;
    redirectUri: string;
    codeVerifier?: string;
    mockTokens?: { accessToken: string; refreshToken: string; propertyId?: string };
  }): Promise<{ success: boolean; propertyId?: string; error?: string }> {
    if (params.mockTokens) {
      // Offline contract test path
      const validMockProperty =
        params.mockTokens.propertyId && /^properties\/[0-9]+$/.test(params.mockTokens.propertyId)
          ? params.mockTokens.propertyId
          : undefined;

      this.store.saveConnection({
        tenantId: params.tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken: params.mockTokens.accessToken,
        refreshToken: params.mockTokens.refreshToken,
        propertyId: validMockProperty,
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });
      return { success: true, propertyId: validMockProperty };
    }

    if (!this.clientId || !this.clientSecret) {
      return { success: false, error: "OAuth client credentials not configured." };
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
          ...(params.codeVerifier ? { code_verifier: params.codeVerifier } : {}),
        }),
      });

      if (!tokenRes.ok) {
        return { success: false, error: `Google OAuth exchange failed with HTTP ${tokenRes.status}` };
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in || 3600;

      // Discover accessible GA4 properties
      let selectedProperty: string | undefined = undefined;
      const discovered = await this.listAccessiblePropertiesWithToken(accessToken);
      if (discovered.length === 1) {
        selectedProperty = discovered[0].propertyId;
      }

      this.store.saveConnection({
        tenantId: params.tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken,
        refreshToken,
        propertyId: selectedProperty,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });

      return { success: true, propertyId: selectedProperty };
    } catch (err: any) {
      return { success: false, error: err?.message || "Token exchange failed." };
    }
  }

  async listAccessibleProperties(tenantId: string): Promise<{
    success: boolean;
    properties?: Array<{ propertyId: string; displayName: string; accountName?: string }>;
    error?: string;
  }> {
    const conn = this.store.getConnection(tenantId, this.providerId);
    if (!conn || conn.status !== "CONNECTED") {
      return { success: false, error: "Google Analytics 4 is not connected." };
    }

    const { accessToken, isExpired } = this.store.getDecryptedTokens(tenantId, this.providerId);
    let activeToken = accessToken;

    if (!activeToken || isExpired) {
      const refreshed = await this.refreshAccessToken(tenantId);
      if (refreshed.success && refreshed.accessToken) {
        activeToken = refreshed.accessToken;
      } else {
        return { success: false, error: "Access token expired and refresh failed." };
      }
    }

    try {
      const res = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        return { success: false, error: `Google Analytics Admin API returned HTTP ${res.status}` };
      }

      const data = await res.json();
      const results: Array<{ propertyId: string; displayName: string; accountName?: string }> = [];
      const summaries = data?.accountSummaries || [];
      for (const account of summaries) {
        for (const prop of account.propertySummaries || []) {
          if (prop.property) {
            results.push({
              propertyId: prop.property,
              displayName: prop.displayName || prop.property,
              accountName: account.displayName || account.account,
            });
          }
        }
      }

      return { success: true, properties: results };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to query Google Analytics Admin API" };
    }
  }

  async selectProperty(
    tenantId: string,
    rawPropertyId: string
  ): Promise<{ success: boolean; propertyId?: string; error?: string }> {
    const conn = this.store.getConnection(tenantId, this.providerId);
    if (!conn || conn.status !== "CONNECTED") {
      return { success: false, error: "Google Analytics 4 is not connected." };
    }

    if (!rawPropertyId || typeof rawPropertyId !== "string") {
      return { success: false, error: "Property ID is required." };
    }

    let normalized = rawPropertyId.trim();
    if (!normalized.startsWith("properties/")) {
      normalized = `properties/${normalized}`;
    }

    // Validate syntax: must be properties/{digits}
    if (!/^properties\/[0-9]+$/.test(normalized)) {
      return {
        success: false,
        error: `Invalid property identifier "${rawPropertyId}". Expected format: properties/123456789 (numeric ID only).`,
      };
    }

    // Require listAccessibleProperties to succeed - FAIL CLOSED
    const accessList = await this.listAccessibleProperties(tenantId);
    if (!accessList.success) {
      return {
        success: false,
        error: `Unable to verify property access: ${accessList.error || "Upstream Google Analytics API error"}. Property cannot be authorized.`,
      };
    }

    if (!accessList.properties || accessList.properties.length === 0) {
      return {
        success: false,
        error: "No accessible Google Analytics properties found for this account. Property cannot be authorized.",
      };
    }

    const isAuthorized = accessList.properties.some((p) => p.propertyId === normalized);
    if (!isAuthorized) {
      return {
        success: false,
        error: `Property "${normalized}" is not accessible by the authenticated Google Analytics account.`,
      };
    }

    this.store.updatePropertyId(tenantId, this.providerId, normalized);
    return { success: true, propertyId: normalized };
  }

  async refreshAccessToken(tenantId: string): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    const conn = this.store.getConnection(tenantId, this.providerId);
    if (!conn) return { success: false, error: "Connection record not found." };

    const { refreshToken } = this.store.getDecryptedTokens(tenantId, this.providerId);
    if (!refreshToken) {
      this.store.saveConnection({
        tenantId,
        provider: this.providerId,
        status: "AUTH_REQUIRED",
        scopes: this.requiredScopes,
      });
      return { success: false, error: "Refresh token missing. Re-authentication required." };
    }

    if (!this.clientId || !this.clientSecret) {
      return { success: false, error: "Client credentials not configured for token refresh." };
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
        this.store.saveConnection({
          tenantId,
          provider: this.providerId,
          status: "AUTH_REQUIRED",
          scopes: this.requiredScopes,
        });
        return { success: false, error: `Token refresh failed with HTTP ${res.status}. Re-authentication required.` };
      }

      const tokenData = await res.json();
      const newAccessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in || 3600;

      this.store.saveConnection({
        tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken: newAccessToken,
        refreshToken,
        propertyId: conn.property_id || undefined,
        accountId: conn.account_id || undefined,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });

      return { success: true, accessToken: newAccessToken };
    } catch (err: any) {
      return { success: false, error: err?.message || "Token refresh request failed." };
    }
  }

  async fetchMetrics(
    tenantId: string,
    options?: { startDate?: string; endDate?: string; mockOverride?: Record<string, any> }
  ): Promise<ProviderMetricsResult> {
    const conn = this.store.getConnection(tenantId, this.providerId);
    const now = new Date().toISOString();

    if (options?.mockOverride) {
      return {
        provider: this.providerId,
        isAvailable: true,
        dataTimestamp: now,
        dateRange: {
          startDate: options.startDate || "30daysAgo",
          endDate: options.endDate || "today",
        },
        metrics: options.mockOverride,
        provenance: {
          source: "Google Analytics 4 API (Mock Fixture)",
          propertyOrAccount: conn?.property_id || "properties/mock-987",
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
        provenance: {
          source: "Google Analytics 4",
          propertyOrAccount: "NOT_CONNECTED",
          fetchedAt: now,
        },
        limitations: "Google Analytics 4 is not connected. Requires authorized tenant connection.",
      };
    }

    if (!conn.property_id || !/^properties\/[0-9]+$/.test(conn.property_id)) {
      return {
        provider: this.providerId,
        isAvailable: false,
        dataTimestamp: now,
        metrics: {},
        provenance: {
          source: "Google Analytics 4",
          propertyOrAccount: "NO_PROPERTY_SELECTED",
          fetchedAt: now,
        },
        limitations: "No valid Google Analytics 4 property selected or authorized. Property selection is required before traffic can be verified.",
      };
    }

    const { accessToken, isExpired } = this.store.getDecryptedTokens(tenantId, this.providerId);
    let activeToken = accessToken;

    if (!activeToken || isExpired) {
      const refresh = await this.refreshAccessToken(tenantId);
      if (refresh.success && refresh.accessToken) {
        activeToken = refresh.accessToken;
      } else {
        return {
          provider: this.providerId,
          isAvailable: false,
          dataTimestamp: now,
          metrics: {},
          provenance: {
            source: "Google Analytics 4",
            propertyOrAccount: conn.property_id || "UNKNOWN",
            fetchedAt: now,
          },
          limitations: refresh.error || "Access token expired. Re-authentication required.",
        };
      }
    }

    // Live API call to Google Analytics Data API v1beta
    try {
      const property = conn.property_id;
      const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/${property}:runReport`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: options?.startDate || "30daysAgo", endDate: options?.endDate || "today" }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "conversions" },
            { name: "userEngagementDuration" },
          ],
        }),
      });

      if (!res.ok) {
        return {
          provider: this.providerId,
          isAvailable: false,
          dataTimestamp: now,
          metrics: {},
          provenance: {
            source: "Google Analytics 4 Data API",
            propertyOrAccount: property,
            fetchedAt: now,
          },
          limitations: `Google Analytics Data API returned HTTP ${res.status}. Check property permissions for ${property}.`,
        };
      }

      const reportData = await res.json();
      const row = reportData?.rows?.[0]?.metricValues || [];
      const sessions = Number(row[0]?.value || 0);
      const totalUsers = Number(row[1]?.value || 0);
      const conversions = Number(row[2]?.value || 0);
      const engagementDurationSec = Number(row[3]?.value || 0);

      return {
        provider: this.providerId,
        isAvailable: true,
        dataTimestamp: now,
        dateRange: {
          startDate: options?.startDate || "30daysAgo",
          endDate: options?.endDate || "today",
        },
        metrics: {
          sessions,
          totalUsers,
          conversions,
          conversionRatePct: sessions > 0 ? Math.round((conversions / sessions) * 1000) / 10 : 0,
          averageEngagementSec: sessions > 0 ? Math.round(engagementDurationSec / sessions) : 0,
        },
        provenance: {
          source: "Google Analytics 4 Data API v1beta",
          propertyOrAccount: property,
          fetchedAt: now,
        },
      };
    } catch (err: any) {
      return {
        provider: this.providerId,
        isAvailable: false,
        dataTimestamp: now,
        metrics: {},
        provenance: {
          source: "Google Analytics 4",
          propertyOrAccount: conn.property_id || "UNKNOWN",
          fetchedAt: now,
        },
        limitations: `Failed to retrieve analytics metrics: ${err?.message || "Network error"}`,
      };
    }
  }

  async disconnect(tenantId: string): Promise<boolean> {
    return this.store.deleteConnection(tenantId, this.providerId);
  }
}
