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
  const error = searchParams.get("error") || searchParams.get("error_description");
  const queryProvider = searchParams.get("provider") as ProviderId | null;

  const redirectBase = `${req.nextUrl.origin}/expert-audit?tab=integrations`;

  if (error) {
    return NextResponse.redirect(`${redirectBase}&error=${encodeURIComponent(`Authorization denied or error from provider: ${error}`)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}&error=${encodeURIComponent("Missing authorization code or state parameter.")}`);
  }

  const oauthManager = integrationsManager.getOAuthManager();
  // Validates state, enforces single-use consumption, confirms tenant, and resolves bound provider
  const validation = oauthManager.validateAndConsumeState(state, tenantId, queryProvider || undefined);

  if (!validation.isValid || !validation.provider) {
    return NextResponse.redirect(
      `${redirectBase}&error=${encodeURIComponent(validation.rejectionReason || "OAuth state verification failed.")}`
    );
  }

  const provider = validation.provider;
  const redirectUri = validation.redirectUri || `${req.nextUrl.origin}/api/providers/callback?provider=${provider}`;

  try {
    let result: { success: boolean; error?: string } = { success: false };

    const isMock = code.startsWith("mock_");

    if (provider === "google_analytics_4") {
      result = await integrationsManager.getGA4Adapter().handleCallback({
        tenantId,
        code,
        redirectUri,
        codeVerifier: validation.codeVerifier,
        mockTokens: isMock ? { accessToken: "ga4_mock_token", refreshToken: "ga4_mock_refresh" } : undefined,
      });
    } else if (provider === "search_console") {
      result = await integrationsManager.getSearchConsoleAdapter().handleCallback({
        tenantId,
        code,
        redirectUri,
        codeVerifier: validation.codeVerifier,
        mockTokens: isMock ? { accessToken: "gsc_mock_token", refreshToken: "gsc_mock_refresh" } : undefined,
      });
    } else if (provider === "crm_hubspot") {
      result = await integrationsManager.getHubSpotAdapter().handleCallback({
        tenantId,
        code,
        redirectUri,
        mockTokens: isMock ? { accessToken: "hs_mock_token", refreshToken: "hs_mock_refresh" } : undefined,
      });
    } else if (provider === "commerce_shopify") {
      const callbackShop = searchParams.get("shop");
      const boundShop = validation.metadata?.shopDomain;

      // Ensure merchant store matches initiating authorization
      if (boundShop && callbackShop && callbackShop.toLowerCase() !== boundShop.toLowerCase()) {
        return NextResponse.redirect(
          `${redirectBase}&error=${encodeURIComponent("Shopify shop domain mismatch between authorization and callback.")}`
        );
      }

      const effectiveShop = callbackShop || boundShop;
      if (!effectiveShop) {
        return NextResponse.redirect(
          `${redirectBase}&error=${encodeURIComponent("Missing shop parameter in Shopify callback.")}`
        );
      }

      // Collect all query params for HMAC validation
      const queryParamsRecord: Record<string, string> = {};
      searchParams.forEach((val, key) => {
        queryParamsRecord[key] = val;
      });

      result = await integrationsManager.getShopifyAdapter().handleCallback({
        tenantId,
        shopDomain: effectiveShop,
        code,
        queryParams: queryParamsRecord,
        mockTokens: isMock ? { accessToken: "shpat_mock_token" } : undefined,
      });
    } else if (provider === "ads_google") {
      result = await integrationsManager.getGoogleAdsAdapter().handleCallback({
        tenantId,
        code,
        redirectUri,
        mockTokens: isMock ? { accessToken: "ads_mock_token", refreshToken: "ads_mock_refresh" } : undefined,
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
