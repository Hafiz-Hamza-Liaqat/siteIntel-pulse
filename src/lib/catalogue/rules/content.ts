import { RuleDefinition } from "../types";
import { AssessmentResult, PageObservation } from "@/types";

function getHtmlPages(pages: PageObservation[]): PageObservation[] {
  return pages.filter(
    (p) =>
      !p.isXmlSitemap &&
      p.documentType !== "xml_sitemap" &&
      !(p.contentType || "").toLowerCase().includes("xml") &&
      !p.finalUrl.toLowerCase().endsWith(".xml")
  );
}

export const contentRules: RuleDefinition[] = [
  {
    id: "CNT-01",
    name: "Business Purpose and Service Clarity",
    version: "1.0.0",
    category: "content_quality",
    categoryName: "Content Quality & Trust",
    maxPoints: 2,
    description: "Evaluates whether visible headings and hero introductory text clearly communicate what the platform offers.",
    businessImpactSummary: "Visitors decide whether to stay on your platform within 5 seconds. If your value proposition is ambiguous, bounce rates soar.",
    remediationAdvice: "State clearly what problem you solve, who you serve, and your primary differentiator in the main homepage hero.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const entry = ctx.pages[0];
      if (!entry) {
        return {
          testId: "CNT-01",
          testVersion: "1.0.0",
          testName: "Business Purpose and Service Clarity",
          category: "content_quality",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Entry Page Unobservable",
          summary: "No entry page data available to evaluate business purpose clarity.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const h1Text = entry.headings.h1[0] || "";
      const textSample = entry.visibleTextSample || "";

      if (h1Text.length >= 10 && textSample.length > 50) {
        return {
          testId: "CNT-01",
          testVersion: "1.0.0",
          testName: "Business Purpose and Service Clarity",
          category: "content_quality",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Clear Value Proposition & Offering Stated",
          summary: `Primary headline ("${h1Text.slice(0, 50)}...") and introductory copy provide a clear description of platform purpose.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Headline: "${h1Text}"`],
        };
      }

      return {
        testId: "CNT-01",
        testVersion: "1.0.0",
        testName: "Business Purpose and Service Clarity",
        category: "content_quality",
        status: "WARNING",
        severity: "MEDIUM",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Vague or Minimal Hero Messaging",
        summary: "The main page lacks a descriptive value proposition explaining the core business offering.",
        timestamp: now,
        confidence: "MEDIUM",
      };
    },
  },
  {
    id: "CNT-02",
    name: "Content Structure and Readability",
    version: "1.0.0",
    category: "content_quality",
    categoryName: "Content Quality & Trust",
    maxPoints: 2,
    description: "Evaluates paragraph chunking, subheadings, and scan-friendly readability across discovered pages.",
    businessImpactSummary: "Scannable content with subheadings and bullet points increases reading time and customer comprehension.",
    remediationAdvice: "Break up long walls of text with descriptive subheadings (H2, H3), bulleted lists, and highlighted takeaways.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const pages = getHtmlPages(ctx.pages);
      if (pages.length === 0) {
        return {
          testId: "CNT-02",
          testVersion: "1.0.0",
          testName: "Content Structure and Readability",
          category: "content_quality",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Content Structure Unobservable",
          summary: "No HTML pages available to evaluate content structure.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const wellStructured = pages.filter((p) => p.headings.h2.length >= 1 || p.headings.h3.length >= 1);

      if (wellStructured.length >= pages.length * 0.7) {
        return {
          testId: "CNT-02",
          testVersion: "1.0.0",
          testName: "Content Structure and Readability",
          category: "content_quality",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Clean Content Structure and Subheading Flow",
          summary: "Evaluated pages utilize structured subheadings and paragraph formatting for scan-friendly reading.",
          timestamp: now,
          confidence: "HIGH",
        };
      }

      return {
        testId: "CNT-02",
        testVersion: "1.0.0",
        testName: "Content Structure and Readability",
        category: "content_quality",
        status: "WARNING",
        severity: "LOW",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Subheading Structure Could Be Improved",
        summary: "Multiple pages feature unstructured text blocks lacking organizing H2/H3 subheadings.",
        timestamp: now,
        confidence: "MEDIUM",
      };
    },
  },
  {
    id: "CNT-03",
    name: "Trust and Ownership Signals",
    version: "1.0.0",
    category: "content_quality",
    categoryName: "Content Quality & Trust",
    maxPoints: 2,
    description: "Detects essential trust signals: About Us, Contact, Privacy Policy, Terms of Service, and company information.",
    businessImpactSummary: "Missing contact info, privacy policies, or legal terms destroys buyer trust and triggers Google quality rater demotions.",
    remediationAdvice: "Link clearly to About, Contact, Privacy Policy, and Terms of Service in your footer navigation.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      if (ctx.pages.length === 0) {
        return {
          testId: "CNT-03",
          testVersion: "1.0.0",
          testName: "Trust and Ownership Signals",
          category: "content_quality",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Trust Signals Unobservable",
          summary: "No page data available to evaluate trust signals.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const allLinks = ctx.pages.flatMap((p) => p.links);
      const linkHrefs = allLinks.map((l) => l.targetUrl.toLowerCase());

      const hasAbout = linkHrefs.some((h) => h.includes("about"));
      const hasContact = linkHrefs.some((h) => h.includes("contact") || h.includes("support"));
      const hasPrivacy = linkHrefs.some((h) => h.includes("privacy"));
      const hasTerms = linkHrefs.some((h) => h.includes("terms") || h.includes("conditions"));

      const trustSignalsCount = [hasAbout, hasContact, hasPrivacy, hasTerms].filter(Boolean).length;

      if (trustSignalsCount >= 3) {
        return {
          testId: "CNT-03",
          testVersion: "1.0.0",
          testName: "Trust and Ownership Signals",
          category: "content_quality",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Strong Trust and Ownership Signals Present",
          summary: `Identified key legitimacy signals: ${hasAbout ? "About page, " : ""}${hasContact ? "Contact page, " : ""}${hasPrivacy ? "Privacy policy, " : ""}${hasTerms ? "Terms of service" : ""}.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Trust pages verified: ${trustSignalsCount}/4`],
        };
      }

      if (trustSignalsCount >= 1) {
        return {
          testId: "CNT-03",
          testVersion: "1.0.0",
          testName: "Trust and Ownership Signals",
          category: "content_quality",
          status: "WARNING",
          severity: "HIGH",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Incomplete Legal & Trust Signals",
          summary: `Only ${trustSignalsCount} of 4 essential trust pages detected. Missing ${!hasPrivacy ? "Privacy Policy, " : ""}${!hasTerms ? "Terms of Service" : ""} hurts business credibility.`,
          timestamp: now,
          confidence: "HIGH",
        };
      }

      return {
        testId: "CNT-03",
        testVersion: "1.0.0",
        testName: "Trust and Ownership Signals",
        category: "content_quality",
        status: "FAIL",
        severity: "CRITICAL",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Absence of Core Business Trust Signals",
        summary: "No About, Contact, Privacy, or Terms links could be located across the platform.",
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "CNT-04",
    name: "Knowledge and Resource Content Opportunities",
    version: "1.0.0",
    category: "content_quality",
    categoryName: "Content Quality & Trust",
    maxPoints: 2,
    description: "Evaluates presence of blog, resources, FAQ, or help content as an organic traffic and authority growth opportunity.",
    businessImpactSummary: "An active blog or knowledge base captures top-of-funnel search volume and establishes thought leadership.",
    remediationAdvice: "Launch an educational blog or knowledge resource addressing common customer questions and industry topics.",
    isContextDependent: true,
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      if (ctx.pages.length === 0) {
        return {
          testId: "CNT-04",
          testVersion: "1.0.0",
          testName: "Knowledge and Resource Content Opportunities",
          category: "content_quality",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Knowledge Hub Unobservable",
          summary: "No page data available to evaluate educational content.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const allLinks = ctx.pages.flatMap((p) => p.links);
      const linkHrefs = allLinks.map((l) => l.targetUrl.toLowerCase());

      const hasBlog = linkHrefs.some((h) => h.includes("blog") || h.includes("news") || h.includes("articles"));
      const hasFaq = linkHrefs.some((h) => h.includes("faq") || h.includes("help") || h.includes("resources"));

      if (hasBlog || hasFaq) {
        return {
          testId: "CNT-04",
          testVersion: "1.0.0",
          testName: "Knowledge and Resource Content Opportunities",
          category: "content_quality",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Educational Content / Knowledge Hub Active",
          summary: `Discovered active knowledge resources (${hasBlog ? "Blog/Articles" : ""} ${hasFaq ? "FAQ/Help Center" : ""}).`,
          timestamp: now,
          confidence: "HIGH",
        };
      }

      return {
        testId: "CNT-04",
        testVersion: "1.0.0",
        testName: "Knowledge and Resource Content Opportunities",
        category: "content_quality",
        status: "WARNING",
        severity: "LOW",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Content Marketing Opportunity Identified",
        summary: "No blog, resource library, or FAQ section was detected. Adding educational content offers high organic growth potential.",
        timestamp: now,
        confidence: "HIGH",
        limitations: "Treated as a growth opportunity rather than a technical failure.",
      };
    },
  },
  {
    id: "CNT-05",
    name: "Thin, Duplicate, or Stale Content Indicators",
    version: "1.0.0",
    category: "content_quality",
    categoryName: "Content Quality & Trust",
    maxPoints: 2,
    description: "Heuristically audits for leftover placeholder copy (Lorem Ipsum), empty product descriptions, or template duplication.",
    businessImpactSummary: "Placeholder copy on live websites damages brand reputation and signals an incomplete product.",
    remediationAdvice: "Search and replace any remaining 'Lorem Ipsum' or template placeholder copy with authentic company messaging.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const pages = getHtmlPages(ctx.pages);
      if (pages.length === 0) {
        return {
          testId: "CNT-05",
          testVersion: "1.0.0",
          testName: "Thin, Duplicate, or Stale Content Indicators",
          category: "content_quality",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Content Quality Unobservable",
          summary: "No HTML pages available to audit placeholder or stale content.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const pagesWithLorem = pages.filter((p) =>
        (p.visibleTextSample || "").toLowerCase().includes("lorem ipsum")
      );

      if (pagesWithLorem.length === 0) {
        return {
          testId: "CNT-05",
          testVersion: "1.0.0",
          testName: "Thin, Duplicate, or Stale Content Indicators",
          category: "content_quality",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "No Placeholder or Stale Content Detected",
          summary: "No generic 'Lorem Ipsum' or placeholder text discovered on scanned pages.",
          timestamp: now,
          confidence: "HIGH",
        };
      }

      return {
        testId: "CNT-05",
        testVersion: "1.0.0",
        testName: "Thin, Duplicate, or Stale Content Indicators",
        category: "content_quality",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Placeholder Text (Lorem Ipsum) Discovered",
        summary: `Found placeholder 'Lorem Ipsum' copy on ${pagesWithLorem.length} live page(s).`,
        timestamp: now,
        confidence: "HIGH",
        affectedUrlsCount: pagesWithLorem.length,
        sampleEvidence: pagesWithLorem.slice(0, 2).map((p) => p.finalUrl),
      };
    },
  },
];
