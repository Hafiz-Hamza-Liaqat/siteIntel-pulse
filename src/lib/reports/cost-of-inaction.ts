import {
  CostOfInactionResult,
  BusinessModelType,
  BusinessCategory,
  ScanRequest,
  AssessmentResult,
  Confidence,
} from "@/types";

export interface CostOfInactionOptions {
  businessCategory: BusinessCategory;
  request?: Partial<ScanRequest>;
  results?: AssessmentResult[];
  remediationCostEstimate?: number;
}

export function calculateCostOfInaction(options: CostOfInactionOptions): CostOfInactionResult {
  const now = new Date().toISOString();
  const { businessCategory, request, results = [] } = options;

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

  const currency = request?.currency || "USD";
  const monthlySessions = request?.monthlySessions;
  const aov = request?.averageOrderValue;
  const leadConversionRatePct = request?.leadConversionRatePct;
  const leadToCustomerRatePct = request?.leadToCustomerRatePct;
  const customerValue = request?.customerValue;
  const subscriptionRevenue = request?.subscriptionRevenue;
  const grossMarginPct = request?.grossMarginPct;
  const marginMultiplier = grossMarginPct != null && grossMarginPct > 0 ? grossMarginPct / 100 : 1.0;

  const formula =
    "Monthly Opportunity = Monthly Sessions × Modeled Conversion Lift × Transaction / Customer Value × Gross Margin %";

  const inputsProvided = {
    monthlySessions: monthlySessions ?? null,
    averageOrderValue: aov ?? null,
    leadConversionRatePct: leadConversionRatePct ?? null,
    leadToCustomerRatePct: leadToCustomerRatePct ?? null,
    customerValue: customerValue ?? null,
    subscriptionRevenue: subscriptionRevenue ?? null,
    grossMarginPct: grossMarginPct ?? null,
    currency,
  };

  // 2. Insufficient Inputs Check
  // Financial opportunity modeling requires at minimum verified monthly session traffic.
  // We strictly refuse to fabricate synthetic traffic counts when none are provided.
  if (!monthlySessions || monthlySessions <= 0) {
    return {
      status: "INSUFFICIENT_INPUTS",
      businessModel: model,
      inputsProvided,
      currency,
      formula,
      assumptions: [
        "Financial opportunity modeling requires verified monthly session traffic counts.",
        "Synthetic traffic counts are never silently fabricated when unprovided by the business owner.",
        "Supply monthly visitor sessions and transaction values in scan intake to unlock conservative, base, and upside scenarios.",
      ],
      disclaimers: [
        "Modeled opportunity represents forward-looking potential financial lift from resolving identified UX, speed, and conversion barriers, NOT verified historical lost revenue.",
        "Model results are heuristic simulations and do not guarantee future commercial outcomes.",
      ],
      inputSource: "Owner Input Required",
      calculatedAt: now,
      confidence: "LOW",
      methodologyNotes:
        "Inputs insufficient: Please supply monthly session traffic to calculate conservative, base, and upside commercial growth scenarios.",
    };
  }

  // 3. Documented Scenario Conversion Lift Bounds
  // Calibrated scenario lift tiers:
  // - Conservative (+0.20% absolute lift / ~5-8% relative): Fast wins from fixing layout shifts, broken touch targets, and contrast.
  // - Base (+0.50% absolute lift / ~15-20% relative): Comprehensive repair of Core Web Vitals, form validation, and CTA hierarchy.
  // - Upside (+1.00% absolute lift / ~25-35% relative): Full-funnel optimization with fast server response and friction-free checkout.
  // We avoid multiplying arbitrary numbers merely by finding count; instead we use fixed calibrated bounds.
  const conservativeDelta = 0.002; // +0.20%
  const baseDelta = 0.005;         // +0.50%
  const upsideDelta = 0.010;       // +1.00%

  let monthlyConservative = 0;
  let monthlyBase = 0;
  let monthlyUpside = 0;

  const assumptions: string[] = [
    `Eligible monthly traffic: ${monthlySessions.toLocaleString()} unique visitor sessions (Owner Provided).`,
    "Deduplicated visitor funnel: Speed, mobile touch targets, and form friction are treated as a unified conversion funnel to prevent double-counting the same visitors across diagnostic categories.",
    "Modeled conversion rate lift bounds: +0.20% (Conservative), +0.50% (Base), and +1.00% (Upside) from resolving observable site barriers.",
  ];

  if (grossMarginPct != null) {
    assumptions.push(`Gross margin applied: ${grossMarginPct}% (Owner Provided).`);
  } else {
    assumptions.push("Gross margin: 100% (Gross revenue opportunity; owner may apply actual gross margin %).");
  }

  let hasOwnerCommercialValues = false;

  if (model === "ecommerce") {
    let effectiveAov: number;
    if (aov && aov > 0) {
      effectiveAov = aov;
      hasOwnerCommercialValues = true;
      assumptions.push(`Average Order Value (AOV): ${currency} $${effectiveAov.toFixed(2)} (Owner Provided).`);
    } else {
      effectiveAov = 85.0;
      assumptions.push(
        `[Labeled Scenario Assumption] Average Order Value (AOV): ${currency} $${effectiveAov.toFixed(2)} baseline assumed because owner did not specify AOV.`
      );
    }

    monthlyConservative = monthlySessions * conservativeDelta * effectiveAov * marginMultiplier;
    monthlyBase = monthlySessions * baseDelta * effectiveAov * marginMultiplier;
    monthlyUpside = monthlySessions * upsideDelta * effectiveAov * marginMultiplier;
  } else if (model === "saas_subscription") {
    let effectiveArpu: number;
    const suppliedArpu = subscriptionRevenue ?? customerValue;
    if (suppliedArpu && suppliedArpu > 0) {
      effectiveArpu = suppliedArpu;
      hasOwnerCommercialValues = true;
      assumptions.push(
        `Monthly Average Revenue Per User (ARPU): ${currency} $${effectiveArpu.toFixed(2)} (Owner Provided).`
      );
    } else {
      effectiveArpu = 65.0;
      assumptions.push(
        `[Labeled Scenario Assumption] Monthly ARPU: ${currency} $${effectiveArpu.toFixed(2)} baseline assumed because owner did not specify subscription revenue.`
      );
    }

    let effectiveTrialRate = 0.03; // 3% default visitor-to-trial
    if (leadConversionRatePct != null && leadConversionRatePct > 0) {
      effectiveTrialRate = leadConversionRatePct / 100;
      assumptions.push(
        `Visitor-to-Trial conversion rate: ${leadConversionRatePct}% (Owner Provided).`
      );
    } else {
      assumptions.push(
        `[Labeled Scenario Assumption] Visitor-to-Trial rate: ${(effectiveTrialRate * 100).toFixed(1)}% baseline assumed.`
      );
    }

    let effectiveCloseRate = 0.18; // 18% trial-to-paid
    if (leadToCustomerRatePct != null && leadToCustomerRatePct > 0) {
      effectiveCloseRate = leadToCustomerRatePct / 100;
      assumptions.push(
        `Trial-to-Paid customer conversion rate: ${leadToCustomerRatePct}% (Owner Provided).`
      );
    } else {
      assumptions.push(
        `[Labeled Scenario Assumption] Trial-to-Paid close rate: ${(effectiveCloseRate * 100).toFixed(1)}% baseline assumed.`
      );
    }

    // Incremental paid subscribers = sessions * lift * close rate
    monthlyConservative = monthlySessions * conservativeDelta * effectiveCloseRate * effectiveArpu * marginMultiplier;
    monthlyBase = monthlySessions * baseDelta * effectiveCloseRate * effectiveArpu * marginMultiplier;
    monthlyUpside = monthlySessions * upsideDelta * effectiveCloseRate * effectiveArpu * marginMultiplier;
  } else {
    // Lead generation & service businesses
    let effectiveAcv: number;
    if (customerValue && customerValue > 0) {
      effectiveAcv = customerValue;
      hasOwnerCommercialValues = true;
      assumptions.push(`Average Customer Value (ACV): ${currency} $${effectiveAcv.toFixed(2)} (Owner Provided).`);
    } else {
      effectiveAcv = 750.0;
      assumptions.push(
        `[Labeled Scenario Assumption] Average Customer Value (ACV): ${currency} $${effectiveAcv.toFixed(2)} baseline assumed because owner did not specify customer value.`
      );
    }

    let effectiveLeadRate = 0.025; // 2.5% default inquiry rate
    if (leadConversionRatePct != null && leadConversionRatePct > 0) {
      effectiveLeadRate = leadConversionRatePct / 100;
      assumptions.push(`Visitor-to-Lead conversion rate: ${leadConversionRatePct}% (Owner Provided).`);
    } else {
      assumptions.push(
        `[Labeled Scenario Assumption] Visitor-to-Lead rate: ${(effectiveLeadRate * 100).toFixed(1)}% baseline assumed.`
      );
    }

    let effectiveCloseRate = 0.15; // 15% lead-to-client close rate
    if (leadToCustomerRatePct != null && leadToCustomerRatePct > 0) {
      effectiveCloseRate = leadToCustomerRatePct / 100;
      assumptions.push(
        `Lead-to-Client close rate: ${leadToCustomerRatePct}% (Owner Provided).`
      );
    } else {
      assumptions.push(
        `[Labeled Scenario Assumption] Lead-to-Client close rate: ${(effectiveCloseRate * 100).toFixed(1)}% baseline assumed.`
      );
    }

    // Incremental clients = sessions * lift * close rate
    monthlyConservative = monthlySessions * conservativeDelta * effectiveCloseRate * effectiveAcv * marginMultiplier;
    monthlyBase = monthlySessions * baseDelta * effectiveCloseRate * effectiveAcv * marginMultiplier;
    monthlyUpside = monthlySessions * upsideDelta * effectiveCloseRate * effectiveAcv * marginMultiplier;
  }

  // Round values
  monthlyConservative = Math.round(monthlyConservative);
  monthlyBase = Math.round(monthlyBase);
  monthlyUpside = Math.round(monthlyUpside);

  const annualConservative = monthlyConservative * 12;
  const annualBase = monthlyBase * 12;
  const annualUpside = monthlyUpside * 12;

  // Calibrated remediation cost estimate:
  const frictionIssues = results.filter(
    (r) =>
      (r.category === "conversion_marketing" ||
        r.category === "performance" ||
        r.category === "responsive_accessibility") &&
      (r.status === "FAIL" || r.status === "WARNING")
  );
  const remediationCost =
    options.remediationCostEstimate ?? Math.max(1500, Math.min(8000, 1500 + frictionIssues.length * 350));

  const paybackMonthsConservative =
    monthlyConservative > 0 ? Math.round((remediationCost / monthlyConservative) * 10) / 10 : null;
  const paybackMonthsBase =
    monthlyBase > 0 ? Math.round((remediationCost / monthlyBase) * 10) / 10 : null;
  const paybackMonthsUpside =
    monthlyUpside > 0 ? Math.round((remediationCost / monthlyUpside) * 10) / 10 : null;

  const confidence: Confidence = hasOwnerCommercialValues ? "HIGH" : "MEDIUM";
  const inputSource = hasOwnerCommercialValues
    ? "Owner Provided Commercial Inputs"
    : "Owner Traffic with Labeled Baseline Assumptions";

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
      },
      base: {
        scenario: "base",
        monthlyOpportunity: monthlyBase,
        annualOpportunity: annualBase,
        conversionRateDeltaPct: Math.round(baseDelta * 10000) / 100, // +0.50%
        paybackMonths: paybackMonthsBase,
      },
      upside: {
        scenario: "upside",
        monthlyOpportunity: monthlyUpside,
        annualOpportunity: annualUpside,
        conversionRateDeltaPct: Math.round(upsideDelta * 10000) / 100, // +1.00%
        paybackMonths: paybackMonthsUpside,
      },
    },
    currency,
    remediationCostEstimate: remediationCost,
    grossMarginPct: grossMarginPct ?? undefined,
    formula,
    assumptions,
    disclaimers: [
      "Results represent forward-looking modeled growth opportunity from resolving identified UX, speed, and conversion barriers; this is NOT verified historical lost revenue.",
      "Conversion improvements depend on market demand, competitive dynamics, and full engineering remediation implementation.",
      "All calculations disclose explicit formula assumptions and avoid double-counting visitors across diagnostic categories.",
    ],
    inputSource,
    calculatedAt: now,
    confidence,
    methodologyNotes:
      "Calculated via SiteIntel Cost of Inaction Calculator v1. Models conservative (+0.20%), base (+0.50%), and upside (+1.00%) conversion rate improvements applied across validated monthly sessions without double-counting visitor segments.",
  };
}
