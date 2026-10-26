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
  } else if (
    businessCategory === "local_service" ||
    businessCategory === "portfolio" ||
    businessCategory === "job_board" ||
    businessCategory === "jobs_marketplace"
  ) {
    model = "lead_gen";
  } else if (businessCategory === "saas") {
    model = "saas_subscription";
  } else {
    model = "lead_gen"; // Standard digital presence default
  }

  const monthlySessions = request?.monthlySessions;
  const aov = request?.averageOrderValue;
  const customerValue = request?.customerValue;
  const grossMarginPct = request?.grossMarginPct;
  const marginMultiplier = grossMarginPct != null && grossMarginPct > 0 ? grossMarginPct / 100 : 1.0;

  // 2. Insufficient Inputs Check
  // Financial modeling requires at least monthly session estimates
  if (!monthlySessions || monthlySessions <= 0) {
    return {
      status: "INSUFFICIENT_INPUTS",
      businessModel: model,
      inputsProvided: {
        monthlySessions: monthlySessions ?? null,
        averageOrderValue: aov ?? null,
        customerValue: customerValue ?? null,
        grossMarginPct: grossMarginPct ?? null,
      },
      currency: "USD",
      assumptions: [
        "Financial opportunity modeling requires verified monthly session traffic and commercial transaction values.",
        "Default traffic metrics are not fabricated when unprovided by the business owner.",
      ],
      disclaimers: [
        "Estimates represent potential financial growth opportunity from resolving identified UX, performance, and conversion barriers, not verified lost revenue.",
        "Model results are heuristic simulations and do not guarantee future commercial outcomes.",
      ],
      inputSource: "Owner Input Required",
      calculatedAt: now,
      confidence: "LOW",
      methodologyNotes:
        "Inputs insufficient: Monthly traffic sessions and commercial value metrics must be supplied to calculate conservative, base, and upside financial scenarios.",
    };
  }

  // Count high and critical conversion/performance friction findings to scale opportunity
  const frictionIssues = results.filter(
    (r) =>
      (r.category === "conversion_marketing" ||
        r.category === "performance" ||
        r.category === "responsive_accessibility") &&
      (r.status === "FAIL" || r.status === "WARNING")
  );

  const frictionMultiplier = Math.min(1.5, Math.max(0.8, 0.8 + frictionIssues.length * 0.1));

  // 3. Scenario Incremental Deltas (CR improvement without double-counting)
  let conservativeDelta = 0.002 * frictionMultiplier; // +0.20%
  let baseDelta = 0.005 * frictionMultiplier;         // +0.50%
  let upsideDelta = 0.011 * frictionMultiplier;       // +1.10%

  let monthlyConservative = 0;
  let monthlyBase = 0;
  let monthlyUpside = 0;

  const assumptions: string[] = [
    `Eligible monthly traffic: ${monthlySessions.toLocaleString()} unique visitor sessions.`,
    "Deduplicated visitor overlap: Speed, responsive touch targets, and form usability findings are treated as unified funnel friction to prevent double-counting the same visitors.",
  ];

  if (model === "ecommerce") {
    const effectiveAov = aov && aov > 0 ? aov : 85.0; // Transparent default if not overridden
    assumptions.push(`Average Order Value (AOV): $${effectiveAov.toFixed(2)}.`);
    if (grossMarginPct != null) {
      assumptions.push(`Gross Margin applied: ${grossMarginPct}%.`);
    } else {
      assumptions.push("Gross Margin: 100% (Revenue opportunity; owner may apply margin percentage).");
    }

    monthlyConservative = monthlySessions * conservativeDelta * effectiveAov * marginMultiplier;
    monthlyBase = monthlySessions * baseDelta * effectiveAov * marginMultiplier;
    monthlyUpside = monthlySessions * upsideDelta * effectiveAov * marginMultiplier;
  } else if (model === "saas_subscription") {
    const trialToPaid = 0.18; // 18% trial-to-paid baseline
    const effectiveArpu = customerValue && customerValue > 0 ? customerValue : 65.0; // monthly subscription value
    assumptions.push(`Free-to-paid / Trial-to-paid conversion rate: ${(trialToPaid * 100).toFixed(0)}%.`);
    assumptions.push(`Monthly Average Revenue Per User (ARPU): $${effectiveArpu.toFixed(2)}.`);

    monthlyConservative = monthlySessions * conservativeDelta * trialToPaid * effectiveArpu * marginMultiplier;
    monthlyBase = monthlySessions * baseDelta * trialToPaid * effectiveArpu * marginMultiplier;
    monthlyUpside = monthlySessions * upsideDelta * trialToPaid * effectiveArpu * marginMultiplier;
  } else {
    // Lead gen & service
    const leadToCustomer = 0.15; // 15% lead-to-client close rate
    const effectiveAcv = customerValue && customerValue > 0 ? customerValue : 850.0;
    assumptions.push(`Lead-to-Client close rate: ${(leadToCustomer * 100).toFixed(0)}%.`);
    assumptions.push(`Average Customer Value (ACV): $${effectiveAcv.toFixed(2)}.`);

    monthlyConservative = monthlySessions * conservativeDelta * leadToCustomer * effectiveAcv * marginMultiplier;
    monthlyBase = monthlySessions * baseDelta * leadToCustomer * effectiveAcv * marginMultiplier;
    monthlyUpside = monthlySessions * upsideDelta * leadToCustomer * effectiveAcv * marginMultiplier;
  }

  // Round values
  monthlyConservative = Math.round(monthlyConservative);
  monthlyBase = Math.round(monthlyBase);
  monthlyUpside = Math.round(monthlyUpside);

  const annualConservative = monthlyConservative * 12;
  const annualBase = monthlyBase * 12;
  const annualUpside = monthlyUpside * 12;

  // Modeled remediation cost & payback period
  const remediationCost =
    options.remediationCostEstimate ?? Math.max(1800, frictionIssues.length * 450);

  const paybackMonthsConservative =
    monthlyConservative > 0 ? Math.round((remediationCost / monthlyConservative) * 10) / 10 : null;
  const paybackMonthsBase =
    monthlyBase > 0 ? Math.round((remediationCost / monthlyBase) * 10) / 10 : null;
  const paybackMonthsUpside =
    monthlyUpside > 0 ? Math.round((remediationCost / monthlyUpside) * 10) / 10 : null;

  let confidence: Confidence = "HIGH";
  if (!aov && !customerValue) confidence = "MEDIUM";

  return {
    status: "ESTIMATED",
    businessModel: model,
    inputsProvided: {
      monthlySessions,
      averageOrderValue: aov ?? null,
      customerValue: customerValue ?? null,
      grossMarginPct: grossMarginPct ?? null,
    },
    scenarios: {
      conservative: {
        scenario: "conservative",
        monthlyOpportunity: monthlyConservative,
        annualOpportunity: annualConservative,
        conversionRateDeltaPct: Math.round(conservativeDelta * 10000) / 100, // e.g. 0.25%
        paybackMonths: paybackMonthsConservative,
      },
      base: {
        scenario: "base",
        monthlyOpportunity: monthlyBase,
        annualOpportunity: annualBase,
        conversionRateDeltaPct: Math.round(baseDelta * 10000) / 100,
        paybackMonths: paybackMonthsBase,
      },
      upside: {
        scenario: "upside",
        monthlyOpportunity: monthlyUpside,
        annualOpportunity: annualUpside,
        conversionRateDeltaPct: Math.round(upsideDelta * 10000) / 100,
        paybackMonths: paybackMonthsUpside,
      },
    },
    currency: "USD",
    remediationCostEstimate: remediationCost,
    grossMarginPct: grossMarginPct ?? undefined,
    assumptions,
    disclaimers: [
      "Results represent modeled financial growth opportunity from resolving identified UX, speed, and conversion bottlenecks; this is NOT verified historical lost revenue.",
      "Conversion improvements depend on market demand, competitive dynamics, and full remediation implementation.",
      "All calculations disclose explicit formula assumptions and avoid double-counting visitors across diagnostic categories.",
    ],
    inputSource: request?.monthlySessions ? "Owner Provided Input" : "Heuristic Baseline",
    calculatedAt: now,
    confidence,
    methodologyNotes:
      "Calculated via SiteIntel Cost of Inaction Calculator v1. Models conservative, base, and upside conversion rate improvements applied across validated monthly sessions without double-counting visitor segments.",
  };
}
