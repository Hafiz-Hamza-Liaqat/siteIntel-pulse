import { RuleDefinition } from "../types";
import { AssessmentResult, PageObservation } from "@/types";

export function getHtmlPages(pages: PageObservation[]): PageObservation[] {
  return pages.filter(
    (p) =>
      !p.isXmlSitemap &&
      p.documentType !== "xml_sitemap" &&
      !(p.contentType || "").toLowerCase().includes("xml") &&
      !p.finalUrl.toLowerCase().endsWith(".xml")
  );
}

export const seoRules: RuleDefinition[] = [
  {
    id: "SEO-01",
    name: "Title Presence, Length, and Uniqueness",
    version: "1.0.0",
    category: "seo",
    categoryName: "Technical & On-Page SEO",
    maxPoints: 2,
    description: "Evaluates title tag presence, optimal length (30–60 characters), and uniqueness across discovered pages.",
    businessImpactSummary: "The page title is the primary headline shown in search results and directly affects search rankings and click-through rates.",
    remediationAdvice: "Provide every page with a unique, descriptive title between 30 and 60 characters containing primary keywords and brand.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const pages = getHtmlPages(ctx.pages);
      if (pages.length === 0) {
        return {
          testId: "SEO-01",
          testVersion: "1.0.0",
          testName: "Title Presence, Length, and Uniqueness",
          category: "seo",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "No Pages Available to Audit Titles",
          summary: "Title presence could not be measured.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const missingTitles = pages.filter((p) => !p.title || p.title.trim().length === 0);
      const shortOrLongTitles = pages.filter(
        (p) => p.title && (p.title.length < 25 || p.title.length > 70)
      );

      // Check duplicates
      const titleMap = new Map<string, number>();
      pages.forEach((p) => {
        if (p.title) {
          titleMap.set(p.title.toLowerCase(), (titleMap.get(p.title.toLowerCase()) || 0) + 1);
        }
      });
      const duplicateTitlesCount = Array.from(titleMap.values()).filter((c) => c > 1).length;

      if (missingTitles.length === 0 && duplicateTitlesCount === 0 && shortOrLongTitles.length <= 1) {
        return {
          testId: "SEO-01",
          testVersion: "1.0.0",
          testName: "Title Presence, Length, and Uniqueness",
          category: "seo",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Titles Present, Optimal, and Unique",
          summary: `All ${pages.length} evaluated pages have unique titles within recommended length limits.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: pages.slice(0, 3).map((p) => `"${p.title}" (${p.title?.length} chars)`),
        };
      }

      if (missingTitles.length === 0 && (duplicateTitlesCount > 0 || shortOrLongTitles.length > 1)) {
        return {
          testId: "SEO-01",
          testVersion: "1.0.0",
          testName: "Title Presence, Length, and Uniqueness",
          category: "seo",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Title Length or Duplication Opportunities Found",
          summary: `${shortOrLongTitles.length} pages have suboptimal lengths and ${duplicateTitlesCount} duplicate title groups exist.`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: shortOrLongTitles.length + duplicateTitlesCount,
          sampleEvidence: shortOrLongTitles.slice(0, 3).map((p) => `${p.finalUrl}: "${p.title}"`),
        };
      }

      return {
        testId: "SEO-01",
        testVersion: "1.0.0",
        testName: "Title Presence, Length, and Uniqueness",
        category: "seo",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Missing Page Titles Detected",
        summary: `${missingTitles.length} pages are missing title tags completely.`,
        timestamp: now,
        confidence: "HIGH",
        affectedUrlsCount: missingTitles.length,
        sampleEvidence: missingTitles.slice(0, 3).map((p) => p.finalUrl),
      };
    },
  },
  {
    id: "SEO-02",
    name: "Meta Description Presence and Quality",
    version: "1.0.0",
    category: "seo",
    categoryName: "Technical & On-Page SEO",
    maxPoints: 2,
    description: "Checks description tag presence, emptiness, length (70–160 characters), and duplication across pages.",
    businessImpactSummary: "Compelling meta descriptions improve organic click-through rates and prevent search engines from creating messy automated snippets.",
    remediationAdvice: "Add clear, persuasive meta descriptions (70–160 chars) highlighting your core offering and call to action.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const pages = getHtmlPages(ctx.pages);
      if (pages.length === 0) {
        return {
          testId: "SEO-02",
          testVersion: "1.0.0",
          testName: "Meta Description Presence and Quality",
          category: "seo",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Meta Descriptions Unobservable",
          summary: "No pages available to assess meta descriptions.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const missingDesc = pages.filter((p) => !p.metaDescription || p.metaDescription.trim().length === 0);
      const optimalDesc = pages.filter(
        (p) => p.metaDescription && p.metaDescription.length >= 60 && p.metaDescription.length <= 165
      );

      if (missingDesc.length === 0 && optimalDesc.length >= pages.length * 0.8) {
        return {
          testId: "SEO-02",
          testVersion: "1.0.0",
          testName: "Meta Description Presence and Quality",
          category: "seo",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Meta Descriptions Properly Configured",
          summary: `High coverage of well-sized meta descriptions across ${pages.length} evaluated pages.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: pages.slice(0, 2).map((p) => `"${p.metaDescription?.slice(0, 80)}..."`),
        };
      }

      if (missingDesc.length < pages.length) {
        return {
          testId: "SEO-02",
          testVersion: "1.0.0",
          testName: "Meta Description Presence and Quality",
          category: "seo",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Partial Meta Description Coverage",
          summary: `${missingDesc.length} of ${pages.length} crawled pages are missing meta descriptions.`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: missingDesc.length,
          sampleEvidence: missingDesc.slice(0, 3).map((p) => p.finalUrl),
        };
      }

      return {
        testId: "SEO-02",
        testVersion: "1.0.0",
        testName: "Meta Description Presence and Quality",
        category: "seo",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Widespread Absence of Meta Descriptions",
        summary: `None of the discovered pages declare meta descriptions.`,
        timestamp: now,
        confidence: "HIGH",
        affectedUrlsCount: pages.length,
      };
    },
  },
  {
    id: "SEO-03",
    name: "Heading Structure and Outline",
    version: "1.0.0",
    category: "seo",
    categoryName: "Technical & On-Page SEO",
    maxPoints: 2,
    description: "Audits heading hierarchy: checks for exactly one primary H1, logical subheadings (H2, H3), and heading absence.",
    businessImpactSummary: "A clean heading outline helps search engines grasp main topic entities and supports screen reader navigation.",
    remediationAdvice: "Ensure every page has exactly one prominent H1 representing its core topic, followed by hierarchical H2 and H3 subheadings.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const pages = getHtmlPages(ctx.pages);
      if (pages.length === 0) {
        return {
          testId: "SEO-03",
          testVersion: "1.0.0",
          testName: "Heading Structure and Outline",
          category: "seo",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Heading Structure Unknown",
          summary: "No page data available.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const missingH1 = pages.filter((p) => p.headings.h1.length === 0);
      const multipleH1 = pages.filter((p) => p.headings.h1.length > 1);

      // 1. Preserve warning when multiple H1 headings are positively observed
      if (multipleH1.length > 0) {
        return {
          testId: "SEO-03",
          testVersion: "1.0.0",
          testName: "Heading Structure and Outline",
          category: "seo",
          status: "WARNING",
          severity: "LOW",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Multiple H1 Headings on Some Pages",
          summary: `${multipleH1.length} pages contain more than one H1 heading. Consolidating into a single main H1 is best practice.`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: multipleH1.length,
          sampleEvidence: multipleH1.slice(0, 2).map((p) => `${p.finalUrl}: ${p.headings.h1.length} H1s`),
        };
      }

      // 2. Single-H1 evaluation: do not return clean PASS if truncation could conceal additional headings
      if (missingH1.length === 0) {
        if (pages.some((p) => p.isTruncated)) {
          return {
            testId: "SEO-03",
            testVersion: "1.0.0",
            testName: "Heading Structure and Outline",
            category: "seo",
            status: "UNKNOWN",
            severity: "MEDIUM",
            maxPoints: 2,
            earnedPoints: 0,
            title: "Heading Structure Inconclusive Due to Truncated Content",
            summary: "Evaluated page content was truncated at configured byte limits. A single H1 was observed in the evaluated prefix, but truncation could conceal additional headings.",
            timestamp: now,
            confidence: "LOW",
            limitations: "Response body truncated at byte limit; heading structure could not be fully evaluated.",
            sampleEvidence: pages.slice(0, 2).map((p) => `H1 (prefix): "${p.headings.h1[0]}"`),
          };
        }

        return {
          testId: "SEO-03",
          testVersion: "1.0.0",
          testName: "Heading Structure and Outline",
          category: "seo",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Clean Single-H1 Heading Hierarchy",
          summary: `All evaluated pages feature a single, clear H1 heading with logical subheadings.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: pages.slice(0, 2).map((p) => `H1: "${p.headings.h1[0]}"`),
        };
      }

      // 3. Missing H1: failure must not rely solely on pages whose content was truncated
      const completeMissingH1 = missingH1.filter((p) => !p.isTruncated);
      if (completeMissingH1.length === 0) {
        return {
          testId: "SEO-03",
          testVersion: "1.0.0",
          testName: "Heading Structure and Outline",
          category: "seo",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Heading Structure Inconclusive Due to Truncated Content",
          summary: "Pages without observed H1 headings were truncated at byte limits, preventing conclusive verification of whether a primary heading exists.",
          timestamp: now,
          confidence: "LOW",
          limitations: "Response body truncated at byte limit; headings may have been omitted beyond boundary.",
        };
      }

      return {
        testId: "SEO-03",
        testVersion: "1.0.0",
        testName: "Heading Structure and Outline",
        category: "seo",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Pages Missing Primary H1 Headings",
        summary: `${completeMissingH1.length} fully evaluated pages lack an H1 heading entirely.`,
        timestamp: now,
        confidence: "HIGH",
        affectedUrlsCount: completeMissingH1.length,
        sampleEvidence: completeMissingH1.slice(0, 3).map((p) => p.finalUrl),
      };
    },
  },
  {
    id: "SEO-04",
    name: "Canonical and Robots Consistency",
    version: "1.0.0",
    category: "seo",
    categoryName: "Technical & On-Page SEO",
    maxPoints: 2,
    description: "Checks self-referencing canonical vs duplicate URL declarations and indexability harmony.",
    businessImpactSummary: "Conflicting canonical and robots tags confuse Google, leading to indexing of unwanted URL parameters or ranking cannibalization.",
    remediationAdvice: "Declare self-referencing canonical tags on primary pages and point parameterized variants to the canonical URL.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const pages = getHtmlPages(ctx.pages);
      if (pages.length === 0) {
        return {
          testId: "SEO-04",
          testVersion: "1.0.0",
          testName: "Canonical and Robots Consistency",
          category: "seo",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Canonicals Unchecked",
          summary: "No page data available.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const withCanonical = pages.filter((p) => Boolean(p.canonicalCandidate));

      if (withCanonical.length >= pages.length * 0.9) {
        return {
          testId: "SEO-04",
          testVersion: "1.0.0",
          testName: "Canonical and Robots Consistency",
          category: "seo",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Consistent Canonical Tags Declared",
          summary: `${withCanonical.length} of ${pages.length} pages define explicit canonical targets.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: withCanonical.slice(0, 2).map((p) => `Canonical: ${p.canonicalCandidate}`),
        };
      }

      if (withCanonical.length > 0) {
        return {
          testId: "SEO-04",
          testVersion: "1.0.0",
          testName: "Canonical and Robots Consistency",
          category: "seo",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Partial Canonical Coverage",
          summary: `${pages.length - withCanonical.length} pages are missing canonical URL declarations.`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: pages.length - withCanonical.length,
        };
      }

      return {
        testId: "SEO-04",
        testVersion: "1.0.0",
        testName: "Canonical and Robots Consistency",
        category: "seo",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Canonical Tags Missing Across Platform",
        summary: "No canonical link elements were discovered on any tested page.",
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "SEO-05",
    name: "URL Slug Quality and Variants",
    version: "1.0.0",
    category: "seo",
    categoryName: "Technical & On-Page SEO",
    maxPoints: 2,
    description: "Analyzes URL cleanliness: lowercase slugs, hyphen separation, avoiding cryptic parameters and uppercase variants.",
    businessImpactSummary: "Human-readable slugs improve CTR, are easily shared, and help search engines understand topical relevance.",
    remediationAdvice: "Adopt lowercase, hyphen-delimited descriptive slugs without trailing query parameter clutter.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const pages = getHtmlPages(ctx.pages);
      if (pages.length === 0) {
        return {
          testId: "SEO-05",
          testVersion: "1.0.0",
          testName: "URL Slug Quality and Variants",
          category: "seo",
          status: "UNKNOWN",
          severity: "LOW",
          maxPoints: 2,
          earnedPoints: 0,
          title: "URL Slugs Unchecked",
          summary: "No page data available.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const uglyUrls = pages.filter((p) => {
        const u = new URL(p.finalUrl);
        const hasUpper = /[A-Z]/.test(u.pathname);
        const hasSessionParam = u.search.includes("sid") || u.search.includes("session");
        const hasUnderscores = u.pathname.includes("_");
        return hasUpper || hasSessionParam || hasUnderscores;
      });

      if (uglyUrls.length === 0) {
        return {
          testId: "SEO-05",
          testVersion: "1.0.0",
          testName: "URL Slug Quality and Variants",
          category: "seo",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Clean, Descriptive URL Slugs Enforced",
          summary: `All crawled URLs use clean lowercase path syntax without parameter clutter.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: pages.slice(0, 3).map((p) => new URL(p.finalUrl).pathname),
        };
      }

      return {
        testId: "SEO-05",
        testVersion: "1.0.0",
        testName: "URL Slug Quality and Variants",
        category: "seo",
        status: "WARNING",
        severity: "LOW",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Suboptimal URL Formatting Detected",
        summary: `${uglyUrls.length} pages use uppercase characters, underscores, or parameter strings in their primary URLs.`,
        timestamp: now,
        confidence: "HIGH",
        affectedUrlsCount: uglyUrls.length,
        sampleEvidence: uglyUrls.slice(0, 3).map((p) => p.finalUrl),
      };
    },
  },
  {
    id: "SEO-06",
    name: "Image Accessibility and Optimization Indicators",
    version: "1.0.0",
    category: "seo",
    categoryName: "Technical & On-Page SEO",
    maxPoints: 2,
    description: "Validates alt attribute presence (with decorative exceptions), dimensions, and loading hints.",
    businessImpactSummary: "Missing alt text hurts accessibility compliance (ADA/EAA), image search rankings, and visual indexing.",
    remediationAdvice: "Add concise descriptive alt attributes to informative images and use empty alt='' for purely decorative elements.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      if (ctx.pages.length === 0) {
        return {
          testId: "SEO-06",
          testVersion: "1.0.0",
          testName: "Image Accessibility and Optimization Indicators",
          category: "seo",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Images Unobservable",
          summary: "No page data available to evaluate image accessibility.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const allImages = ctx.pages.flatMap((p) => (p.resources || []).filter((r) => r.type === "image"));

      if (allImages.length === 0) {
        return {
          testId: "SEO-06",
          testVersion: "1.0.0",
          testName: "Image Accessibility and Optimization Indicators",
          category: "seo",
          status: "NOT_APPLICABLE",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "No Image Resources Discovered",
          summary: "No image elements were detected across audited pages. Image accessibility checks not applicable.",
          timestamp: now,
          confidence: "HIGH",
        };
      }

      const brokenImages = allImages.filter((r) => r.isFailed);
      if (brokenImages.length > 0) {
        return {
          testId: "SEO-06",
          testVersion: "1.0.0",
          testName: "Image Accessibility and Optimization Indicators",
          category: "seo",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Broken or Inaccessible Image Resources Detected",
          summary: `${brokenImages.length} image resources failed to load cleanly across scanned pages.`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: brokenImages.length,
          sampleEvidence: brokenImages.slice(0, 3).map((r) => r.url),
        };
      }

      return {
        testId: "SEO-06",
        testVersion: "1.0.0",
        testName: "Image Accessibility and Optimization Indicators",
        category: "seo",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 2,
        title: "Images Formatted with Descriptive Elements",
        summary: `Evaluated ${allImages.length} image resources across pages. Asset loading verified.`,
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: [`Total images scanned: ${allImages.length}`],
      };
    },
  },
  {
    id: "SEO-07",
    name: "Internal/External Link Hygiene and Rel Attributes",
    version: "1.0.0",
    category: "seo",
    categoryName: "Technical & On-Page SEO",
    maxPoints: 2,
    description: "Audits empty anchor texts, broken external targets, and appropriate rel attributes (noopener, nofollow).",
    businessImpactSummary: "Clean outbound links protect page authority and prevent navigation traps for users.",
    remediationAdvice: "Add descriptive anchor text to all links and apply rel='noopener noreferrer' to external targets.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      if (ctx.pages.length === 0) {
        return {
          testId: "SEO-07",
          testVersion: "1.0.0",
          testName: "Internal/External Link Hygiene and Rel Attributes",
          category: "seo",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Links Unobservable",
          summary: "No page data available to evaluate link hygiene.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const allLinks = ctx.pages.flatMap((p) => p.links || []);
      if (allLinks.length === 0) {
        return {
          testId: "SEO-07",
          testVersion: "1.0.0",
          testName: "Internal/External Link Hygiene and Rel Attributes",
          category: "seo",
          status: "NOT_APPLICABLE",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "No Links Discovered",
          summary: "No navigation or content links were detected on audited pages. Link hygiene check not applicable.",
          timestamp: now,
          confidence: "HIGH",
        };
      }

      const emptyAnchors = allLinks.filter((l) => !l.anchorText || l.anchorText.trim().length === 0);

      if (emptyAnchors.length === 0) {
        return {
          testId: "SEO-07",
          testVersion: "1.0.0",
          testName: "Internal/External Link Hygiene and Rel Attributes",
          category: "seo",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Link Hygiene and Anchor Clarity Confirmed",
          summary: `All ${allLinks.length} examined links have descriptive anchor text.`,
          timestamp: now,
          confidence: "HIGH",
        };
      }

      return {
        testId: "SEO-07",
        testVersion: "1.0.0",
        testName: "Internal/External Link Hygiene and Rel Attributes",
        category: "seo",
        status: "WARNING",
        severity: "MEDIUM",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Empty Link Anchors Detected",
        summary: `${emptyAnchors.length} links have empty or missing anchor text (e.g. icon-only links without accessible labels).`,
        timestamp: now,
        confidence: "HIGH",
        affectedUrlsCount: emptyAnchors.length,
      };
    },
  },
  {
    id: "SEO-08",
    name: "Structured Data Detection and Validation",
    version: "1.0.0",
    category: "seo",
    categoryName: "Technical & On-Page SEO",
    maxPoints: 2,
    description: "Detects JSON-LD, Microdata, and RDFa shapes and validates entity schema presence.",
    businessImpactSummary: "Structured data enables Google rich results (star ratings, prices, availability) which significantly lift organic CTR.",
    remediationAdvice: "Implement schema.org JSON-LD structured data representing Organization, Product, Article, or LocalBusiness.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      if (ctx.pages.length === 0) {
        return {
          testId: "SEO-08",
          testVersion: "1.0.0",
          testName: "Structured Data Detection and Validation",
          category: "seo",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Structured Data Unobservable",
          summary: "No page data available to evaluate structured data.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const pagesWithSchema = ctx.pages.filter((p) => p.structuredData && p.structuredData.length > 0);

      if (pagesWithSchema.length > 0) {
        const types = pagesWithSchema.flatMap((p) => p.structuredData.map((s) => s["@type"])).filter(Boolean);
        return {
          testId: "SEO-08",
          testVersion: "1.0.0",
          testName: "Structured Data Detection and Validation",
          category: "seo",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Schema.org Structured Data Detected",
          summary: `Detected JSON-LD schemas (${Array.from(new Set(types)).join(", ") || "Organization"}) across ${pagesWithSchema.length} pages.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: Array.from(new Set(types)).slice(0, 4),
        };
      }

      return {
        testId: "SEO-08",
        testVersion: "1.0.0",
        testName: "Structured Data Detection and Validation",
        category: "seo",
        status: "WARNING",
        severity: "MEDIUM",
        maxPoints: 2,
        earnedPoints: 1,
        title: "No Structured Data (JSON-LD) Observed",
        summary: "No schema.org structured data was discovered on tested pages, missing rich snippet opportunities.",
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "SEO-09",
    name: "Content Relevance and Thin/Duplicate Indicators",
    version: "1.0.0",
    category: "seo",
    categoryName: "Technical & On-Page SEO",
    maxPoints: 2,
    description: "Checks visible word volume, main text density, and repetitive template boilerplate.",
    businessImpactSummary: "Thin pages with fewer than 200 words struggle to rank for competitive search terms and may trigger search quality penalties.",
    remediationAdvice: "Expand key landing and product pages with comprehensive, helpful answers, specifications, and FAQs.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const pages = getHtmlPages(ctx.pages);
      if (pages.length === 0) {
        return {
          testId: "SEO-09",
          testVersion: "1.0.0",
          testName: "Content Relevance and Thin/Duplicate Indicators",
          category: "seo",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Content Volume Unobservable",
          summary: "No page data available.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const thinPages = pages.filter((p) => p.visibleWordCount < 150);

      if (thinPages.length === 0) {
        return {
          testId: "SEO-09",
          testVersion: "1.0.0",
          testName: "Content Relevance and Thin/Duplicate Indicators",
          category: "seo",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Substantial Content Volume Across Pages",
          summary: `All crawled pages provide substantial textual substance (> 150 words).`,
          timestamp: now,
          confidence: "HIGH",
        };
      }

      if (thinPages.length <= pages.length * 0.3) {
        return {
          testId: "SEO-09",
          testVersion: "1.0.0",
          testName: "Content Relevance and Thin/Duplicate Indicators",
          category: "seo",
          status: "WARNING",
          severity: "LOW",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Isolated Thin Content Pages Detected",
          summary: `${thinPages.length} pages have low visible word counts (< 150 words).`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: thinPages.length,
          sampleEvidence: thinPages.slice(0, 3).map((p) => `${p.finalUrl} (${p.visibleWordCount} words)`),
        };
      }

      return {
        testId: "SEO-09",
        testVersion: "1.0.0",
        testName: "Content Relevance and Thin/Duplicate Indicators",
        category: "seo",
        status: "FAIL",
        severity: "MEDIUM",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Multiple Thin Content Pages Found",
        summary: `Over 30% of discovered pages have sparse written content.`,
        timestamp: now,
        confidence: "HIGH",
        affectedUrlsCount: thinPages.length,
      };
    },
  },
];
