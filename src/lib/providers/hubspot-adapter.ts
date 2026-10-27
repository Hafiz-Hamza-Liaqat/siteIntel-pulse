import { ProviderConnectionState, ProviderMetricsResult } from "./types";
import { ProviderConnectionStore } from "./connection-store";

export class HubSpotCrmAdapter {
  readonly providerId = "crm_hubspot" as const;
  readonly displayName = "HubSpot CRM";
  readonly category = "crm" as const;
  readonly supportedCapabilities = [
    "Qualified lead pipeline volume",
    "Lead-to-customer conversion rate",
    "Closed-won revenue totals",
    "Average deal value (ACV / Deal Size)",
  ];
  readonly requiredScopes = ["crm.objects.contacts.read", "crm.objects.deals.read"];

  private store: ProviderConnectionStore;
  private clientId?: string;
  private clientSecret?: string;

  constructor(store: ProviderConnectionStore, clientId?: string, clientSecret?: string) {
    this.store = store;
    this.clientId = clientId || process.env.HUBSPOT_CLIENT_ID;
    this.clientSecret = clientSecret || process.env.HUBSPOT_CLIENT_SECRET;
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
        statusMessage: "HUBSPOT_CLIENT_ID or HUBSPOT_CLIENT_SECRET environment variable is not configured. HubSpot CRM integration unavailable.",
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
        statusMessage: "Configured and ready. Tenant authorization required to connect HubSpot CRM portal.",
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
      statusMessage: `Connected to HubSpot CRM Portal (${conn.account_id || "Active Portal"}).`,
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
      throw new Error("Cannot start authorization: HUBSPOT_CLIENT_ID is not configured.");
    }
    const url = new URL("https://app.hubspot.com/oauth/authorize");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("scope", this.requiredScopes.join(" "));
    url.searchParams.set("state", params.state);
    return url.toString();
  }

  async handleCallback(params: {
    tenantId: string;
    code: string;
    redirectUri: string;
    mockTokens?: { accessToken: string; refreshToken: string; portalId?: string };
  }): Promise<{ success: boolean; portalId?: string; error?: string }> {
    if (params.mockTokens) {
      this.store.saveConnection({
        tenantId: params.tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken: params.mockTokens.accessToken,
        refreshToken: params.mockTokens.refreshToken,
        accountId: params.mockTokens.portalId || "hubspot-portal-12345",
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      });
      return { success: true, portalId: params.mockTokens.portalId || "hubspot-portal-12345" };
    }

    if (!this.clientId || !this.clientSecret) {
      return { success: false, error: "HubSpot OAuth credentials not configured." };
    }

    try {
      const tokenRes = await fetch("https://api.hubapi.com/oauth/v1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: params.redirectUri,
          code: params.code,
        }),
      });

      if (!tokenRes.ok) {
        return { success: false, error: `HubSpot OAuth exchange failed with HTTP ${tokenRes.status}` };
      }

      const tokenData = await tokenRes.json();
      this.store.saveConnection({
        tenantId: params.tenantId,
        provider: this.providerId,
        status: "CONNECTED",
        scopes: this.requiredScopes,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        accountId: "hubspot-portal-active",
        tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
      });

      return { success: true, portalId: "hubspot-portal-active" };
    } catch (err: any) {
      return { success: false, error: err?.message || "Token exchange failed." };
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
          source: "HubSpot CRM Deals & Contacts API (Mock Fixture)",
          propertyOrAccount: conn?.account_id || "portal-12345",
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
        provenance: { source: "HubSpot CRM", propertyOrAccount: "NOT_CONNECTED", fetchedAt: now },
        limitations: "HubSpot CRM is not connected. Requires authorized tenant connection.",
      };
    }

    const { accessToken, isExpired } = this.store.getDecryptedTokens(tenantId, this.providerId);
    if (!accessToken || isExpired) {
      return {
        provider: this.providerId,
        isAvailable: false,
        dataTimestamp: now,
        metrics: {},
        provenance: { source: "HubSpot CRM", propertyOrAccount: conn.account_id || "UNKNOWN", fetchedAt: now },
        limitations: "Access token expired. Re-authentication required.",
      };
    }

    try {
      const dealsRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals?limit=50&properties=amount,dealstage", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!dealsRes.ok) {
        return {
          provider: this.providerId,
          isAvailable: false,
          dataTimestamp: now,
          metrics: {},
          provenance: { source: "HubSpot CRM API", propertyOrAccount: conn.account_id || "UNKNOWN", fetchedAt: now },
          limitations: `HubSpot API returned HTTP ${dealsRes.status}.`,
        };
      }

      const data = await dealsRes.json();
      const results = data?.results || [];
      const totalDeals = results.length;
      const closedWonDeals = results.filter((d: any) => d.properties?.dealstage === "closedwon");
      const totalRevenue = closedWonDeals.reduce((sum: number, d: any) => sum + Number(d.properties?.amount || 0), 0);
      const avgDealValue = closedWonDeals.length > 0 ? Math.round(totalRevenue / closedWonDeals.length) : 0;
      const closeRatePct = totalDeals > 0 ? Math.round((closedWonDeals.length / totalDeals) * 1000) / 10 : 0;

      return {
        provider: this.providerId,
        isAvailable: true,
        dataTimestamp: now,
        metrics: {
          totalDeals,
          closedWonCount: closedWonDeals.length,
          closedWonRevenue: totalRevenue,
          averageDealValue: avgDealValue,
          leadToCustomerRatePct: closeRatePct,
        },
        provenance: {
          source: "HubSpot CRM v3 Deals API",
          propertyOrAccount: conn.account_id || "Active Portal",
          fetchedAt: now,
        },
      };
    } catch (err: any) {
      return {
        provider: this.providerId,
        isAvailable: false,
        dataTimestamp: now,
        metrics: {},
        provenance: { source: "HubSpot CRM", propertyOrAccount: conn.account_id || "UNKNOWN", fetchedAt: now },
        limitations: `Failed to fetch CRM metrics: ${err?.message || "Network error"}`,
      };
    }
  }

  async disconnect(tenantId: string): Promise<boolean> {
    return this.store.deleteConnection(tenantId, this.providerId);
  }
}
