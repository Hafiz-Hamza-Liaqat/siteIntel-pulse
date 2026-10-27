import {
  CostOfInactionResult,
  BusinessModelType,
  BusinessCategory,
  ScanRequest,
  AssessmentResult,
  Confidence,
} from "@/types";
import {
  getCurrencySymbol,
  formatCurrency,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
  type FormatCurrencyOptions,
} from "./currency.ts";

export { getCurrencySymbol, formatCurrency, SUPPORTED_CURRENCIES };
export type { SupportedCurrency, FormatCurrencyOptions };

export interface CostOfInactionOptions {
  businessCategory: BusinessCategory;
  request?: Partial<ScanRequest>;
  results?: AssessmentResult[];
  remediationCostEstimate?: number;
  connectedMetrics?: Record<string, any>;
}

export function calculateCostOfInaction(options: CostOfInactionOptions): CostOfInactionResult {
  const now = new Date().toISOString();
  const { businessCategory, request, results = [], connectedMetrics } = options;

  // 1. Determine Business Model
  let model: BusinessModelType = "other";
  if (businessCategory === "ecommerce" || businessCategory === "marketplace") {
    model = "ecommerce";
  } else if (businessCategory === "saas") {
    model = "saas_subscription";
  } else if (
    businessCategory === "local_service" ||
    businessCategory === "portfolio" ||
    businessCategory === "job_board" ||
    businessCategory === "jobs_marketplace" ||
    businessCategory === "publisher" ||
    businessCategory === "nonprofit" ||
    businessCategory === "other"
  ) {
    model = "lead_gen";
  } else {
    model = "lead_gen";
  }

  // Extract connected provider metrics
  const ga4 = connectedMetrics?.google_analytics_4?.isAvailable ? connectedMetrics.google_analytics_4 : undefined;
  const rawShopify = connectedMetrics?.commerce_shopify;
  const shopify = rawShopify?.isAvailable ? rawShopify : undefined;
  const hubspot = connectedMetrics?.crm_hubspot?.isAvailable ? connectedMetrics.crm_hubspot : undefined;
  const gsc = connectedMetrics?.search_console?.isAvailable ? connectedMetrics.search_console : undefined;
  const ads = connectedMetrics?.ads_google?.isAvailable ? connectedMetrics.ads_google : undefined;
  const backlinks = connectedMetrics?.backlinks_serp?.isAvailable ? connectedMetrics.backlinks_serp : undefined;

  // Input Precedence: Explicit Owner Intake > Connected Provider Data > Fallback
  let monthlySessions: number | undefined = undefined;
  let sessionSource = "Unprovided";
  const ga4Sessions = ga4?.metrics?.sessions ?? ga4?.metrics?.sessionsCount;
  if (request?.monthlySessions && request.monthlySessions > 0) {
    monthlySessions = request.monthlySessions;
    sessionSource = "Owner Intake";
  } else if (ga4Sessions && Number(ga4Sessions) > 0) {
    monthlySessions = Number(ga4Sessions);
    sessionSource = "Connected GA4";
  }

  const shopifyCurrency =
    shopify?.isAvailable && shopify.metrics?.currency && !shopify.metrics?.isIncomplete
      ? shopify.metrics.currency
      : undefined;
  const rawCurrency = request?.currency || shopifyCurrency || "USD";
  const currency =
    typeof rawCurrency === "string" && /^[A-Z]{3}$/.test(rawCurrency.trim().toUpperCase())
      ? rawCurrency.trim().toUpperCase()
      : "USD";
  const explicitAov = request?.averageOrderValue;
  const explicitLeadConv = request?.leadConversionRatePct;
  const explicitLeadToCust = request?.leadToCustomerRatePct;
  const explicitCustomerValue = request?.customerValue;
  const explicitSubscriptionRev = request?.subscriptionRevenue;

  // Explicit check for grossMarginPct: 0 is a valid, distinct input from undefined
  const hasExplicitGrossMargin =
    request?.grossMarginPct != null && !isNaN(Number(request.grossMarginPct));
  const explicitGrossMarginPct = hasExplicitGrossMargin ? Number(request.grossMarginPct) : undefined;
  const marginMultiplier = hasExplicitGrossMargin
    ? Math.max(0, Math.min(100, explicitGrossMarginPct!)) / 100
    : 1.0;

  const formula = hasExplicitGrossMargin
    ? "Gross Profit Opportunity = Monthly Sessions × Incremental Conversion Lift (% pts) × Transaction / Customer Value [× Close Rate] × Gross Margin %"
    : "Gross Revenue Opportunity = Monthly Sessions × Incremental Conversion Lift (% pts) × Transaction / Customer Value [× Close Rate]";

  // 2. Insufficient Inputs Check
  // Financial opportunity modeling requires at minimum verified monthly session traffic.
  // We strictly refuse to fabricate synthetic traffic counts when none are provided.
  if (!monthlySessions || monthlySessions <= 0) {
    return {
      status: "INSUFFICIENT_INPUTS",
      businessModel: model,
      inputsProvided: {
        monthlySessions: null,
        averageOrderValue: explicitAov ?? null,
        leadConversionRatePct: explicitLeadConv ?? null,
        leadToCustomerRatePct: explicitLeadToCust ?? null,
        customerValue: explicitCustomerValue ?? null,
        subscriptionRevenue: explicitSubscriptionRev ?? null,
        grossMarginPct: explicitGrossMarginPct ?? null,
        currency,
        connectedContext: connectedMetrics
          ? {
              ga4: ga4?.metrics,
              shopify: shopify ? { ...shopify.metrics, customers: undefined } : undefined,
              hubspot: hubspot?.metrics,
              searchConsole: gsc?.metrics,
              googleAds: ads?.metrics,
              backlinks: backlinks?.metrics,
            }
          : undefined,
      },
      currency,
      formula,
      assumptions: [
        "[Input Required] Financial opportunity modeling requires verified monthly session traffic counts.",
        "[Verification Policy] Synthetic traffic counts are never silently fabricated when unprovided by the business owner.",
        "[Intake Guidance] Supply monthly visitor sessions in scan intake or connect Google Analytics 4 to unlock conservative, base, and upside scenarios.",
      ],
      disclaimers: [
        "Modeled opportunity represents forward-looking potential financial lift from resolving identified UX, speed, and conversion barriers, NOT verified historical lost revenue.",
        "Model results are illustrative simulations and do not guarantee future commercial outcomes.",
      ],
      inputSource: "Owner Input Required",
      calculatedAt: now,
      confidence: "LOW",
      methodologyNotes:
        "Inputs insufficient: Please supply monthly session traffic or connect GA4 to calculate conservative, base, and upside commercial growth scenarios.",
    };
  }

  // 3. Documented Scenario Conversion Lift Bounds
  // Calibrated scenario lift tiers (absolute percentage-point increases in conversion rate):
  // - Conservative (+0.20% absolute lift): Fast wins from resolving layout shifts, broken touch targets, and contrast.
  // - Base (+0.50% absolute lift): Comprehensive repair of Core Web Vitals, form validation, and CTA hierarchy.
  // - Upside (+1.00% absolute lift): Full-funnel optimization with fast server response and friction-free interaction pathways.
  const conservativeDelta = 0.002; // +0.20 percentage points
  const baseDelta = 0.005;         // +0.50 percentage points
  const upsideDelta = 0.010;       // +1.00 percentage points

  let monthlyRevConservative = 0;
  let monthlyRevBase = 0;
  let monthlyRevUpside = 0;

  let baselineConversionRatePct: number;
  let hasOwnerCommercialValues = false;
  let hasConnectedCommercialValues = false;

  let effectiveAovForInputs: number | null = null;
  let effectiveAcvForInputs: number | null = null;
  let effectiveCloseRateForInputs: number | null = null;

  const assumptions: string[] = [];

  if (sessionSource === "Owner Intake") {
    assumptions.push(`[Owner Provided] Monthly traffic: ${monthlySessions.toLocaleString()} unique visitor sessions.`);
  } else {
    assumptions.push(
      `[Verified Provider - GA4] Monthly traffic: ${monthlySessions.toLocaleString()} sessions verified from connected Google Analytics 4 property (${ga4?.provenance?.propertyOrAccount || "Connected Property"}).`
    );
  }

  assumptions.push(
    "[Funnel Model] Deduplicated visitor funnel: Speed, mobile touch targets, and form friction are treated as a unified conversion funnel to prevent double-counting the same visitors across diagnostic categories.",
    "[Illustrative Scenario Assumption] Modeled conversion lift is an illustrative absolute percentage-point increase (+0.20% Conservative, +0.50% Base, +1.00% Upside) from eliminating observable site barriers. The baseline rate provides context and before/after comparison; it does not compound or multiply the incremental lift calculation."
  );

  if (hasExplicitGrossMargin) {
    assumptions.push(
      `[Owner Provided] Gross Margin: ${explicitGrossMarginPct}% applied. Financial scenarios reflect modeled gross profit contribution.`
    );
    if (explicitGrossMarginPct === 0) {
      assumptions.push(
        `[Owner Provided] Zero gross margin (0%): Modeled gross profit opportunity is ${formatCurrency(0, currency)}; top-line revenue opportunity is tracked separately.`
      );
    }
  } else {
    assumptions.push(
      "[Default Scenario Assumption - Illustrative] Gross Margin: 100% applied (represents top-line revenue opportunity; supply gross margin % in intake to evaluate net profit contribution)."
    );
  }

  if (model === "ecommerce") {
    let effectiveAov: number;
    if (explicitAov && explicitAov > 0) {
      effectiveAov = explicitAov;
      hasOwnerCommercialValues = true;
      assumptions.push(
        `[Owner Provided] Average Order Value (AOV): ${formatCurrency(effectiveAov, currency)}.`
      );
    } else if (
      shopify?.isAvailable &&
      shopify?.metrics?.averageOrderValue &&
      Number(shopify.metrics.averageOrderValue) > 0 &&
      shopify.metrics.paginationComplete !== false &&
      !shopify.metrics.isIncomplete &&
      shopify.metrics.currency &&
      (!request?.currency || request.currency.toUpperCase() === shopify.metrics.currency.toUpperCase())
    ) {
      effectiveAov = Number(shopify.metrics.averageOrderValue);
      hasConnectedCommercialValues = true;
      assumptions.push(
        `[Verified Provider - Shopify] Average Order Value (AOV): ${formatCurrency(effectiveAov, currency)} verified from connected Shopify store transactions.`
      );
    } else {
      effectiveAov = 85.0;
      if (rawShopify && (!rawShopify.isAvailable || rawShopify.metrics?.paginationComplete === false || rawShopify.metrics?.isIncomplete)) {
        assumptions.push(
          `[Default Scenario Assumption - Illustrative] Average Order Value (AOV): ${formatCurrency(effectiveAov, currency)} baseline assumed because connected Shopify data is incomplete or unavailable.`
        );
      } else {
        assumptions.push(
          `[Default Scenario Assumption - Illustrative] Average Order Value (AOV): ${formatCurrency(effectiveAov, currency)} baseline assumed because owner did not specify AOV.`
        );
      }
    }
    effectiveAovForInputs = effectiveAov;

    if (explicitLeadConv != null && explicitLeadConv > 0) {
      baselineConversionRatePct = Number(explicitLeadConv);
      assumptions.push(
        `[Owner Provided] Current baseline conversion rate: ${baselineConversionRatePct.toFixed(2)}%.`
      );
    } else if (ga4?.metrics?.conversionRatePct && Number(ga4.metrics.conversionRatePct) > 0) {
      baselineConversionRatePct = Number(ga4.metrics.conversionRatePct);
      assumptions.push(
        `[Verified Provider - GA4] Current baseline conversion rate: ${baselineConversionRatePct.toFixed(2)}% verified from Google Analytics 4.`
      );
    } else {
      baselineConversionRatePct = 1.80;
      assumptions.push(
        `[Default Scenario Assumption - Illustrative] Current baseline conversion rate: ${baselineConversionRatePct.toFixed(2)}% benchmark assumed.`
      );
    }

    monthlyRevConservative = monthlySessions * conservativeDelta * effectiveAov;
    monthlyRevBase = monthlySessions * baseDelta * effectiveAov;
    monthlyRevUpside = monthlySessions * upsideDelta * effectiveAov;
  } else if (model === "saas_subscription") {
    let effectiveArpu: number;
    const suppliedArpu = explicitSubscriptionRev ?? explicitCustomerValue;
    if (suppliedArpu && suppliedArpu > 0) {
      effectiveArpu = suppliedArpu;
      hasOwnerCommercialValues = true;
      assumptions.push(
        `[Owner Provided] Monthly Average Revenue Per User (ARPU): ${formatCurrency(effectiveArpu, currency)}.`
      );
    } else if (hubspot?.metrics?.averageDealValue && Number(hubspot.metrics.averageDealValue) > 0) {
      effectiveArpu = Number(hubspot.metrics.averageDealValue);
      hasConnectedCommercialValues = true;
      assumptions.push(
        `[Verified Provider - HubSpot] Monthly ARPU: ${formatCurrency(effectiveArpu, currency)} derived from CRM deal sizes.`
      );
    } else {
      effectiveArpu = 65.0;
      assumptions.push(
        `[Default Scenario Assumption - Illustrative] Monthly ARPU: ${formatCurrency(effectiveArpu, currency)} baseline assumed because owner did not specify subscription revenue.`
      );
    }
    effectiveAcvForInputs = effectiveArpu;

    if (explicitLeadConv != null && explicitLeadConv > 0) {
      baselineConversionRatePct = Number(explicitLeadConv);
      assumptions.push(
        `[Owner Provided] Current baseline visitor-to-trial rate: ${baselineConversionRatePct.toFixed(2)}%.`
      );
    } else if (ga4?.metrics?.conversionRatePct && Number(ga4.metrics.conversionRatePct) > 0) {
      baselineConversionRatePct = Number(ga4.metrics.conversionRatePct);
      assumptions.push(
        `[Verified Provider - GA4] Current baseline visitor-to-trial rate: ${baselineConversionRatePct.toFixed(2)}% verified from GA4.`
      );
    } else {
      baselineConversionRatePct = 3.00;
      assumptions.push(
        `[Default Scenario Assumption - Illustrative] Current baseline visitor-to-trial rate: ${baselineConversionRatePct.toFixed(2)}% benchmark assumed.`
      );
    }

    let effectiveCloseRate = 0.18; // 18% trial-to-paid
    if (explicitLeadToCust != null && explicitLeadToCust > 0) {
      effectiveCloseRate = explicitLeadToCust / 100;
      assumptions.push(
        `[Owner Provided] Trial-to-Paid customer conversion rate: ${explicitLeadToCust}%.`
      );
    } else if (hubspot?.metrics?.leadToCustomerRatePct && Number(hubspot.metrics.leadToCustomerRatePct) > 0) {
      effectiveCloseRate = Number(hubspot.metrics.leadToCustomerRatePct) / 100;
      hasConnectedCommercialValues = true;
      assumptions.push(
        `[Verified Provider - HubSpot] Trial-to-Paid customer conversion rate: ${hubspot.metrics.leadToCustomerRatePct}% verified from CRM pipeline.`
      );
    } else {
      assumptions.push(
        `[Default Scenario Assumption - Illustrative] Trial-to-Paid close rate: ${(effectiveCloseRate * 100).toFixed(1)}% benchmark assumed.`
      );
    }
    effectiveCloseRateForInputs = effectiveCloseRate * 100;

    // Incremental paid subscribers = sessions × lift × close rate
    monthlyRevConservative = monthlySessions * conservativeDelta * effectiveCloseRate * effectiveArpu;
    monthlyRevBase = monthlySessions * baseDelta * effectiveCloseRate * effectiveArpu;
    monthlyRevUpside = monthlySessions * upsideDelta * effectiveCloseRate * effectiveArpu;
  } else {
    // Lead generation & service businesses
    let effectiveAcv: number;
    if (explicitCustomerValue && explicitCustomerValue > 0) {
      effectiveAcv = explicitCustomerValue;
      hasOwnerCommercialValues = true;
      assumptions.push(
        `[Owner Provided] Average Customer Value (ACV): ${formatCurrency(effectiveAcv, currency)}.`
      );
    } else if (hubspot?.metrics?.averageDealValue && Number(hubspot.metrics.averageDealValue) > 0) {
      effectiveAcv = Number(hubspot.metrics.averageDealValue);
      hasConnectedCommercialValues = true;
      assumptions.push(
        `[Verified Provider - HubSpot] Average Deal Value (ACV): ${formatCurrency(effectiveAcv, currency)} verified from HubSpot CRM closed-won deals.`
      );
    } else {
      effectiveAcv = 750.0;
      assumptions.push(
        `[Default Scenario Assumption - Illustrative] Average Customer Value (ACV): ${formatCurrency(effectiveAcv, currency)} baseline assumed because owner did not specify customer value.`
      );
    }
    effectiveAcvForInputs = effectiveAcv;

    if (explicitLeadConv != null && explicitLeadConv > 0) {
      baselineConversionRatePct = Number(explicitLeadConv);
      assumptions.push(
        `[Owner Provided] Current baseline visitor-to-lead conversion rate: ${baselineConversionRatePct.toFixed(2)}%.`
      );
    } else if (ga4?.metrics?.conversionRatePct && Number(ga4.metrics.conversionRatePct) > 0) {
      baselineConversionRatePct = Number(ga4.metrics.conversionRatePct);
      assumptions.push(
        `[Verified Provider - GA4] Current baseline visitor-to-lead rate: ${baselineConversionRatePct.toFixed(2)}% verified from GA4.`
      );
    } else {
      baselineConversionRatePct = 2.50;
      assumptions.push(
        `[Default Scenario Assumption - Illustrative] Current baseline visitor-to-lead rate: ${baselineConversionRatePct.toFixed(2)}% benchmark assumed.`
      );
    }

    let effectiveCloseRate = 0.15; // 15% lead-to-client close rate
    if (explicitLeadToCust != null && explicitLeadToCust > 0) {
      effectiveCloseRate = explicitLeadToCust / 100;
      assumptions.push(
        `[Owner Provided] Lead-to-Client close rate: ${explicitLeadToCust}%.`
      );
    } else if (hubspot?.metrics?.leadToCustomerRatePct && Number(hubspot.metrics.leadToCustomerRatePct) > 0) {
      effectiveCloseRate = Number(hubspot.metrics.leadToCustomerRatePct) / 100;
      hasConnectedCommercialValues = true;
      assumptions.push(
        `[Verified Provider - HubSpot] Lead-to-Client close rate: ${hubspot.metrics.leadToCustomerRatePct}% verified from HubSpot CRM pipeline.`
      );
    } else {
      assumptions.push(
        `[Default Scenario Assumption - Illustrative] Lead-to-Client close rate: ${(effectiveCloseRate * 100).toFixed(1)}% benchmark assumed.`
      );
    }
    effectiveCloseRateForInputs = effectiveCloseRate * 100;

    // Incremental clients = sessions × lift × close rate
    monthlyRevConservative = monthlySessions * conservativeDelta * effectiveCloseRate * effectiveAcv;
    monthlyRevBase = monthlySessions * baseDelta * effectiveCloseRate * effectiveAcv;
    monthlyRevUpside = monthlySessions * upsideDelta * effectiveCloseRate * effectiveAcv;
  }

  // Acquisition and Traffic Quality Context Disclosures
  if (gsc) {
    assumptions.push(
      `[Verified Acquisition Context - Google Search Console] Verified ${gsc.metrics.impressions?.toLocaleString()} impressions, ${gsc.metrics.clicks?.toLocaleString()} clicks, ${gsc.metrics.averageCtrPct}% CTR, average position ${gsc.metrics.averagePosition}. Note: Organic search clicks and impressions represent acquisition volume and are NOT treated as direct sales.`
    );
  }
  if (ads) {
    assumptions.push(
      `[Verified Acquisition Context - Google Ads] Verified ${formatCurrency(ads.metrics.monthlySpend || 0, currency)} monthly ad spend and ${ads.metrics.clicks?.toLocaleString()} paid clicks. Ad spend informs customer acquisition cost and is NOT treated as sales revenue.`
    );
  }
  if (backlinks) {
    assumptions.push(
      `[Verified Acquisition Context - SERP / Backlinks] Verified Domain Rating ${backlinks.metrics.domainRating} with ${backlinks.metrics.referringDomainsCount?.toLocaleString()} referring domains and ${backlinks.metrics.totalBacklinks?.toLocaleString()} total backlinks.`
    );
  }

  // Calculate gross profit opportunities
  const monthlyGPConservative = monthlyRevConservative * marginMultiplier;
  const monthlyGPBase = monthlyRevBase * marginMultiplier;
  const monthlyGPUpside = monthlyRevUpside * marginMultiplier;

  // Effective opportunity is Gross Profit if gross margin explicitly specified, else Gross Revenue
  const monthlyConservative = Math.round(hasExplicitGrossMargin ? monthlyGPConservative : monthlyRevConservative);
  const monthlyBase = Math.round(hasExplicitGrossMargin ? monthlyGPBase : monthlyRevBase);
  const monthlyUpside = Math.round(hasExplicitGrossMargin ? monthlyGPUpside : monthlyRevUpside);

  const annualConservative = monthlyConservative * 12;
  const annualBase = monthlyBase * 12;
  const annualUpside = monthlyUpside * 12;

  // Friction findings & evidence ledger (CRO-*, RSP-*, PERF-*)
  const frictionIssues = results.filter(
    (r) =>
      (r.category === "conversion_marketing" ||
        r.category === "performance" ||
        r.category === "responsive_accessibility") &&
      (r.status === "FAIL" || r.status === "WARNING")
  );

  const evidenceLedger = frictionIssues.map((issue) => ({
    ruleId: issue.testId,
    testName: issue.testName,
    category: issue.category,
    severity: issue.severity,
    impact: issue.summary,
  }));

  const remediationCost =
    options.remediationCostEstimate ?? Math.max(1500, Math.min(8000, 1500 + frictionIssues.length * 350));

  assumptions.push(
    `[Illustrative Cost Estimate] Estimated remediation cost: ${formatCurrency(remediationCost, currency)} based on ${frictionIssues.length} identified friction finding(s) (illustrative benchmark).`
  );

  // Payback period: null when monthlyOpportunity is 0 or negative (displays as "N/A" in UI/PDF)
  const paybackMonthsConservative =
    monthlyConservative > 0 ? Math.round((remediationCost / monthlyConservative) * 10) / 10 : null;
  const paybackMonthsBase =
    monthlyBase > 0 ? Math.round((remediationCost / monthlyBase) * 10) / 10 : null;
  const paybackMonthsUpside =
    monthlyUpside > 0 ? Math.round((remediationCost / monthlyUpside) * 10) / 10 : null;

  // Provenance & Confidence Determination
  const verifiedProviders: string[] = [];
  if (sessionSource === "Connected GA4") verifiedProviders.push("GA4");
  if (shopify) verifiedProviders.push("Shopify");
  if (hubspot) verifiedProviders.push("HubSpot");
  if (gsc) verifiedProviders.push("Search Console");
  if (ads) verifiedProviders.push("Google Ads");
  if (backlinks) verifiedProviders.push("SERP");

  let confidence: Confidence;
  let inputSource: string;

  if (hasOwnerCommercialValues) {
    inputSource = "Owner Provided Commercial Inputs";
    confidence = "HIGH";
  } else if (hasConnectedCommercialValues || (sessionSource === "Connected GA4" && verifiedProviders.length > 1)) {
    inputSource = `Verified Connected Data (${verifiedProviders.join(" + ") || "Live Providers"})`;
    confidence = "HIGH";
  } else if (sessionSource === "Connected GA4") {
    inputSource = "Verified GA4 Traffic with Labeled Baseline Assumptions";
    confidence = "MEDIUM";
  } else {
    inputSource = "Owner Traffic with Labeled Baseline Assumptions";
    confidence = "MEDIUM";
  }

  const inputsProvided = {
    monthlySessions: monthlySessions ?? null,
    averageOrderValue: effectiveAovForInputs,
    leadConversionRatePct: explicitLeadConv ?? baselineConversionRatePct,
    leadToCustomerRatePct: effectiveCloseRateForInputs,
    customerValue: effectiveAcvForInputs,
    subscriptionRevenue: explicitSubscriptionRev ?? null,
    grossMarginPct: explicitGrossMarginPct ?? null,
    currency,
    evidenceLedger,
    connectedContext: connectedMetrics
      ? {
          ga4: ga4?.metrics,
          shopify: shopify ? { ...shopify.metrics, customers: undefined } : undefined,
          hubspot: hubspot?.metrics,
          searchConsole: gsc?.metrics,
          googleAds: ads?.metrics,
          backlinks: backlinks?.metrics,
        }
      : undefined,
  };

  return {
    status: "ESTIMATED",
    businessModel: model,
    inputsProvided,
    scenarios: {
      conservative: {
        scenario: "conservative",
        monthlyOpportunity: monthlyConservative,
        annualOpportunity: annualConservative,
        conversionRateDeltaPct: Math.round(conservativeDelta * 10000) / 100, // +0.20%
        paybackMonths: paybackMonthsConservative,
        monthlyRevenueOpportunity: Math.round(monthlyRevConservative),
        annualRevenueOpportunity: Math.round(monthlyRevConservative * 12),
        monthlyGrossProfitOpportunity: hasExplicitGrossMargin ? Math.round(monthlyGPConservative) : undefined,
        annualGrossProfitOpportunity: hasExplicitGrossMargin ? Math.round(monthlyGPConservative * 12) : undefined,
        baselineConversionRatePct,
        modeledConversionRatePct: Math.round((baselineConversionRatePct + 0.20) * 100) / 100,
      },
      base: {
        scenario: "base",
        monthlyOpportunity: monthlyBase,
        annualOpportunity: annualBase,
        conversionRateDeltaPct: Math.round(baseDelta * 10000) / 100, // +0.50%
        paybackMonths: paybackMonthsBase,
        monthlyRevenueOpportunity: Math.round(monthlyRevBase),
        annualRevenueOpportunity: Math.round(monthlyRevBase * 12),
        monthlyGrossProfitOpportunity: hasExplicitGrossMargin ? Math.round(monthlyGPBase) : undefined,
        annualGrossProfitOpportunity: hasExplicitGrossMargin ? Math.round(monthlyGPBase * 12) : undefined,
        baselineConversionRatePct,
        modeledConversionRatePct: Math.round((baselineConversionRatePct + 0.50) * 100) / 100,
      },
      upside: {
        scenario: "upside",
        monthlyOpportunity: monthlyUpside,
        annualOpportunity: annualUpside,
        conversionRateDeltaPct: Math.round(upsideDelta * 10000) / 100, // +1.00%
        paybackMonths: paybackMonthsUpside,
        monthlyRevenueOpportunity: Math.round(monthlyRevUpside),
        annualRevenueOpportunity: Math.round(monthlyRevUpside * 12),
        monthlyGrossProfitOpportunity: hasExplicitGrossMargin ? Math.round(monthlyGPUpside) : undefined,
        annualGrossProfitOpportunity: hasExplicitGrossMargin ? Math.round(monthlyGPUpside * 12) : undefined,
        baselineConversionRatePct,
        modeledConversionRatePct: Math.round((baselineConversionRatePct + 1.00) * 100) / 100,
      },
    },
    currency,
    remediationCostEstimate: remediationCost,
    grossMarginPct: explicitGrossMarginPct,
    formula,
    assumptions,
    disclaimers: [
      "Results represent forward-looking modeled growth opportunity from resolving identified UX, speed, and conversion barriers; this is NOT verified historical lost revenue.",
      "Conversion improvements depend on market demand, competitive dynamics, and full engineering remediation implementation.",
      "All calculations disclose explicit formula assumptions and avoid double-counting visitors across diagnostic categories.",
      "Conversion-lift and remediation-cost estimates are illustrative benchmarks unless verified against empirical client analytics.",
    ],
    inputSource,
    calculatedAt: now,
    confidence,
    methodologyNotes:
      "Calculated via SiteIntel Cost of Inaction Calculator v2. Models conservative (+0.20%), base (+0.50%), and upside (+1.00%) conversion rate improvements applied across validated monthly sessions without double-counting visitor segments. Verified commercial metrics follow deterministic precedence: Owner Intake > Connected Provider Data > Calibrated Baseline.",
  };
}
