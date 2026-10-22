import { RuleDefinition } from "../types";
import { AssessmentResult } from "@/types";

export const aiRules: RuleDefinition[] = [
  {
    id: "AI-01",
    name: "AI Crawler Access Policy",
    version: "1.0.0",
    category: "geo_aeo_ai",
    categoryName: "GEO / AEO & AI Readiness",
    maxPoints: 2,
    description: "Evaluates robots.txt directives for major generative AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended).",
    businessImpactSummary: "Allowing or disallowing AI crawlers governs whether ChatGPT, Claude, and Perplexity can synthesize and cite your brand.",
    remediationAdvice: "Review your robots.txt policy: allow GPTBot and PerplexityBot if you want AI search citations, or disallow them if protecting proprietary data.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const robots = (ctx.robotsTxt || "").toLowerCase();

      const blocksGpt = robots.includes("user-agent: gptbot\ndisallow: /");
      const blocksClaude = robots.includes("user-agent: claudebot\ndisallow: /");
      const blocksPerplexity = robots.includes("user-agent: perplexitybot\ndisallow: /");

      const blockedCount = [blocksGpt, blocksClaude, blocksPerplexity].filter(Boolean).length;

      if (blockedCount === 0) {
        return {
          testId: "AI-01",
          testVersion: "1.0.0",
          testName: "AI Crawler Access Policy",
          category: "geo_aeo_ai",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "AI Search Bots Permitted to Index Content",
          summary: "No blocking disallow rules found for leading AI engines (GPTBot, ClaudeBot, PerplexityBot).",
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: ["robots.txt permits general crawling by AI user-agents"],
          limitations: "Allowing crawler access does not guarantee citations or rankings in AI answers.",
        };
      }

      return {
        testId: "AI-01",
        testVersion: "1.0.0",
        testName: "AI Crawler Access Policy",
        category: "geo_aeo_ai",
        status: "WARNING",
        severity: "LOW",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Selected AI Search Crawlers Blocked",
        summary: `robots.txt contains disallow rules for ${blockedCount} AI crawlers (${blocksGpt ? "GPTBot " : ""}${blocksClaude ? "ClaudeBot " : ""}${blocksPerplexity ? "PerplexityBot" : ""}).`,
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: [`Blocked AI bots count: ${blockedCount}`],
      };
    },
  },
  {
    id: "AI-02",
    name: "Main-Content Crawlability",
    version: "1.0.0",
    category: "geo_aeo_ai",
    categoryName: "GEO / AEO & AI Readiness",
    maxPoints: 2,
    description: "Verifies that core product/service copy is directly accessible in initial server HTML without client-side hydration dependency.",
    businessImpactSummary: "If text is rendered exclusively via heavy JavaScript, simpler AI crawlers and search spiders receive an empty page.",
    remediationAdvice: "Utilize Server-Side Rendering (SSR) or static generation for primary text content.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const entry = ctx.pages[0];
      const wordCount = entry?.visibleWordCount || 0;

      if (wordCount >= 200) {
        return {
          testId: "AI-02",
          testVersion: "1.0.0",
          testName: "Main-Content Crawlability",
          category: "geo_aeo_ai",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Direct HTML Server Crawlability Confirmed",
          summary: `Primary page serves ${wordCount} words directly in initial HTML response for search and AI spiders.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Server-rendered word count: ${wordCount}`],
        };
      }

      return {
        testId: "AI-02",
        testVersion: "1.0.0",
        testName: "Main-Content Crawlability",
        category: "geo_aeo_ai",
        status: "WARNING",
        severity: "MEDIUM",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Low Initial Server HTML Text Density",
        summary: `Only ${wordCount} words detected in raw HTML, suggesting client-side rendering or sparse initial markup.`,
        timestamp: now,
        confidence: "MEDIUM",
      };
    },
  },
  {
    id: "AI-03",
    name: "Entity and Structured Data Clarity",
    version: "1.0.0",
    category: "geo_aeo_ai",
    categoryName: "GEO / AEO & AI Readiness",
    maxPoints: 2,
    description: "Evaluates machine-readable entity schemas (Organization, Product, Service) that feed LLM knowledge graphs.",
    businessImpactSummary: "Clear entity schemas help AI systems accurately recognize your company identity, products, and contact info.",
    remediationAdvice: "Provide JSON-LD schema with @type Organization or LocalBusiness defining your official name, logo, and sameAs social profiles.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const hasEntitySchema = ctx.pages.some((p) =>
        p.structuredData.some((s) => {
          const t = String(s["@type"] || "").toLowerCase();
          return t.includes("organization") || t.includes("localbusiness") || t.includes("product") || t.includes("brand");
        })
      );

      if (hasEntitySchema) {
        return {
          testId: "AI-03",
          testVersion: "1.0.0",
          testName: "Entity and Structured Data Clarity",
          category: "geo_aeo_ai",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Entity Schema Configured for Knowledge Graphs",
          summary: "Identified machine-readable Organization/Product entity definitions in structured JSON-LD.",
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: ["Organization/Entity schema found"],
        };
      }

      return {
        testId: "AI-03",
        testVersion: "1.0.0",
        testName: "Entity and Structured Data Clarity",
        category: "geo_aeo_ai",
        status: "WARNING",
        severity: "MEDIUM",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Missing Entity Schema Markup",
        summary: "No Organization or Brand schema detected to anchor your entity in LLM knowledge graphs.",
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "AI-04",
    name: "Answer-Ready Content Evidence",
    version: "1.0.0",
    category: "geo_aeo_ai",
    categoryName: "GEO / AEO & AI Readiness",
    maxPoints: 2,
    description: "Checks for structured question/answer patterns, concise definitions, and FAQ markup suited for AI answer engines.",
    businessImpactSummary: "AI engines like SearchGPT and Perplexity extract concise direct answers from structured Q&A formats.",
    remediationAdvice: "Add an FAQ section with clear, direct 1–2 sentence answers to frequent customer questions.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const hasFaqSchema = ctx.pages.some((p) =>
        p.structuredData.some((s) => String(s["@type"] || "").toLowerCase().includes("faqpage"))
      );

      const hasFaqText = ctx.pages.some((p) => {
        const text = (p.visibleTextSample || "").toLowerCase();
        return text.includes("frequently asked") || text.includes("faq");
      });

      if (hasFaqSchema || hasFaqText) {
        return {
          testId: "AI-04",
          testVersion: "1.0.0",
          testName: "Answer-Ready Content Evidence",
          category: "geo_aeo_ai",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Answer-Ready Q&A Structure Observed",
          summary: `Identified ${hasFaqSchema ? "FAQPage structured data" : "Q&A and FAQ content patterns"} ideal for AI citation.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [hasFaqSchema ? "FAQPage schema active" : "FAQ content detected in visible text"],
          limitations: "Structuring answers facilitates extraction but does not guarantee AI search placement.",
        };
      }

      return {
        testId: "AI-04",
        testVersion: "1.0.0",
        testName: "Answer-Ready Content Evidence",
        category: "geo_aeo_ai",
        status: "WARNING",
        severity: "LOW",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Opportunity to Add Answer-Ready Q&A Content",
        summary: "No dedicated FAQ schema or structured Q&A sections detected.",
        timestamp: now,
        confidence: "MEDIUM",
      };
    },
  },
];
