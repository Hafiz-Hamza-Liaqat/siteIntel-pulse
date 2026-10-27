import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { integrationsManager } from "@/lib/providers/analytics";
import { ProviderId } from "@/lib/providers/types";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.response) return authResult.response;

  const auth = authResult.auth;
  const tenantId = auth.tenant.id;
  const searchParams = req.nextUrl.searchParams;
  const provider = searchParams.get("provider") as ProviderId;

  if (!provider) {
    return NextResponse.json({ error: "Missing required 'provider' query parameter." }, { status: 400 });
  }

  try {
    let result;
    if (provider === "google_analytics_4") {
      result = await integrationsManager.getGA4Adapter().fetchMetrics(tenantId);
    } else if (provider === "search_console") {
      result = await integrationsManager.getSearchConsoleAdapter().fetchMetrics(tenantId);
    } else if (provider === "crm_hubspot") {
      result = await integrationsManager.getHubSpotAdapter().fetchMetrics(tenantId);
    } else if (provider === "commerce_shopify") {
      result = await integrationsManager.getShopifyAdapter().fetchMetrics(tenantId);
    } else if (provider === "ads_google") {
      result = await integrationsManager.getGoogleAdsAdapter().fetchMetrics(tenantId);
    } else if (provider === "backlinks_serp") {
      const domain = searchParams.get("domain") || "example.com";
      result = await integrationsManager.getBacklinksAdapter().fetchMetrics(tenantId, domain);
    } else {
      return NextResponse.json({ error: `Unsupported provider '${provider}'.` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch provider metrics." }, { status: 500 });
  }
}
