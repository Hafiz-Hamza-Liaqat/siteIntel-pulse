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

export interface ProviderConnectionState {
  provider: "pagespeed" | "google_analytics_4" | "search_console" | "backlinks" | "serp";
  isConnected: boolean;
  statusMessage: string;
  hasCredentials: boolean;
}
