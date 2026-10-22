export interface PageSpeedResult {
  isAvailable: boolean;
  strategy: "mobile" | "desktop";
  performanceScore?: number; // 0 - 100
  cruxFieldData?: {
    lcpMs?: number;
    inpMs?: number;
    cls?: number;
    category?: "FAST" | "AVERAGE" | "SLOW";
  };
  diagnostics?: {
    totalByteWeight?: number;
    renderBlockingResourcesCount?: number;
    criticalPathLatencyMs?: number;
  };
  source: string;
  measuredAt: string;
}

export interface ProviderConnectionState {
  provider: "pagespeed" | "google_analytics_4" | "search_console" | "backlinks" | "serp";
  isConnected: boolean;
  statusMessage: string;
  hasCredentials: boolean;
}
