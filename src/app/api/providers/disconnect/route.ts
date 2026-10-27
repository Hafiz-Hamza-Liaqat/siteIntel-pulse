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

    if (!provider) {
      return NextResponse.json({ error: "Provider ID is required." }, { status: 400 });
    }

    let success = false;
    if (provider === "google_analytics_4") {
      success = await integrationsManager.getGA4Adapter().disconnect(tenantId);
    } else if (provider === "search_console") {
      success = await integrationsManager.getSearchConsoleAdapter().disconnect(tenantId);
    } else if (provider === "crm_hubspot") {
      success = await integrationsManager.getHubSpotAdapter().disconnect(tenantId);
    } else if (provider === "commerce_shopify") {
      success = await integrationsManager.getShopifyAdapter().disconnect(tenantId);
    } else if (provider === "ads_google") {
      success = await integrationsManager.getGoogleAdsAdapter().disconnect(tenantId);
    } else if (provider === "backlinks_serp") {
      success = await integrationsManager.getBacklinksAdapter().disconnect(tenantId);
    }

    return NextResponse.json({
      success: true,
      provider,
      disconnected: success,
      message: `${provider} credentials successfully purged for tenant.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to disconnect provider." }, { status: 500 });
  }
}
