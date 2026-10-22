import { ProviderConnectionState } from "./types";

export class ExternalIntegrationsManager {
  getConnectionStatuses(): ProviderConnectionState[] {
    return [
      {
        provider: "pagespeed",
        isConnected: Boolean(process.env.PAGESPEED_API_KEY),
        statusMessage: process.env.PAGESPEED_API_KEY
          ? "Connected (Google PageSpeed API Key configured)"
          : "Not connected (Using local browser/crawler performance indicators)",
        hasCredentials: Boolean(process.env.PAGESPEED_API_KEY),
      },
      {
        provider: "google_analytics_4",
        isConnected: false,
        statusMessage: "Not connected (Requires owner authorization for Milestone 2)",
        hasCredentials: false,
      },
      {
        provider: "search_console",
        isConnected: false,
        statusMessage: "Not connected (Requires owner authorization for Milestone 2)",
        hasCredentials: false,
      },
      {
        provider: "backlinks",
        isConnected: false,
        statusMessage: "Not connected (Third-party backlink provider not configured)",
        hasCredentials: false,
      },
      {
        provider: "serp",
        isConnected: false,
        statusMessage: "Not connected (Search engine ranking provider not configured)",
        hasCredentials: false,
      },
    ];
  }
}

export const integrationsManager = new ExternalIntegrationsManager();
