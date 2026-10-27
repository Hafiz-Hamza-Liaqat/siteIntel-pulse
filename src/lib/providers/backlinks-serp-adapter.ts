import { ProviderConnectionState, ProviderMetricsResult } from "./types";
import { ProviderConnectionStore } from "./connection-store";

export class BacklinksSerpAdapter {
  readonly providerId = "backlinks_serp" as const;
  readonly displayName = "Backlinks & SERP Intelligence";
  readonly category = "seo_backlinks" as const;
  readonly supportedCapabilities = [
    "Referring domains & backlink profile count",
    "Domain authority & link equity rating",
    "Organic search keyword rankings count",
    "Direct competitor domain overlap rankings",
  ];

  private store: ProviderConnectionStore;
  private apiKey?: string;

  constructor(store: ProviderConnectionStore, apiKey?: string) {
    this.store = store;
    this.apiKey = apiKey || process.env.SERP_API_KEY || process.env.BACKLINK_API_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
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
        statusMessage: "SERP_API_KEY or BACKLINK_API_KEY environment variable is not configured. Third-party link intelligence unavailable.",
        supportedCapabilities: this.supportedCapabilities,
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
        statusMessage: "API key configured. Tenant activation available for live domain backlinks and SERP rank tracking.",
        supportedCapabilities: this.supportedCapabilities,
      };
    }

    return {
      provider: this.providerId,
      displayName: this.displayName,
      category: this.category,
      status: "CONNECTED",
      isConnected: true,
      hasCredentials: true,
      statusMessage: "Connected to third-party SEO intelligence data provider.",
      supportedCapabilities: this.supportedCapabilities,
      lastSyncAt: conn.last_sync_at || undefined,
      healthStatus: "HEALTHY",
    };
  }

  async activateForTenant(tenantId: string): Promise<boolean> {
    if (!this.apiKey) {
      throw new Error("Cannot activate: SERP_API_KEY is not configured.");
    }
    this.store.saveConnection({
      tenantId,
      provider: this.providerId,
      status: "CONNECTED",
      scopes: ["serp_read", "backlinks_read"],
      accessToken: this.apiKey,
    });
    return true;
  }

  async fetchMetrics(
    tenantId: string,
    domain: string,
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
          source: "SEO Intelligence Data API (Mock Fixture)",
          propertyOrAccount: domain,
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
        provenance: { source: "SEO Data Provider", propertyOrAccount: domain, fetchedAt: now },
        limitations: "Backlinks & SERP intelligence is not connected. Requires configured API provider key.",
      };
    }

    return {
      provider: this.providerId,
      isAvailable: false,
      dataTimestamp: now,
      metrics: {},
      provenance: { source: "SEO Data Provider", propertyOrAccount: domain, fetchedAt: now },
      limitations: "Commercial backlink provider subscription required for live off-page link graph analysis.",
    };
  }

  async disconnect(tenantId: string): Promise<boolean> {
    return this.store.deleteConnection(tenantId, this.providerId);
  }
}
