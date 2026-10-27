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
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const provider = (searchParams.get("provider") || "google_analytics_4") as ProviderId;

  const redirectBase = `${req.nextUrl.origin}/expert-audit?tab=integrations`;

  if (error) {
    return NextResponse.redirect(`${redirectBase}&error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}&error=${encodeURIComponent("Missing authorization code or state parameter.")}`);
  }

  const oauthManager = integrationsManager.getOAuthManager();
  const validation = oauthManager.validateAndConsumeState(state, tenantId, provider);

  if (!validation.isValid) {
    return NextResponse.redirect(
      `${redirectBase}&error=${encodeURIComponent(validation.rejectionReason || "OAuth state verification failed.")}`
    );
  }

  const redirectUri = validation.redirectUri || `${req.nextUrl.origin}/api/providers/callback`;

  try {
    let result: { success: boolean; error?: string } = { success: false };

    if (provider === "google_analytics_4") {
      result = await integrationsManager.getGA4Adapter().handleCallback({
        tenantId,
        code,
        redirectUri,
        codeVerifier: validation.codeVerifier,
      });
    } else if (provider === "search_console") {
      result = await integrationsManager.getSearchConsoleAdapter().handleCallback({
        tenantId,
        code,
        redirectUri,
        codeVerifier: validation.codeVerifier,
      });
    } else if (provider === "crm_hubspot") {
      result = await integrationsManager.getHubSpotAdapter().handleCallback({
        tenantId,
        code,
        redirectUri,
      });
    } else if (provider === "commerce_shopify") {
      const shopDomain = searchParams.get("shop") || "store.myshopify.com";
      result = await integrationsManager.getShopifyAdapter().handleCallback({
        tenantId,
        shopDomain,
        code,
      });
    } else if (provider === "ads_google") {
      result = await integrationsManager.getGoogleAdsAdapter().handleCallback({
        tenantId,
        code,
        redirectUri,
      });
    }

    if (!result.success) {
      return NextResponse.redirect(`${redirectBase}&error=${encodeURIComponent(result.error || "Token exchange failed.")}`);
    }

    return NextResponse.redirect(`${redirectBase}&connected=${provider}`);
  } catch (err: any) {
    return NextResponse.redirect(`${redirectBase}&error=${encodeURIComponent(err?.message || "Integration error.")}`);
  }
}
