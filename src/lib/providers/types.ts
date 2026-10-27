export interface PageSpeedLabMetrics {
  speedIndexMs?: number;
  fcpMs?: number;
  lcpMs?: number;
  tbtMs?: number;
  ttfbMs?: number;
}

export interface PageSpeedFieldMetrics {
  fcpMs?: number;
  lcpMs?: number;
  inpMs?: number;
  cls?: number;
  category?: "FAST" | "AVERAGE" | "SLOW";
  lcpPercentile?: number;
  inpPercentile?: number;
  clsPercentile?: number;
}

export interface PageSpeedResult {
  isAvailable: boolean;
  strategy: "mobile" | "desktop";
  performanceScore?: number; // 0 - 100
  labMetrics?: PageSpeedLabMetrics;
  cruxFieldData?: PageSpeedFieldMetrics;
  diagnostics?: {
    totalByteWeight?: number;
    renderBlockingResourcesCount?: number;
    criticalPathLatencyMs?: number;
  };
  providerName?: string;
  unconfiguredReason?: string;
  source: string;
  measuredAt: string;
}

export type ProviderId =
  | "pagespeed"
  | "google_analytics_4"
  | "search_console"
  | "crm_hubspot"
  | "commerce_shopify"
  | "ads_google"
  | "backlinks_serp";

export type ProviderConnectionStatus =
  | "NOT_CONFIGURED"
  | "NOT_CONNECTED"
  | "AUTH_REQUIRED"
  | "INSUFFICIENT_SCOPE"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "STALE"
  | "CONNECTED"
  | "ERROR";

export interface ProviderConnectionState {
  provider: ProviderId;
  displayName: string;
  category: "analytics" | "search_console" | "crm" | "commerce" | "advertising" | "seo_backlinks" | "performance";
  status: ProviderConnectionStatus;
  isConnected: boolean;
  statusMessage: string;
  hasCredentials: boolean;
  supportedCapabilities: string[];
  permissions?: string[];
  accountId?: string;
  propertyId?: string;
  lastSyncAt?: string;
  healthStatus?: "HEALTHY" | "DEGRADED" | "FAILING";
  configuredScope?: string[];
}

export interface ProviderMetricsResult {
  provider: ProviderId;
  isAvailable: boolean;
  dataTimestamp: string;
  dateRange?: { startDate: string; endDate: string };
  metrics: Record<string, any>;
  provenance: {
    source: string;
    propertyOrAccount: string;
    isSimulatedOrMock?: boolean;
    fetchedAt: string;
    reportingPeriod?: Record<string, any>;
  };
  limitations?: string;
}
