import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { integrationsManager } from "@/lib/providers/analytics";
import { ProviderId } from "@/lib/providers/types";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.response) return authResult.response;

  const auth = authResult.auth;
  const tenantId = auth.tenant.id;

  try {
    const body = await req.json();
    const provider = body.provider as ProviderId;
    const origin = req.nextUrl.origin;
    
    // Canonical registered callback URI binding: strictly bound to this application's callback
    const canonicalRedirectUri = `${origin}/api/providers/callback?provider=${provider}`;
    const redirectUri = canonicalRedirectUri;

    // Validate provider
    const validProviders: ProviderId[] = [
      "google_analytics_4",
      "search_console",
      "crm_hubspot",
      "commerce_shopify",
      "ads_google",
      "backlinks_serp",
    ];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid or unsupported provider '${provider}'.` },
        { status: 400 }
      );
    }

    // Special validation & metadata binding for Shopify merchant store domain
    let stateMetadata: Record<string, any> = {};
    if (provider === "commerce_shopify") {
      const shopAdapter = integrationsManager.getShopifyAdapter();
      const shopCheck = shopAdapter.validateShopDomain(body.shopDomain);
      if (!shopCheck.isValid || !shopCheck.normalizedShop) {
        return NextResponse.json(
          { error: shopCheck.error || "A valid Shopify store domain (e.g. 'merchant.myshopify.com') is required." },
          { status: 400 }
        );
      }
      stateMetadata.shopDomain = shopCheck.normalizedShop;
    }

    const oauthManager = integrationsManager.getOAuthManager();
    const { state, codeChallenge } = oauthManager.createState(tenantId, provider, redirectUri, stateMetadata);

    let authUrl = "";
    if (provider === "google_analytics_4") {
      const adapter = integrationsManager.getGA4Adapter();
      if (!adapter.isConfigured()) {
        return NextResponse.json(
          { error: "GA4_CLIENT_ID or GA4_CLIENT_SECRET is not configured on the server." },
          { status: 503 }
        );
      }
      authUrl = adapter.startAuthorization({ redirectUri, state, codeChallenge });
    } else if (provider === "search_console") {
      const adapter = integrationsManager.getSearchConsoleAdapter();
      if (!adapter.isConfigured()) {
        return NextResponse.json(
          { error: "GSC_CLIENT_ID or GSC_CLIENT_SECRET is not configured on the server." },
          { status: 503 }
        );
      }
      authUrl = adapter.startAuthorization({ redirectUri, state, codeChallenge });
    } else if (provider === "crm_hubspot") {
      const adapter = integrationsManager.getHubSpotAdapter();
      if (!adapter.isConfigured()) {
        return NextResponse.json(
          { error: "HUBSPOT_CLIENT_ID or HUBSPOT_CLIENT_SECRET is not configured on the server." },
          { status: 503 }
        );
      }
      authUrl = adapter.startAuthorization({ redirectUri, state });
    } else if (provider === "commerce_shopify") {
      const adapter = integrationsManager.getShopifyAdapter();
      if (!adapter.isConfigured()) {
        return NextResponse.json(
          { error: "SHOPIFY_API_KEY or SHOPIFY_API_SECRET is not configured on the server." },
          { status: 503 }
        );
      }
      authUrl = adapter.startAuthorization({ shopDomain: stateMetadata.shopDomain, redirectUri, state });
    } else if (provider === "ads_google") {
      const adapter = integrationsManager.getGoogleAdsAdapter();
      if (!adapter.isConfigured()) {
        return NextResponse.json(
          { error: "GOOGLE_ADS_CLIENT_ID or GOOGLE_ADS_DEVELOPER_TOKEN is not configured." },
          { status: 503 }
        );
      }
      authUrl = adapter.startAuthorization({ redirectUri, state });
    } else if (provider === "backlinks_serp") {
      const adapter = integrationsManager.getBacklinksAdapter();
      if (!adapter.isConfigured()) {
        return NextResponse.json(
          { error: "SERP_API_KEY is not configured on the server." },
          { status: 503 }
        );
      }
      await adapter.activateForTenant(tenantId);
      return NextResponse.json({
        success: true,
        message: "Backlinks & SERP provider activated successfully.",
      });
    }

    return NextResponse.json({
      success: true,
      provider,
      authUrl,
      state,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to initiate provider connection." }, { status: 500 });
  }
}
