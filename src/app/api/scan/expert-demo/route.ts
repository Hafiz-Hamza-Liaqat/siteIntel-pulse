import { NextRequest, NextResponse } from "next/server";
import { assessmentRegistry } from "@/lib/catalogue/registry";
import { projectExpertReport } from "@/lib/reports/expert-projection";
import { projectOwnerReport } from "@/lib/reports/owner-projection";
import { scanDb } from "@/lib/persistence/db";
import { authenticateRequest } from "@/lib/auth/guard";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import type { PageObservation, LinkObservation, ResourceObservation, ScanCoverage } from "@/types";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  const isProd = process.env.NODE_ENV === "production";

  // In production mode, demonstration generation requires an authenticated session
  if (isProd && !auth) {
    return NextResponse.json(
      {
        error: "Authentication required to generate demonstration audits in production.",
        code: "UNAUTHENTICATED",
      },
      { status: 401 }
    );
  }

  const tenantId = auth ? auth.tenant.id : "tenant_comp_b";
  const userId = auth ? auth.user.id : "usr_companyb_owner";

  const now = new Date().toISOString();

  const scanRequest = {
    targetUrl: "https://example-shop.demo",
    platformName: "Example Storefront Inc.",
    businessCategory: "ecommerce" as const,
    targetMarket: "US",
    preferredLanguage: "en",
    businessGoal: "Accelerate organic discovery, reduce bounce rate, and optimize Core Web Vitals.",
    targetAudience: "Consumer shoppers and mobile buyers.",
    competitors: ["competitor-benchmark.demo"],
    maxPages: 10,
    maxDepth: 3,
  };

  const sampleLinks: LinkObservation[] = [
    { id: "lnk_1", sourceUrl: "https://example-shop.demo/", targetUrl: "https://example-shop.demo/products", isInternal: true, anchorText: "Shop Products", isBroken: false, isRedirect: false },
    { id: "lnk_2", sourceUrl: "https://example-shop.demo/", targetUrl: "https://example-shop.demo/about", isInternal: true, anchorText: "About Us", isBroken: false, isRedirect: false },
    { id: "lnk_3", sourceUrl: "https://example-shop.demo/", targetUrl: "https://example-shop.demo/contact", isInternal: true, anchorText: "Contact Us", isBroken: false, isRedirect: false },
    { id: "lnk_4", sourceUrl: "https://example-shop.demo/", targetUrl: "https://example-shop.demo/privacy", isInternal: true, anchorText: "Privacy Policy", isBroken: false, isRedirect: false },
    { id: "lnk_5", sourceUrl: "https://example-shop.demo/", targetUrl: "https://example-shop.demo/broken-link", isInternal: true, anchorText: "Broken Spec", isBroken: true, isRedirect: false, statusCode: 404 },
    { id: "lnk_6", sourceUrl: "https://example-shop.demo/", targetUrl: "https://external-partner.demo", isInternal: false, anchorText: "Partner", isBroken: false, isRedirect: false },
  ];

  const sampleResources: ResourceObservation[] = [
    { id: "res_1", url: "https://example-shop.demo/styles.css", type: "stylesheet", sizeBytes: 28000, isRenderBlocking: false, isThirdParty: false },
    { id: "res_2", url: "https://example-shop.demo/bundle.js", type: "script", sizeBytes: 110000, isRenderBlocking: true, isThirdParty: false },
    { id: "res_3", url: "https://example-shop.demo/hero.webp", type: "image", sizeBytes: 35000, isRenderBlocking: false, isThirdParty: false },
    { id: "res_4", url: "https://www.googletagmanager.com/gtag/js?id=G-DEMO9988", type: "script", sizeBytes: 42000, isRenderBlocking: false, isThirdParty: true },
  ];

  const samplePages: PageObservation[] = [
    {
      id: "pg_1",
      requestedUrl: "https://example-shop.demo/",
      normalizedUrl: "https://example-shop.demo/",
      finalUrl: "https://example-shop.demo/",
      statusCode: 200,
      responseTimeMs: 185,
      contentType: "text/html; charset=UTF-8",
      redirectHistory: [],
      title: "Example Storefront — Premium Modern Hardware & Gadgets",
      metaDescription: "Explore our collection of premium developer gadgets and high-performance electronics with next-day shipping.",
      canonicalCandidate: "https://example-shop.demo/",
      robotsDirectives: ["index", "follow"],
      headings: {
        h1: ["Next-Generation Hardware & Accessories"],
        h2: ["Featured Electronics", "Customer Reviews", "Why Choose Us"],
        h3: ["Smart Gadgets", "USB-C Peripherals"],
        h4: [],
        h5: [],
        h6: [],
      },
      visibleWordCount: 840,
      language: "en",
      doctype: "html",
      encoding: "UTF-8",
      links: sampleLinks,
      resources: sampleResources,
      structuredData: [
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Example Storefront Inc.",
          url: "https://example-shop.demo",
        },
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          url: "https://example-shop.demo",
        },
      ],
      openGraph: {
        "og:title": "Example Storefront — Modern Gadgets",
        "og:description": "Shop high-performance electronics.",
        "og:type": "website",
      },
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "strict-origin-when-cross-origin",
        "content-security-policy": "default-src 'self' https:; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline';",
        "server": "cloudflare",
      },
      cookieAttributes: [
        { name: "session_id", secure: true, httpOnly: true, sameSite: "Lax" },
      ],
      templateConfidence: "HIGH" as const,
      discoveredAtDepth: 0,
      discoverySource: "entry",
      consoleErrors: [],
    },
    {
      id: "pg_2",
      requestedUrl: "https://example-shop.demo/products",
      normalizedUrl: "https://example-shop.demo/products",
      finalUrl: "https://example-shop.demo/products",
      statusCode: 200,
      responseTimeMs: 240,
      contentType: "text/html; charset=UTF-8",
      redirectHistory: [],
      title: "All Products — Example Storefront Hardware Catalog",
      metaDescription: "Browse all premium electronics, developer boards, and accessories with comprehensive warranties.",
      canonicalCandidate: "https://example-shop.demo/products",
      robotsDirectives: ["index", "follow"],
      headings: {
        h1: ["All Product Categories"],
        h2: ["Wireless Hubs", "Development Boards"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
      visibleWordCount: 520,
      language: "en",
      doctype: "html",
      encoding: "UTF-8",
      links: [],
      resources: sampleResources,
      structuredData: [
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Featured Products",
        },
      ],
      openGraph: {},
      headers: {
        "content-type": "text/html; charset=UTF-8",
      },
      cookieAttributes: [],
      templateConfidence: "HIGH" as const,
      discoveredAtDepth: 1,
      discoverySource: "internal_link",
      consoleErrors: [],
    },
    {
      id: "pg_3",
      requestedUrl: "https://example-shop.demo/contact",
      normalizedUrl: "https://example-shop.demo/contact",
      finalUrl: "https://example-shop.demo/contact",
      statusCode: 200,
      responseTimeMs: 195,
      contentType: "text/html; charset=UTF-8",
      redirectHistory: [],
      title: "Contact Support — Example Storefront Client Services",
      metaDescription: "Get in touch with customer support, request enterprise hardware quotes, or track orders.",
      canonicalCandidate: "https://example-shop.demo/contact",
      robotsDirectives: ["index", "follow"],
      headings: {
        h1: ["Contact Our Engineering & Support Teams"],
        h2: ["Live Chat", "Office Locations"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
      visibleWordCount: 380,
      language: "en",
      doctype: "html",
      encoding: "UTF-8",
      links: [],
      resources: [],
      structuredData: [],
      openGraph: {},
      headers: {
        "content-type": "text/html; charset=UTF-8",
      },
      cookieAttributes: [],
      templateConfidence: "HIGH" as const,
      discoveredAtDepth: 1,
      discoverySource: "internal_link",
      consoleErrors: [],
    },
  ];

  const coverage: ScanCoverage = {
    discoveredPages: 5,
    testedPages: 3,
    skippedPages: 2,
    failedPages: 0,
    inaccessiblePages: 0,
    totalBytesFetched: 480000,
    totalPagesBudget: 10,
    crawlDepthReached: 1,
    externalLinksTested: 1,
    resourcesTested: 4,
    isExhaustive: false,
    weightedPointsEvaluated: 88,
    totalWeightedPoints: 100,
    coveragePercentage: 88,
  };

  const crawlResult = {
    pages: samplePages,
    coverage,
    robotsTxt: "User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://example-shop.demo/sitemap.xml",
    sitemapUrls: ["https://example-shop.demo/sitemap.xml"],
    externalLinksTested: [sampleLinks[5]],
    discoveredPageUrls: samplePages.map((p) => p.requestedUrl),
  };

  const evalContext = {
    targetUrl: scanRequest.targetUrl,
    domain: "example-shop.demo",
    businessCategory: scanRequest.businessCategory,
    pages: crawlResult.pages,
    robotsTxt: crawlResult.robotsTxt,
    sitemapUrls: crawlResult.sitemapUrls,
    externalLinksTested: crawlResult.externalLinksTested,
    competitors: scanRequest.competitors,
  };

  const assessmentResults = assessmentRegistry.evaluateAll(evalContext);

  const job = await scanDb.createJob(scanRequest, tenantId, userId);
  const jobId = job.id;

  const ownerReport = projectOwnerReport(jobId, scanRequest, crawlResult, assessmentResults, tenantId);
  const expertReport = projectExpertReport(jobId, scanRequest, crawlResult, assessmentResults, {}, tenantId);

  await scanDb.saveReport(ownerReport, tenantId);
  await scanDb.saveExpertReport(expertReport, tenantId);

  await scanDb.updateJob(
    jobId,
    {
      status: "completed",
      currentStage: "Controlled demonstration ready.",
      progressPercentage: 100,
      report: ownerReport,
      expertReport,
      expertReportId: expertReport.metadata.reportId,
      completedAt: now,
    },
    tenantId
  );

  const response = NextResponse.json({
    reportId: expertReport.metadata.reportId,
    jobId,
    report: expertReport,
  });

  return response;
}
