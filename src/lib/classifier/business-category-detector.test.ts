import { describe, it, expect } from "vitest";
import { detectBusinessCategory } from "./business-category-detector";
import { PageObservation, AssessmentResult } from "@/types";
import { conversionRules } from "../catalogue/rules/conversion";
import { assessmentRegistry } from "../catalogue/registry";
import { RuleEvaluationContext } from "../catalogue/types";

function createMockPage(overrides: Partial<PageObservation>): PageObservation {
  return {
    id: `page_${Math.random().toString(36).substring(2, 7)}`,
    requestedUrl: "https://example.com/",
    normalizedUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    statusCode: 200,
    responseTimeMs: 150,
    contentType: "text/html",
    redirectHistory: [],
    robotsDirectives: [],
    headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
    visibleWordCount: 500,
    links: [],
    resources: [],
    structuredData: [],
    openGraph: {},
    headers: {},
    cookieAttributes: [],
    templateConfidence: "LOW",
    discoveredAtDepth: 0,
    discoverySource: "entry",
    consoleErrors: [],
    ...overrides,
  };
}

describe("Evidence-Based Automatic Business Category Detector", () => {
  // 1. CafeRemote: Expected remote job board signals
  it("classifies CafeRemote as a job_board with high confidence based on crawl signals", () => {
    const home = createMockPage({
      requestedUrl: "https://www.caferemote.com/",
      finalUrl: "https://www.caferemote.com/",
      title: "CafeRemote — Global Remote Tech Jobs & Distributed Hiring",
      headings: {
        h1: ["Remote Jobs in Tech, Design, and Product"],
        h2: ["Browse Remote Openings", "Companies Hiring Worldwide"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
      visibleTextSample: "Find your next remote career opportunity. Search hundreds of verified remote jobs. For employers and recruiters.",
      links: [
        { id: "l1", sourceUrl: "https://www.caferemote.com/", targetUrl: "https://www.caferemote.com/jobs", isInternal: true, anchorText: "Search Jobs", isBroken: false, isRedirect: false },
        { id: "l2", sourceUrl: "https://www.caferemote.com/", targetUrl: "https://www.caferemote.com/post-a-job", isInternal: true, anchorText: "Post a Job", isBroken: false, isRedirect: false },
        { id: "l3", sourceUrl: "https://www.caferemote.com/", targetUrl: "https://www.caferemote.com/careers", isInternal: true, anchorText: "Browse Jobs", isBroken: false, isRedirect: false },
      ],
    });

    const jobDetailPage = createMockPage({
      requestedUrl: "https://www.caferemote.com/jobs/senior-frontend-engineer",
      finalUrl: "https://www.caferemote.com/jobs/senior-frontend-engineer",
      title: "Senior Frontend Engineer (Remote) — TechCorp",
      headings: {
        h1: ["Senior Frontend Engineer"],
        h2: ["Qualifications & Experience", "About the Company"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
      structuredData: [
        {
          "@type": "JobPosting",
          title: "Senior Frontend Engineer",
          employmentType: "FULL_TIME",
          hiringOrganization: { "@type": "Organization", name: "TechCorp" },
        },
      ],
      visibleTextSample: "Apply for this job. Full-time remote job with competitive salary. Requirements: React, TypeScript.",
      links: [
        { id: "l4", sourceUrl: "https://www.caferemote.com/jobs/senior-frontend-engineer", targetUrl: "https://www.caferemote.com/apply/123", isInternal: true, anchorText: "Apply Now", isBroken: false, isRedirect: false },
      ],
    });

    const detection = detectBusinessCategory({ pages: [home, jobDetailPage] });

    expect(detection.primaryCategory).toBe("job_board");
    expect(detection.effectiveCategory).toBe("job_board");
    expect(detection.confidence).toBe("HIGH");
    expect(detection.confidenceScore).toBeGreaterThanOrEqual(0.85);
    expect(detection.decisionSource).toBe("AUTO_DETECTED");
    expect(detection.evidenceSignals.some((s) => s.includes("JobPosting"))).toBe(true);
  });

  // 2. Naffeez: Expected ecommerce / commerce signals
  it("classifies Naffeez as ecommerce with high confidence based on product and checkout signals", () => {
    const home = createMockPage({
      requestedUrl: "https://naffeez.com/",
      finalUrl: "https://naffeez.com/",
      title: "Naffeez Store — Premium Artisanal Fragrances",
      headings: {
        h1: ["Discover Our Luxury Perfumes"],
        h2: ["Featured Products", "Best Sellers"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
      links: [
        { id: "l1", sourceUrl: "https://naffeez.com/", targetUrl: "https://naffeez.com/collections/all", isInternal: true, anchorText: "Shop Collection", isBroken: false, isRedirect: false },
        { id: "l2", sourceUrl: "https://naffeez.com/", targetUrl: "https://naffeez.com/cart", isInternal: true, anchorText: "View Cart", isBroken: false, isRedirect: false },
        { id: "l3", sourceUrl: "https://naffeez.com/", targetUrl: "https://naffeez.com/checkout", isInternal: true, anchorText: "Checkout", isBroken: false, isRedirect: false },
      ],
    });

    const productPage = createMockPage({
      requestedUrl: "https://naffeez.com/products/royal-oud-parfum",
      finalUrl: "https://naffeez.com/products/royal-oud-parfum",
      title: "Royal Oud Parfum 50ml — Naffeez",
      structuredData: [
        {
          "@type": "Product",
          name: "Royal Oud Parfum",
          offers: { "@type": "Offer", price: "95.00", priceCurrency: "USD", availability: "https://schema.org/InStock" },
        },
      ],
      visibleTextSample: "Add to cart. In stock. SKU: NAF-OUD-50. Free shipping & returns on all domestic orders.",
      links: [
        { id: "l4", sourceUrl: "https://naffeez.com/products/royal-oud-parfum", targetUrl: "https://naffeez.com/cart/add", isInternal: true, anchorText: "Add to Bag", isBroken: false, isRedirect: false },
      ],
      resources: [
        { id: "r1", url: "https://cdn.shopify.com/s/files/1/themes/bundle.js", type: "script" },
      ],
    });

    const detection = detectBusinessCategory(
      { pages: [home, productPage] },
      undefined,
      undefined
    );

    expect(detection.primaryCategory).toBe("ecommerce");
    expect(detection.effectiveCategory).toBe("ecommerce");
    expect(detection.confidence).toBe("HIGH");
    expect(detection.decisionSource).toBe("AUTO_DETECTED");
    expect(detection.evidenceSignals.some((s) => s.includes("Product") || s.includes("Shopify"))).toBe(true);
  });

  // 3. STRIDETO: Career/jobs/education/scholarships signals and hybrid classification
  it("classifies STRIDETO as career & job opportunities with education/scholarship hybrid facets instead of retail ecommerce", () => {
    const home = createMockPage({
      requestedUrl: "https://strideto.com/",
      finalUrl: "https://strideto.com/",
      title: "StrideTo — Accelerating Career Opportunities, Scholarships & Professional Mentorship",
      headings: {
        h1: ["Unlock Life-Changing Fellowships and Career Pathways"],
        h2: ["Featured Scholarships for Underrepresented Students", "Internship Opportunities"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
      visibleTextSample: "Empowering ambitious youth with career access, university scholarships, corporate fellowships, and paid internships.",
      links: [
        { id: "l1", sourceUrl: "https://strideto.com/", targetUrl: "https://strideto.com/scholarships", isInternal: true, anchorText: "Apply for Scholarships", isBroken: false, isRedirect: false },
        { id: "l2", sourceUrl: "https://strideto.com/", targetUrl: "https://strideto.com/opportunities", isInternal: true, anchorText: "Browse Jobs & Internships", isBroken: false, isRedirect: false },
        { id: "l3", sourceUrl: "https://strideto.com/", targetUrl: "https://strideto.com/mentorship", isInternal: true, anchorText: "Connect with Mentors", isBroken: false, isRedirect: false },
      ],
    });

    const opportunityPage = createMockPage({
      requestedUrl: "https://strideto.com/opportunities/stem-fellowship",
      finalUrl: "https://strideto.com/opportunities/stem-fellowship",
      title: "STEM Summer Fellowship & Research Internship — StrideTo",
      headings: {
        h1: ["STEM Summer Fellowship"],
        h2: ["Eligibility & Qualifications", "Award Details"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
      visibleTextSample: "Apply for this scholarship fellowship. Paid student internship opportunity with career development support.",
      links: [
        { id: "l4", sourceUrl: "https://strideto.com/opportunities/stem-fellowship", targetUrl: "https://strideto.com/apply/stem-2026", isInternal: true, anchorText: "Apply Now", isBroken: false, isRedirect: false },
      ],
    });

    const detection = detectBusinessCategory({ pages: [home, opportunityPage] });

    // Must NOT be classified as ecommerce
    expect(detection.primaryCategory).not.toBe("ecommerce");
    expect(detection.effectiveCategory).not.toBe("ecommerce");
    // Identified as job_board / career portal with secondary education facets
    expect(detection.primaryCategory).toBe("job_board");
    expect(detection.secondaryFacets).toContain("education_and_scholarships");
    expect(detection.confidenceScore).toBeGreaterThanOrEqual(0.6);
  });

  // 4. SaaS platform fixture
  it("classifies SaaS software platforms based on web application, pricing, and demo signals", () => {
    const home = createMockPage({
      requestedUrl: "https://pulse-metrics.io/",
      title: "PulseMetrics — Enterprise Analytics & Workflow Automation Platform",
      headings: {
        h1: ["Automate Your Data Engineering Workflows"],
        h2: ["Powerful Cloud APIs and Native Integrations"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
      links: [
        { id: "l1", sourceUrl: "https://pulse-metrics.io/", targetUrl: "https://pulse-metrics.io/pricing", isInternal: true, anchorText: "View Pricing", isBroken: false, isRedirect: false },
        { id: "l2", sourceUrl: "https://pulse-metrics.io/", targetUrl: "https://pulse-metrics.io/demo", isInternal: true, anchorText: "Request Demo", isBroken: false, isRedirect: false },
        { id: "l3", sourceUrl: "https://pulse-metrics.io/", targetUrl: "https://pulse-metrics.io/trial", isInternal: true, anchorText: "Start Free Trial", isBroken: false, isRedirect: false },
      ],
    });

    const pricingPage = createMockPage({
      requestedUrl: "https://pulse-metrics.io/pricing",
      structuredData: [{ "@type": "SoftwareApplication", name: "PulseMetrics Cloud" }],
      visibleTextSample: "Pricing plans for teams. Starter, Professional, and Enterprise plans. API documentation, SOC 2 compliant.",
    });

    const detection = detectBusinessCategory({ pages: [home, pricingPage] });
    expect(detection.primaryCategory).toBe("saas");
    expect(detection.confidence).toBe("HIGH");
  });

  // 5. Publisher / Media fixture
  it("classifies Publisher / media platforms based on Article schemas and editorial markers", () => {
    const home = createMockPage({
      requestedUrl: "https://tech-chronicle.org/",
      title: "Tech Chronicle — Independent Software Journalism & Analysis",
      headings: {
        h1: ["Today's Top Technology News"],
        h2: ["AI Policy Deep Dive", "Cloud Architecture Series"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
      links: [
        { id: "l1", sourceUrl: "https://tech-chronicle.org/", targetUrl: "https://tech-chronicle.org/newsletter", isInternal: true, anchorText: "Subscribe to Newsletter", isBroken: false, isRedirect: false },
        { id: "l2", sourceUrl: "https://tech-chronicle.org/", targetUrl: "https://tech-chronicle.org/articles/ai-governance", isInternal: true, anchorText: "Read Full Article", isBroken: false, isRedirect: false },
      ],
    });

    const articlePage = createMockPage({
      requestedUrl: "https://tech-chronicle.org/articles/ai-governance",
      structuredData: [{ "@type": "NewsArticle", headline: "AI Governance Frameworks in 2026" }],
      visibleTextSample: "Published on October 24, 2026 by Sarah Jenkins. 6 min read. Editorial policy and corrections.",
    });

    const detection = detectBusinessCategory({ pages: [home, articlePage] });
    expect(detection.primaryCategory).toBe("publisher");
    expect(detection.confidence).toBe("HIGH");
  });

  // 6. Local service fixture
  it("classifies Local Service businesses based on LocalBusiness schema and service calls", () => {
    const page = createMockPage({
      requestedUrl: "https://downtown-plumbing.com/",
      structuredData: [{ "@type": "Plumber", name: "Downtown Plumbing Services" }],
      headings: { h1: ["24/7 Emergency Plumbing Services in Metro Seattle"], h2: ["Licensed & Insured Technicians", "Free Estimates"], h3: [], h4: [], h5: [], h6: [] },
      links: [
        { id: "l1", sourceUrl: "https://downtown-plumbing.com/", targetUrl: "tel:5550192834", isInternal: false, anchorText: "Call Now", isBroken: false, isRedirect: false },
        { id: "l2", sourceUrl: "https://downtown-plumbing.com/", targetUrl: "https://downtown-plumbing.com/appointment", isInternal: true, anchorText: "Book Appointment", isBroken: false, isRedirect: false },
      ],
      visibleTextSample: "Serving the greater Seattle metro area. Same-day service, free estimates, licensed & insured contractors.",
    });

    const detection = detectBusinessCategory({ pages: [page] });
    expect(detection.primaryCategory).toBe("local_service");
    expect(detection.confidence).toBe("HIGH");
  });

  // 7. Portfolio / Agency fixture
  it("classifies Creative Portfolio & Studio agencies based on case studies and work showcases", () => {
    const page = createMockPage({
      requestedUrl: "https://aurora-design.studio/",
      structuredData: [{ "@type": "CreativeWork", name: "Brand Identity Portfolio" }],
      headings: { h1: ["Digital Product Design & Strategy Agency"], h2: ["Selected Work & Case Studies", "Our Clients"], h3: [], h4: [], h5: [], h6: [] },
      links: [
        { id: "l1", sourceUrl: "https://aurora-design.studio/", targetUrl: "https://aurora-design.studio/work", isInternal: true, anchorText: "View Our Work", isBroken: false, isRedirect: false },
        { id: "l2", sourceUrl: "https://aurora-design.studio/", targetUrl: "https://aurora-design.studio/contact", isInternal: true, anchorText: "Start a Project", isBroken: false, isRedirect: false },
      ],
      visibleTextSample: "We are an award-winning creative agency and digital design studio. View recent case studies.",
    });

    const detection = detectBusinessCategory({ pages: [page] });
    expect(detection.primaryCategory).toBe("portfolio");
    expect(detection.confidence).toBe("HIGH");
  });

  // 8. Nonprofit fixture
  it("classifies Nonprofit organizations based on NGO schema, donation pathways, and 501(c)(3) markers", () => {
    const page = createMockPage({
      requestedUrl: "https://cleanwater-global.org/",
      structuredData: [{ "@type": "NGO", name: "Clean Water Global Initiative" }],
      headings: { h1: ["Clean Water for Every Community"], h2: ["Our Global Mission & Impact", "Ways to Give"], h3: [], h4: [], h5: [], h6: [] },
      links: [
        { id: "l1", sourceUrl: "https://cleanwater-global.org/", targetUrl: "https://cleanwater-global.org/donate", isInternal: true, anchorText: "Donate Now", isBroken: false, isRedirect: false },
        { id: "l2", sourceUrl: "https://cleanwater-global.org/", targetUrl: "https://cleanwater-global.org/volunteer", isInternal: true, anchorText: "Volunteer Today", isBroken: false, isRedirect: false },
      ],
      visibleTextSample: "501(c)(3) tax-deductible charitable organization. 100% of public donations fund water wells.",
    });

    const detection = detectBusinessCategory({ pages: [page] });
    expect(detection.primaryCategory).toBe("nonprofit");
    expect(detection.confidence).toBe("HIGH");
  });

  // 9. Ambiguous / sparse crawl: handles uncertainty cleanly without silent guessing
  it("handles sparse or ambiguous crawl evidence with LOW confidence and UNRESOLVED decision source", () => {
    const sparsePage = createMockPage({
      requestedUrl: "https://minimal-static.xyz/",
      title: "Welcome",
      headings: { h1: ["Welcome to our website"], h2: [], h3: [], h4: [], h5: [], h6: [] },
      visibleTextSample: "Under construction. More details coming soon.",
      links: [],
    });

    const detection = detectBusinessCategory({ pages: [sparsePage] });
    expect(detection.confidence).toBe("LOW");
    expect(detection.confidenceScore).toBeLessThan(0.6);
    expect(detection.decisionSource).toBe("UNRESOLVED");
    expect(detection.effectiveCategory).toBe("other");
    expect(detection.uncertaintyReason).toBeDefined();
  });

  // 10. Manual Override: Preserves detected category while applying effective override
  it("applies manual category override while preserving detected category and disclosing the override", () => {
    const saasPage = createMockPage({
      requestedUrl: "https://app-builder.cloud/",
      structuredData: [{ "@type": "SoftwareApplication" }],
      headings: { h1: ["Developer Cloud Platform"], h2: ["API Pricing"], h3: [], h4: [], h5: [], h6: [] },
      links: [
        { id: "l1", sourceUrl: "https://app-builder.cloud/", targetUrl: "https://app-builder.cloud/trial", isInternal: true, anchorText: "Start Free Trial", isBroken: false, isRedirect: false },
      ],
    });

    // Auto would detect SaaS, but operator manually overrides to portfolio
    const detection = detectBusinessCategory(
      { pages: [saasPage] },
      undefined,
      "portfolio"
    );

    expect(detection.primaryCategory).toBe("saas"); // What was detected
    expect(detection.effectiveCategory).toBe("portfolio"); // What was overridden
    expect(detection.decisionSource).toBe("MANUALLY_OVERRIDDEN");
  });

  // 11. Conversion Rules Integration with Effective Category
  describe("Conversion Rules (CRO-01, CRO-02, CRO-04) Category Adaptation", () => {
    it("evaluates job board conversion pathways as PASS on job search and apply links without requiring cart/checkout", () => {
      const cro02 = conversionRules.find((r) => r.id === "CRO-02")!;
      const jobPage = createMockPage({
        links: [
          { id: "1", sourceUrl: "https://jobs.example.com", targetUrl: "https://jobs.example.com/jobs", isInternal: true, anchorText: "Search Jobs", isBroken: false, isRedirect: false },
          { id: "2", sourceUrl: "https://jobs.example.com", targetUrl: "https://jobs.example.com/apply/42", isInternal: true, anchorText: "Apply Now", isBroken: false, isRedirect: false },
        ],
      });

      const ctx: RuleEvaluationContext = {
        targetUrl: "https://jobs.example.com",
        domain: "jobs.example.com",
        businessCategory: "job_board",
        pages: [jobPage],
        sitemapUrls: [],
        externalLinksTested: [],
      };

      const result = cro02.evaluate(ctx);
      expect(result.status).toBe("PASS");
      expect(result.earnedPoints).toBe(1);
      expect(result.title).toContain("Job Search / Application");
    });

    it("evaluates ecommerce conversion pathways as WARNING when cart/checkout is absent", () => {
      const cro02 = conversionRules.find((r) => r.id === "CRO-02")!;
      const informationalPage = createMockPage({
        links: [
          { id: "1", sourceUrl: "https://shop.example.com", targetUrl: "https://shop.example.com/about", isInternal: true, anchorText: "About Us", isBroken: false, isRedirect: false },
        ],
      });

      const ctx: RuleEvaluationContext = {
        targetUrl: "https://shop.example.com",
        domain: "shop.example.com",
        businessCategory: "ecommerce",
        pages: [informationalPage],
        sitemapUrls: [],
        externalLinksTested: [],
      };

      const result = cro02.evaluate(ctx);
      expect(result.status).toBe("WARNING");
      expect(result.earnedPoints).toBe(0.5);
      expect(result.title).toContain("Conversion Pathway Hard to Locate");
    });

    it("evaluates SaaS pricing transparency as PASS on pricing and plan links", () => {
      const cro04 = conversionRules.find((r) => r.id === "CRO-04")!;
      const saasPage = createMockPage({
        links: [
          { id: "1", sourceUrl: "https://saas.example.com", targetUrl: "https://saas.example.com/pricing", isInternal: true, anchorText: "Pricing & Plans", isBroken: false, isRedirect: false },
        ],
      });

      const ctx: RuleEvaluationContext = {
        targetUrl: "https://saas.example.com",
        domain: "saas.example.com",
        businessCategory: "saas",
        pages: [saasPage],
        sitemapUrls: [],
        externalLinksTested: [],
      };

      const result = cro04.evaluate(ctx);
      expect(result.status).toBe("PASS");
      expect(result.earnedPoints).toBe(1);
    });

    it("preserves catalogue invariant: 56 total rules across 11 categories totaling 100 points", () => {
      const allRules = assessmentRegistry.getAllRules();
      expect(allRules.length).toBe(56);

      const totalCataloguePoints = allRules.reduce((sum, r) => sum + r.maxPoints, 0);
      expect(totalCataloguePoints).toBe(100);

      const uniqueCategories = new Set(allRules.map((r) => r.category));
      expect(uniqueCategories.size).toBe(11);
    });
  });
});
