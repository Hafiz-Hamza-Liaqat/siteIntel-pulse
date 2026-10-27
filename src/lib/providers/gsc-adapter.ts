import { ProviderConnectionState, ProviderMetricsResult } from "./types";
import { ProviderConnectionStore } from "./connection-store";

export class SearchConsoleAdapter {
  readonly providerId = "search_console" as const;
  readonly displayName = "Google Search Console (GSC)";
  readonly category = "search_console" as const;
  readonly supportedCapabilities = [
    "Organic search clicks & impressions",
    "Average search click-through rate (CTR)",
    "Average keyword ranking position",
    "Indexed site query performance",
  ];
  readonly requiredScopes = ["https://www.googleapis.com/auth/webmasters.readonly"];

  private store: ProviderConnectionStore;
  private clientId?: string;
  private clientSecret?: string;

  constructor(store: ProviderConnectionStore, clientId?: string, clientSecret?: string) {
    this.store = store;
    this.clientId = clientId || process.env.GSC_CLIENT_ID || process.env.GA4_CLIENT_ID;
    this.clientSecret = clientSecret || process.env.GSC_CLIENT_SECRET || process.env.GA4_CLIENT_SECRET;
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
        statusMessage: "GSC_CLIENT_ID or GSC_CLIENT_SECRET environment variable is not configured. Google Search Console integration unavailable.",
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
        statusMessage: "Configured and ready. Tenant authorization required to connect Google Search Console site property.",
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
      statusMessage: `Connected to Google Search Console Site (${conn.property_id || "Verified Property"}).`,
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
    codeChallenge?: string;
  }): string {
    if (!this.clientId) {
      throw new Error("Cannot start authorization: GSC_CLIENT_ID is not configured.");
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

  async handleCallback(params: {
    tenantId: string;
    code: string;
    redirectUri: string;
    codeVerifier?: string;
    mockTokens?: { accessToken: string; refreshToken: string; siteUrl?: string };
  }): Promise<{ success: boolean; siteUrl?: string; error?: string }> {
    if (params.mockTokens) {
      this.store.saveConnection({
        tenantId: params.tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken: params.mockTokens.accessToken,
        refreshToken: params.mockTokens.refreshToken,
        propertyId: params.mockTokens.siteUrl || "sc-domain:example.com",
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });
      return { success: true, siteUrl: params.mockTokens.siteUrl || "sc-domain:example.com" };
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

      this.store.saveConnection({
        tenantId: params.tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken,
        refreshToken,
        propertyId: "sc-domain:verified-site",
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });

      return { success: true, siteUrl: "sc-domain:verified-site" };
    } catch (err: any) {
      return { success: false, error: err?.message || "Token exchange failed." };
    }
  }

  async refreshAccessToken(tenantId: string): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    const conn = this.store.getConnection(tenantId, this.providerId);
    if (!conn) return { success: false, error: "Connection not found." };
    const { refreshToken } = this.store.getDecryptedTokens(tenantId, this.providerId);
    if (!refreshToken) {
      this.store.updateStatus(tenantId, this.providerId, "AUTH_REQUIRED");
      return { success: false, error: "Refresh token missing." };
    }
    if (!this.clientId || !this.clientSecret) {
      return { success: false, error: "OAuth client credentials not configured." };
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
        }).toString(),
      });

      if (!res.ok) {
        if (res.status === 400 || res.status === 401) {
          this.store.updateStatus(tenantId, this.providerId, "AUTH_REQUIRED");
        }
        return { success: false, error: `Google OAuth refresh failed with HTTP ${res.status}` };
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
      return { success: true, accessToken: newAccessToken };
    } catch (err: any) {
      return { success: false, error: err?.message || "Token refresh failed." };
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
          startDate: options.startDate || "2026-09-27",
          endDate: options.endDate || "2026-10-27",
        },
        metrics: options.mockOverride,
        provenance: {
          source: "Google Search Console API (Mock Fixture)",
          propertyOrAccount: conn?.property_id || "sc-domain:example.com",
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
          source: "Google Search Console",
          propertyOrAccount: "NOT_CONNECTED",
          fetchedAt: now,
        },
        limitations: "Google Search Console is not connected. Requires authorized tenant connection.",
      };
    }

    let { accessToken, isExpired } = this.store.getDecryptedTokens(tenantId, this.providerId);
    if (isExpired || !accessToken) {
      const refreshed = await this.refreshAccessToken(tenantId);
      if (refreshed.success) {
        const tokens = this.store.getDecryptedTokens(tenantId, this.providerId);
        accessToken = tokens.accessToken;
        isExpired = tokens.isExpired;
      }
    }

    if (!accessToken || isExpired) {
      return {
        provider: this.providerId,
        isAvailable: false,
        dataTimestamp: now,
        metrics: {},
        provenance: {
          source: "Google Search Console",
          propertyOrAccount: conn.property_id || "UNKNOWN",
          fetchedAt: now,
        },
        limitations: "Access token expired. Re-authentication required.",
      };
    }

    const siteUrl = encodeURIComponent(conn.property_id || "sc-domain:verified-site");
    try {
      const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: options?.startDate || "2026-09-27",
          endDate: options?.endDate || "2026-10-27",
          dimensions: ["query"],
          rowLimit: 10,
        }),
      });

      if (!res.ok) {
        return {
          provider: this.providerId,
          isAvailable: false,
          dataTimestamp: now,
          metrics: {},
          provenance: {
            source: "Google Search Console API",
            propertyOrAccount: conn.property_id || "UNKNOWN",
            fetchedAt: now,
          },
          limitations: `Search Console API returned HTTP ${res.status}. Verify site ownership in Google Search Console.`,
        };
      }

      const gscData = await res.json();
      const rows = gscData?.rows || [];
      const totalClicks = rows.reduce((acc: number, r: any) => acc + (r.clicks || 0), 0);
      const totalImpressions = rows.reduce((acc: number, r: any) => acc + (r.impressions || 0), 0);
      const avgCtr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 10 : 0;
      const avgPosition =
        rows.length > 0 ? Math.round((rows.reduce((acc: number, r: any) => acc + (r.position || 0), 0) / rows.length) * 10) / 10 : 0;

      return {
        provider: this.providerId,
        isAvailable: true,
        dataTimestamp: now,
        dateRange: {
          startDate: options?.startDate || "2026-09-27",
          endDate: options?.endDate || "2026-10-27",
        },
        metrics: {
          clicks: totalClicks,
          impressions: totalImpressions,
          averageCtrPct: avgCtr,
          averagePosition: avgPosition,
          topQueriesCount: rows.length,
        },
        provenance: {
          source: "Google Search Console API v3",
          propertyOrAccount: conn.property_id || "sc-domain:verified-site",
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
          source: "Google Search Console",
          propertyOrAccount: conn.property_id || "UNKNOWN",
          fetchedAt: now,
        },
        limitations: `Failed to retrieve search console metrics: ${err?.message || "Network error"}`,
      };
    }
  }

  async disconnect(tenantId: string): Promise<boolean> {
    return this.store.deleteConnection(tenantId, this.providerId);
  }
}
