import { ProviderConnectionState, ProviderId } from "./types";
import { scanDb } from "../persistence/db";
import { ProviderConnectionStore } from "./connection-store";
import { OAuthStateManager } from "./oauth-manager";
import { GA4Adapter } from "./ga4-adapter";
import { SearchConsoleAdapter } from "./gsc-adapter";
import { HubSpotCrmAdapter } from "./hubspot-adapter";
import { ShopifyCommerceAdapter } from "./shopify-adapter";
import { GoogleAdsAdapter } from "./google-ads-adapter";
import { BacklinksSerpAdapter } from "./backlinks-serp-adapter";

export class ExternalIntegrationsManager {
  private storeInstance?: ProviderConnectionStore;
  private oauthManagerInstance?: OAuthStateManager;
  private ga4Instance?: GA4Adapter;
  private gscInstance?: SearchConsoleAdapter;
  private hubspotInstance?: HubSpotCrmAdapter;
  private shopifyInstance?: ShopifyCommerceAdapter;
  private adsInstance?: GoogleAdsAdapter;
  private backlinksInstance?: BacklinksSerpAdapter;

  private getStore(): ProviderConnectionStore {
    const rawDb = scanDb.getRawDb();
    if (!this.storeInstance || (this.storeInstance as any).db !== rawDb) {
      this.storeInstance = new ProviderConnectionStore(rawDb);
      this.ga4Instance = undefined;
      this.gscInstance = undefined;
      this.hubspotInstance = undefined;
      this.shopifyInstance = undefined;
      this.adsInstance = undefined;
      this.backlinksInstance = undefined;
    }
    return this.storeInstance;
  }

  getOAuthManager(): OAuthStateManager {
    const rawDb = scanDb.getRawDb();
    if (!this.oauthManagerInstance || (this.oauthManagerInstance as any).db !== rawDb) {
      this.oauthManagerInstance = new OAuthStateManager(rawDb);
    }
    return this.oauthManagerInstance;
  }

  reset(): void {
    this.storeInstance = undefined;
    this.oauthManagerInstance = undefined;
    this.ga4Instance = undefined;
    this.gscInstance = undefined;
    this.hubspotInstance = undefined;
    this.shopifyInstance = undefined;
    this.adsInstance = undefined;
    this.backlinksInstance = undefined;
  }

  getGA4Adapter(): GA4Adapter {
    if (!this.ga4Instance) {
      this.ga4Instance = new GA4Adapter(this.getStore());
    }
    return this.ga4Instance;
  }

  getSearchConsoleAdapter(): SearchConsoleAdapter {
    if (!this.gscInstance) {
      this.gscInstance = new SearchConsoleAdapter(this.getStore());
    }
    return this.gscInstance;
  }

  getHubSpotAdapter(): HubSpotCrmAdapter {
    if (!this.hubspotInstance) {
      this.hubspotInstance = new HubSpotCrmAdapter(this.getStore());
    }
    return this.hubspotInstance;
  }

  getShopifyAdapter(): ShopifyCommerceAdapter {
    if (!this.shopifyInstance) {
      this.shopifyInstance = new ShopifyCommerceAdapter(this.getStore());
    }
    return this.shopifyInstance;
  }

  getGoogleAdsAdapter(): GoogleAdsAdapter {
    if (!this.adsInstance) {
      this.adsInstance = new GoogleAdsAdapter(this.getStore());
    }
    return this.adsInstance;
  }

  getBacklinksAdapter(): BacklinksSerpAdapter {
    if (!this.backlinksInstance) {
      this.backlinksInstance = new BacklinksSerpAdapter(this.getStore());
    }
    return this.backlinksInstance;
  }

  /**
   * Returns asynchronous connection states for all 7 providers for a given tenant.
   */
  async getAllConnectionStates(tenantId?: string): Promise<ProviderConnectionState[]> {
    const tid = tenantId || "tenant-default";

    const ga4 = await this.getGA4Adapter().getConnectionStatus(tid);
    const gsc = await this.getSearchConsoleAdapter().getConnectionStatus(tid);
    const hubspot = await this.getHubSpotAdapter().getConnectionStatus(tid);
    const shopify = await this.getShopifyAdapter().getConnectionStatus(tid);
    const ads = await this.getGoogleAdsAdapter().getConnectionStatus(tid);
    const backlinks = await this.getBacklinksAdapter().getConnectionStatus(tid);

    const hasPageSpeedKey = Boolean(process.env.PAGESPEED_API_KEY);
    const pagespeed: ProviderConnectionState = {
      provider: "pagespeed",
      displayName: "Google PageSpeed Insights API",
      category: "performance",
      status: hasPageSpeedKey ? "CONNECTED" : "NOT_CONFIGURED",
      isConnected: hasPageSpeedKey,
      hasCredentials: hasPageSpeedKey,
      statusMessage: hasPageSpeedKey
        ? "Connected (Google PageSpeed API Key configured for mobile & desktop lab audits)"
        : "Not configured (Using local browser and crawler performance indicators)",
      supportedCapabilities: [
        "Mobile Lighthouse performance audit",
        "Desktop Lighthouse performance audit",
        "Chrome User Experience (CrUX) field data",
      ],
    };

    return [pagespeed, ga4, gsc, hubspot, shopify, ads, backlinks];
  }

  /**
   * Fetches metrics from all connected providers for a tenant.
   */
  async fetchAllMetrics(
    tenantId?: string,
    domain?: string
  ): Promise<Record<string, import("./types").ProviderMetricsResult>> {
    const tid = tenantId || "tenant-default";
    const [ga4, gsc, hubspot, shopify, ads, backlinks] = await Promise.all([
      this.getGA4Adapter().fetchMetrics(tid),
      this.getSearchConsoleAdapter().fetchMetrics(tid),
      this.getHubSpotAdapter().fetchMetrics(tid),
      this.getShopifyAdapter().fetchMetrics(tid),
      this.getGoogleAdsAdapter().fetchMetrics(tid),
      this.getBacklinksAdapter().fetchMetrics(tid, domain || "target.domain"),
    ]);

    return {
      google_analytics_4: ga4,
      search_console: gsc,
      crm_hubspot: hubspot,
      commerce_shopify: shopify,
      ads_google: ads,
      backlinks_serp: backlinks,
    };
  }

  /**
   * Synchronous fallback for legacy callers.
   */
  getConnectionStatuses(): ProviderConnectionState[] {
    const hasPageSpeed = Boolean(process.env.PAGESPEED_API_KEY);
    return [
      {
        provider: "pagespeed",
        displayName: "Google PageSpeed Insights API",
        category: "performance",
        status: hasPageSpeed ? "CONNECTED" : "NOT_CONFIGURED",
        isConnected: hasPageSpeed,
        hasCredentials: hasPageSpeed,
        statusMessage: hasPageSpeed
          ? "Connected (Google PageSpeed API Key configured)"
          : "Not connected (Using local browser/crawler performance indicators)",
        supportedCapabilities: ["Mobile & Desktop lab audits", "Core Web Vitals field data"],
      },
      {
        provider: "google_analytics_4",
        displayName: "Google Analytics 4 (GA4)",
        category: "analytics",
        status: Boolean(process.env.GA4_CLIENT_ID) ? "NOT_CONNECTED" : "NOT_CONFIGURED",
        isConnected: false,
        hasCredentials: Boolean(process.env.GA4_CLIENT_ID),
        statusMessage: Boolean(process.env.GA4_CLIENT_ID)
          ? "Configured. Tenant authorization required."
          : "GA4_CLIENT_ID not configured.",
        supportedCapabilities: ["Sessions & Users", "Conversions"],
      },
      {
        provider: "search_console",
        displayName: "Google Search Console (GSC)",
        category: "search_console",
        status: Boolean(process.env.GSC_CLIENT_ID || process.env.GA4_CLIENT_ID) ? "NOT_CONNECTED" : "NOT_CONFIGURED",
        isConnected: false,
        hasCredentials: Boolean(process.env.GSC_CLIENT_ID || process.env.GA4_CLIENT_ID),
        statusMessage: Boolean(process.env.GSC_CLIENT_ID || process.env.GA4_CLIENT_ID)
          ? "Configured. Site property authorization required."
          : "GSC_CLIENT_ID not configured.",
        supportedCapabilities: ["Clicks & Impressions", "Average Position"],
      },
      {
        provider: "crm_hubspot",
        displayName: "HubSpot CRM",
        category: "crm",
        status: Boolean(process.env.HUBSPOT_CLIENT_ID) ? "NOT_CONNECTED" : "NOT_CONFIGURED",
        isConnected: false,
        hasCredentials: Boolean(process.env.HUBSPOT_CLIENT_ID),
        statusMessage: Boolean(process.env.HUBSPOT_CLIENT_ID)
          ? "Configured. Portal authorization required."
          : "HUBSPOT_CLIENT_ID not configured.",
        supportedCapabilities: ["Lead Pipeline Volume", "Closed-Won Deals"],
      },
      {
        provider: "commerce_shopify",
        displayName: "Shopify Commerce",
        category: "commerce",
        status: Boolean(process.env.SHOPIFY_API_KEY) ? "NOT_CONNECTED" : "NOT_CONFIGURED",
        isConnected: false,
        hasCredentials: Boolean(process.env.SHOPIFY_API_KEY),
        statusMessage: Boolean(process.env.SHOPIFY_API_KEY)
          ? "Configured. Merchant store authorization required."
          : "SHOPIFY_API_KEY not configured.",
        supportedCapabilities: ["Orders & Transactions", "Gross Merchandise Value (GMV)"],
      },
      {
        provider: "ads_google",
        displayName: "Google Ads",
        category: "advertising",
        status: Boolean(process.env.GOOGLE_ADS_CLIENT_ID) ? "NOT_CONNECTED" : "NOT_CONFIGURED",
        isConnected: false,
        hasCredentials: Boolean(process.env.GOOGLE_ADS_CLIENT_ID),
        statusMessage: Boolean(process.env.GOOGLE_ADS_CLIENT_ID)
          ? "Configured. Customer authorization required."
          : "GOOGLE_ADS_CLIENT_ID not configured.",
        supportedCapabilities: ["Ad Spend & Impressions", "Attributed Conversions"],
      },
      {
        provider: "backlinks_serp",
        displayName: "Backlinks & SERP Intelligence",
        category: "seo_backlinks",
        status: Boolean(process.env.SERP_API_KEY) ? "NOT_CONNECTED" : "NOT_CONFIGURED",
        isConnected: false,
        hasCredentials: Boolean(process.env.SERP_API_KEY),
        statusMessage: Boolean(process.env.SERP_API_KEY)
          ? "Configured. Tenant activation available."
          : "SERP_API_KEY not configured.",
        supportedCapabilities: ["Referring Domains", "Domain Authority"],
      },
    ];
  }
}

export const integrationsManager = new ExternalIntegrationsManager();
