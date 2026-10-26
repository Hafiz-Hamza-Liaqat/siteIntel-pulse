import {
  BusinessCategory,
  BusinessCategoryDetection,
  Confidence,
  PageObservation,
} from "@/types";

export const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  ecommerce: "Ecommerce & Online Retail",
  saas: "SaaS & Software Platform",
  marketplace: "Marketplace & Directory",
  job_board: "Job Board & Career Marketplace",
  jobs_marketplace: "Job Board & Career Marketplace",
  publisher: "Publisher & Media Blog",
  local_service: "Local Service Business",
  portfolio: "Portfolio & Agency",
  nonprofit: "Nonprofit & Community Organization",
  other: "General Commercial Platform",
};

interface CategorySignalRule {
  category: BusinessCategory;
  schemas: string[];
  urlPatterns: RegExp[];
  linkCtaPatterns: RegExp[];
  textPatterns: RegExp[];
  techClues: string[];
}

const CATEGORY_RULES: CategorySignalRule[] = [
  {
    category: "ecommerce",
    schemas: ["product", "offer", "aggregateoffer", "itemavailability", "merchantreturnpolicy", "store"],
    urlPatterns: [
      /\/cart(?:\/|$|\?)/i,
      /\/checkout(?:\/|$|\?)/i,
      /\/bag(?:\/|$|\?)/i,
      /\/basket(?:\/|$|\?)/i,
      /\/shop(?:\/|$|\?)/i,
      /\/products?(?:\/|$|\?)/i,
      /\/collections?(?:\/|$|\?)/i,
      /\/store(?:\/|$|\?)/i,
    ],
    linkCtaPatterns: [
      /\badd to (?:cart|bag|basket)\b/i,
      /\bbuy (?:now|it now)\b/i,
      /\bcheckout\b/i,
      /\bview cart\b/i,
      /\bshop (?:now|all|collection|catalog)\b/i,
      /\bfree shipping\b/i,
      /\border now\b/i,
    ],
    textPatterns: [
      /\badd to (?:cart|bag)\b/i,
      /\bproduct details\b/i,
      /\bin stock\b/i,
      /\bsku:\s*/i,
      /\bshipping & returns\b/i,
      /\bfree delivery on orders\b/i,
      /\bshopping cart\b/i,
    ],
    techClues: ["shopify", "woocommerce", "magento", "bigcommerce", "prestashop", "stripe cart"],
  },
  {
    category: "job_board",
    schemas: ["jobposting", "occupationalexperiencerequirements", "workforce", "employeraggregaterating"],
    urlPatterns: [
      /\/jobs?(?:\/|$|\?)/i,
      /\/careers?(?:\/|$|\?)/i,
      /\/post[-_]a[-_]job(?:\/|$|\?)/i,
      /\/remote[-_]jobs?(?:\/|$|\?)/i,
      /\/positions?(?:\/|$|\?)/i,
      /\/vacancies(?:\/|$|\?)/i,
      /\/openings(?:\/|$|\?)/i,
      /\/hiring(?:\/|$|\?)/i,
      /\/candidates?(?:\/|$|\?)/i,
    ],
    linkCtaPatterns: [
      /\b(?:search|find|browse) jobs?\b/i,
      /\bapply (?:now|for this job|today)\b/i,
      /\bpost a job\b/i,
      /\bfor (?:employers|job seekers|candidates|recruiters)\b/i,
      /\bremote jobs?\b/i,
      /\bupload (?:resume|cv)\b/i,
      /\bview (?:job|opening|listing)\b/i,
      /\bhire (?:talent|developers|designers)\b/i,
    ],
    textPatterns: [
      /\bjob (?:title|description|type|location|summary)\b/i,
      /\bsalary:\s*/i,
      /\bremote job\b/i,
      /\bfull[- ]time\b/i,
      /\bqualifications & experience\b/i,
      /\bapply for this position\b/i,
      /\bhiring company\b/i,
      /\bwork from (?:anywhere|home)\b/i,
      /\bcareer opportunities\b/i,
    ],
    techClues: ["workable", "lever", "greenhouse", "jobvite", "ashby", "bamboohr"],
  },
  {
    category: "saas",
    schemas: ["softwareapplication", "webapplication", "mobileapplication"],
    urlPatterns: [
      /\/pricing(?:\/|$|\?)/i,
      /\/features(?:\/|$|\?)/i,
      /\/solutions(?:\/|$|\?)/i,
      /\/integrations?(?:\/|$|\?)/i,
      /\/docs?(?:\/|$|\?)/i,
      /\/documentation(?:\/|$|\?)/i,
      /\/api(?:\/|$|\?)/i,
      /\/developers?(?:\/|$|\?)/i,
      /\/app(?:\/|$|\?)/i,
      /\/dashboard(?:\/|$|\?)/i,
      /\/free[-_]trial(?:\/|$|\?)/i,
    ],
    linkCtaPatterns: [
      /\bstart (?:free|your) trial\b/i,
      /\b(?:request|book|schedule) (?:a )?demo\b/i,
      /\bget started for free\b/i,
      /\bview pricing\b/i,
      /\bsee all features\b/i,
      /\bapi (?:docs|documentation)\b/i,
      /\bsign in to (?:app|dashboard)\b/i,
    ],
    textPatterns: [
      /\bpricing plans?\b/i,
      /\bmonthly \/ (?:annual|yearly)\b/i,
      /\benterprise plan\b/i,
      /\bcloud platform\b/i,
      /\bapi reference\b/i,
      /\bsoftware as a service\b/i,
      /\bseamless integrations\b/i,
      /\bautomate your workflow\b/i,
      /\bsoc\s*2\b/i,
    ],
    techClues: ["stripe billing", "chargebee", "auth0", "segment", "mixpanel"],
  },
  {
    category: "marketplace",
    schemas: ["aggregateoffer"],
    urlPatterns: [
      /\/marketplace(?:\/|$|\?)/i,
      /\/vendors?(?:\/|$|\?)/i,
      /\/sellers?(?:\/|$|\?)/i,
      /\/listings?(?:\/|$|\?)/i,
      /\/directory(?:\/|$|\?)/i,
      /\/browse[-_]categories(?:\/|$|\?)/i,
    ],
    linkCtaPatterns: [
      /\bbecome a (?:seller|vendor|partner)\b/i,
      /\bvendor (?:login|portal)\b/i,
      /\blist your (?:product|service|business)\b/i,
      /\bexplore directory\b/i,
      /\bcompare (?:sellers|vendors|quotes)\b/i,
    ],
    textPatterns: [
      /\bmulti[- ]vendor\b/i,
      /\bbuyers and sellers\b/i,
      /\bvendor directory\b/i,
      /\bseller commission\b/i,
      /\blistings across categories\b/i,
    ],
    techClues: ["sharetribe", "cs-cart", "mirakl"],
  },
  {
    category: "publisher",
    schemas: ["article", "newsarticle", "blogposting", "periodical", "publicationissue"],
    urlPatterns: [
      /\/articles?(?:\/|$|\?)/i,
      /\/news(?:\/|$|\?)/i,
      /\/blog(?:\/|$|\?)/i,
      /\/author(?:\/|$|\?)/i,
      /\/opinion(?:\/|$|\?)/i,
      /\/editorials?(?:\/|$|\?)/i,
      /\/archive(?:\/|$|\?)/i,
      /\/story(?:\/|$|\?)/i,
    ],
    linkCtaPatterns: [
      /\bsubscribe to (?:newsletter|magazine)\b/i,
      /\bread (?:more|full (?:story|article))\b/i,
      /\blatest (?:news|articles|stories)\b/i,
      /\beditorial team\b/i,
      /\brss feed\b/i,
    ],
    textPatterns: [
      /\bpublished (?:on|at)\b/i,
      /\bmin read\b/i,
      /\bbyline\b/i,
      /\beditorial policy\b/i,
      /\brelated articles\b/i,
      /\btable of contents\b/i,
    ],
    techClues: ["substack", "ghost", "medium", "wp-blog"],
  },
  {
    category: "local_service",
    schemas: [
      "localbusiness",
      "dentist",
      "plumber",
      "attorney",
      "autorepair",
      "restaurant",
      "hairsalon",
      "generalcontractor",
      "hvacbusiness",
      "openinghoursspecification",
    ],
    urlPatterns: [
      /\/services?(?:\/|$|\?)/i,
      /\/locations?(?:\/|$|\?)/i,
      /\/service[-_]area(?:\/|$|\?)/i,
      /\/emergency(?:\/|$|\?)/i,
      /\/appointment(?:\/|$|\?)/i,
      /\/get[-_]a[-_]quote(?:\/|$|\?)/i,
      /\/estimate(?:\/|$|\?)/i,
    ],
    linkCtaPatterns: [
      /\bcall (?:now|us today)\b/i,
      /\bemergency service\b/i,
      /\bbook (?:an )?appointment\b/i,
      /\bget (?:a )?free quote\b/i,
      /\brequest (?:a )?(?:call|estimate)\b/i,
      /\bschedule (?:online|service)\b/i,
    ],
    textPatterns: [
      /\bserving (?:the )?(?:greater|area|county|metro)\b/i,
      /\blicensed & insured\b/i,
      /\bbusiness hours\b/i,
      /\bsame[- ]day service\b/i,
      /\bour technicians\b/i,
      /\bfree estimates\b/i,
    ],
    techClues: ["yelp", "mindbody", "housecall", "jobber"],
  },
  {
    category: "portfolio",
    schemas: ["creativework", "visualartwork"],
    urlPatterns: [
      /\/portfolio(?:\/|$|\?)/i,
      /\/work(?:\/|$|\?)/i,
      /\/case[-_]studies(?:\/|$|\?)/i,
      /\/projects?(?:\/|$|\?)/i,
      /\/clients?(?:\/|$|\?)/i,
      /\/agency(?:\/|$|\?)/i,
      /\/studio(?:\/|$|\?)/i,
    ],
    linkCtaPatterns: [
      /\bview (?:our )?work\b/i,
      /\bfeatured projects\b/i,
      /\bsee case studies\b/i,
      /\bhire (?:us|our agency|our studio)\b/i,
      /\bstart a project\b/i,
      /\bclient testimonials\b/i,
    ],
    textPatterns: [
      /\bcreative agency\b/i,
      /\bdesign & development studio\b/i,
      /\bour portfolio\b/i,
      /\brecent client work\b/i,
      /\bawards & recognition\b/i,
      /\bcase study\b/i,
    ],
    techClues: ["behance", "dribbble", "cargo", "webflow agency"],
  },
  {
    category: "nonprofit",
    schemas: ["ngo", "nonprofitorganization", "donateaction"],
    urlPatterns: [
      /\/donate(?:\/|$|\?)/i,
      /\/donation(?:\/|$|\?)/i,
      /\/volunteer(?:\/|$|\?)/i,
      /\/our[-_]mission(?:\/|$|\?)/i,
      /\/give(?:\/|$|\?)/i,
      /\/fundraising(?:\/|$|\?)/i,
      /\/get[-_]involved(?:\/|$|\?)/i,
    ],
    linkCtaPatterns: [
      /\bdonate (?:now|today)\b/i,
      /\bmake a (?:gift|donation)\b/i,
      /\bvolunteer (?:with us|today)\b/i,
      /\bsupport our mission\b/i,
      /\bways to give\b/i,
    ],
    textPatterns: [
      /\bnon[- ]?profit organization\b/i,
      /\btax[- ]deductible\b/i,
      /\b501\(c\)\(3\)\b/i,
      /\bdonor impact\b/i,
      /\bboard of directors\b/i,
      /\bcharity registration\b/i,
      /\bempowering communities\b/i,
    ],
    techClues: ["donorbox", "givewp", "blackbaud", "classy"],
  },
];

export interface BusinessCategoryDetectorInput {
  pages: PageObservation[];
  sitemapUrls?: string[];
  robotsTxt?: string;
  technologies?: string[];
}

/**
 * Deterministic Evidence-Based Business Category Detector
 * Evaluates crawling evidence without hardcoded domain lookups.
 */
export function detectBusinessCategory(
  input: BusinessCategoryDetectorInput,
  requestedCategory?: string,
  manualCategoryOverride?: BusinessCategory
): BusinessCategoryDetection {
  const pages = input.pages || [];
  const now = new Date().toISOString();

  // If manual override was expressly provided by the user
  const hasManualOverride = Boolean(
    manualCategoryOverride ||
      (requestedCategory && requestedCategory !== "auto" && requestedCategory in CATEGORY_LABELS)
  );
  const manualChoice = (manualCategoryOverride || requestedCategory) as BusinessCategory;

  if (pages.length === 0) {
    const effectiveCategory = hasManualOverride ? manualChoice : "other";
    return {
      primaryCategory: effectiveCategory,
      categoryLabel: CATEGORY_LABELS[effectiveCategory] || CATEGORY_LABELS.other,
      confidence: "LOW",
      confidenceScore: 0.1,
      evidenceSignals: ["No crawl pages available for evidence-based classification"],
      alternativeCandidates: [],
      secondaryFacets: [],
      decisionSource: hasManualOverride ? "MANUALLY_OVERRIDDEN" : "UNRESOLVED",
      effectiveCategory,
      detectorVersion: "1.0.0",
      detectedAt: now,
      uncertaintyReason: "Zero crawled pages observed. Unable to extract structured data or page signals.",
    };
  }

  // Aggregate crawl evidence
  const allUrls = pages.map((p) => p.normalizedUrl || p.finalUrl || p.requestedUrl);
  const allLinks = pages.flatMap((p) => p.links || []);
  const allSchemas: { raw: string; lower: string }[] = [];
  for (const page of pages) {
    for (const item of page.structuredData || []) {
      const raw = String(item["@type"] || "").trim();
      if (raw) allSchemas.push({ raw, lower: raw.toLowerCase() });
    }
  }

  const allVisibleText = pages.map((p) => (p.visibleTextSample || "").toLowerCase()).join(" ");
  const allHeadings = pages
    .flatMap((p) => [
      ...(p.headings?.h1 || []),
      ...(p.headings?.h2 || []),
      ...(p.headings?.h3 || []),
    ])
    .map((h) => h.toLowerCase())
    .join(" ");

  const scriptUrls = pages
    .flatMap((p) => (p.resources || []).map((r) => r.url.toLowerCase()))
    .join(" ");

  // Score each category deterministically
  const scores: Record<BusinessCategory, { score: number; signals: string[]; dimensions: Set<string> }> = {
    ecommerce: { score: 0, signals: [], dimensions: new Set() },
    saas: { score: 0, signals: [], dimensions: new Set() },
    marketplace: { score: 0, signals: [], dimensions: new Set() },
    job_board: { score: 0, signals: [], dimensions: new Set() },
    jobs_marketplace: { score: 0, signals: [], dimensions: new Set() },
    publisher: { score: 0, signals: [], dimensions: new Set() },
    local_service: { score: 0, signals: [], dimensions: new Set() },
    portfolio: { score: 0, signals: [], dimensions: new Set() },
    nonprofit: { score: 0, signals: [], dimensions: new Set() },
    other: { score: 5, signals: ["Baseline commercial web platform"], dimensions: new Set(["baseline"]) },
  };

  for (const rule of CATEGORY_RULES) {
    const entry = scores[rule.category];

    // 1. Structured data signals (Weight: 40 points)
    const matchingSchemas = rule.schemas.flatMap((s) =>
      allSchemas.filter((schema) => schema.lower.includes(s)).map((schema) => schema.raw)
    );
    if (matchingSchemas.length > 0) {
      const uniqueSchemas = Array.from(new Set(matchingSchemas));
      entry.score += 40;
      entry.dimensions.add("structured_data");
      entry.signals.push(`Structured data matches Schema.org @type: ${uniqueSchemas.join(", ")}`);
    }

    // 2. URL paths (Weight: 15 points per match, up to 30)
    let urlMatches = 0;
    for (const pat of rule.urlPatterns) {
      if (allUrls.some((u) => pat.test(u))) {
        urlMatches++;
      }
    }
    if (urlMatches > 0) {
      const added = Math.min(30, urlMatches * 15);
      entry.score += added;
      entry.dimensions.add("url_templates");
      entry.signals.push(`Discovered ${urlMatches} category-aligned page template URL path(s)`);
    }

    // 3. Navigation & CTA anchor links (Weight: 10 points per pattern, up to 30)
    let ctaMatches = 0;
    for (const pat of rule.linkCtaPatterns) {
      if (allLinks.some((l) => pat.test(l.anchorText || ""))) {
        ctaMatches++;
      }
    }
    if (ctaMatches > 0) {
      const added = Math.min(30, ctaMatches * 10);
      entry.score += added;
      entry.dimensions.add("navigation_cta");
      entry.signals.push(`Observed ${ctaMatches} high-intent Call-to-Action link(s) in navigation`);
    }

    // 4. Headings & visible text keywords (Weight: 5 points per pattern, up to 25)
    let textMatches = 0;
    for (const pat of rule.textPatterns) {
      if (pat.test(allHeadings) || pat.test(allVisibleText)) {
        textMatches++;
      }
    }
    if (textMatches > 0) {
      const added = Math.min(25, textMatches * 5);
      entry.score += added;
      entry.dimensions.add("content_keywords");
      entry.signals.push(`Identified ${textMatches} domain-specific keyword pattern(s) across headings and body copy`);
    }

    // 5. Technology and integration clues (Weight: 25 points)
    const matchingTech = rule.techClues.filter(
      (tech) => scriptUrls.includes(tech) || (input.technologies || []).some((t) => t.toLowerCase().includes(tech))
    );
    if (matchingTech.length > 0) {
      entry.score += 25;
      entry.dimensions.add("technology_integrations");
      entry.signals.push(`Detected platform/script technology footprint: ${matchingTech.join(", ")}`);
    }
  }

  // Detect secondary business facets (e.g. for hybrid platforms like STRIDETO)
  const secondaryFacets: string[] = [];
  const textCorpus = (allHeadings + " " + allVisibleText).toLowerCase();

  // Education / Scholarships / Fellowships facet
  const educationMatches = [
    /\bscholarships?\b/i,
    /\bfellowships?\b/i,
    /\binternships?\b/i,
    /\bmentorship\b/i,
    /\beducation(?:al)?\b/i,
    /\bstudent opportunities\b/i,
    /\byouth programs?\b/i,
  ].filter((pat) => pat.test(textCorpus) || allUrls.some((u) => pat.test(u))).length;

  if (educationMatches >= 2) {
    secondaryFacets.push("education_and_scholarships");
    // If it's a career/job platform with scholarships, reinforce job_board scoring
    scores.job_board.score += 20;
    scores.job_board.dimensions.add("hybrid_facet");
    scores.job_board.signals.push("Corroborating career, fellowship, and student opportunity pathways observed");
  }

  // B2B Wholesale / Team Procurement facet
  if (/\b(?:wholesale|bulk pricing|corporate orders|b2b procurement)\b/i.test(textCorpus)) {
    secondaryFacets.push("b2b_wholesale");
  }

  // Community / Forum / Network facet
  if (/\b(?:community forum|join our community|member network|discussion board)\b/i.test(textCorpus)) {
    secondaryFacets.push("community_network");
  }

  // Rank candidate categories
  const sortedCandidates = Object.entries(scores)
    .filter(([cat]) => cat !== "jobs_marketplace") // Merge jobs_marketplace into job_board
    .map(([cat, data]) => ({
      category: cat as BusinessCategory,
      score: data.score,
      signals: data.signals,
      dimensionsCount: data.dimensions.size,
    }))
    .sort((a, b) => b.score - a.score);

  const top = sortedCandidates[0];
  const runnerUp = sortedCandidates[1] || { score: 0 };

  // Calculate normalized calibrated confidence score (0.0 to 1.0)
  // Based on absolute evidence weight, dimension corroboration, and victory margin
  let confidence: Confidence = "LOW";
  let confidenceScore = 0.35;
  let uncertaintyReason: string | undefined;

  const rawMargin = top.score - runnerUp.score;
  const isCorroborated = top.dimensionsCount >= 2;

  if (top.score >= 60 && rawMargin >= 25 && isCorroborated) {
    confidence = "HIGH";
    confidenceScore = Math.min(0.96, 0.85 + (top.score - 60) * 0.002);
  } else if (top.score >= 35 && (rawMargin >= 10 || isCorroborated)) {
    confidence = "MEDIUM";
    confidenceScore = Math.min(0.84, 0.6 + (top.score - 35) * 0.005);
  } else {
    confidence = "LOW";
    confidenceScore = Math.min(0.55, Math.max(0.2, top.score / 70));
    uncertaintyReason =
      top.score < 25
        ? "Observed public crawl signals are sparse across audited pages. Standard baseline commercial evaluation applied."
        : `Close score margin between candidate categories (${top.category}: ${top.score} vs ${runnerUp.category}: ${runnerUp.score}).`;
  }

  // Default to 'other' if top category has virtually zero domain-specific evidence
  let detectedPrimary: BusinessCategory = top.category;
  if (top.score < 20) {
    detectedPrimary = "other";
  }

  // Build alternative candidate list (categories with non-trivial score)
  const alternativeCandidates = sortedCandidates
    .filter((c) => c.category !== detectedPrimary && c.score >= 15)
    .slice(0, 3)
    .map((c) => ({
      category: c.category,
      label: CATEGORY_LABELS[c.category] || CATEGORY_LABELS.other,
      score: Number((c.score / 100).toFixed(2)),
    }));

  // Determine effective category and decision source
  let effectiveCategory = detectedPrimary;
  let decisionSource: "AUTO_DETECTED" | "MANUALLY_OVERRIDDEN" | "UNRESOLVED" = "AUTO_DETECTED";

  if (hasManualOverride) {
    effectiveCategory = manualChoice;
    decisionSource = "MANUALLY_OVERRIDDEN";
  } else if (confidence === "LOW" && detectedPrimary === "other") {
    decisionSource = "UNRESOLVED";
  }

  const primarySignals = scores[detectedPrimary]?.signals || [];

  return {
    primaryCategory: detectedPrimary,
    categoryLabel: CATEGORY_LABELS[detectedPrimary] || CATEGORY_LABELS.other,
    confidence,
    confidenceScore: Number(confidenceScore.toFixed(2)),
    evidenceSignals: primarySignals.length > 0 ? primarySignals : ["General commercial web platform heuristics"],
    alternativeCandidates,
    secondaryFacets,
    decisionSource,
    effectiveCategory,
    detectorVersion: "1.0.0",
    detectedAt: now,
    uncertaintyReason,
  };
}
