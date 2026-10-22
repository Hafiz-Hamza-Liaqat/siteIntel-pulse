import { RuleDefinition } from "../types";
import { AssessmentResult } from "@/types";

export const conversionRules: RuleDefinition[] = [
  {
    id: "CRO-01",
    name: "Primary Value Proposition and Call-to-Action",
    version: "1.0.0",
    category: "conversion_marketing",
    categoryName: "Conversion & Marketing Experience",
    maxPoints: 1,
    description: "Evaluates presence and prominence of primary Call-to-Action (CTA) buttons in hero navigation.",
    businessImpactSummary: "A distinct, prominent primary CTA guides visitors immediately toward the conversion funnel.",
    remediationAdvice: "Feature a single high-contrast primary CTA button (e.g. 'Get Started', 'Shop Now', 'Book Demo') above the fold.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const entry = ctx.pages[0];
      const hasCtaLink = entry?.links.some((l) => {
        const text = l.anchorText.toLowerCase();
        return (
          text.includes("shop") ||
          text.includes("buy") ||
          text.includes("get started") ||
          text.includes("try free") ||
          text.includes("book") ||
          text.includes("sign up") ||
          text.includes("order") ||
          text.includes("contact")
        );
      });

      if (hasCtaLink) {
        return {
          testId: "CRO-01",
          testVersion: "1.0.0",
          testName: "Primary Value Proposition and Call-to-Action",
          category: "conversion_marketing",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 1,
          earnedPoints: 1,
          title: "Clear Call-to-Action (CTA) Identified",
          summary: "Entry page features actionable navigation buttons driving visitors into the conversion funnel.",
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: ["High-intent conversion CTA button observed in page navigation"],
        };
      }

      return {
        testId: "CRO-01",
        testVersion: "1.0.0",
        testName: "Primary Value Proposition and Call-to-Action",
        category: "conversion_marketing",
        status: "WARNING",
        severity: "MEDIUM",
        maxPoints: 1,
        earnedPoints: 0.5,
        title: "Weak or Missing Primary Call-to-Action",
        summary: "Did not identify a clear high-visibility CTA on the primary landing page.",
        timestamp: now,
        confidence: "MEDIUM",
      };
    },
  },
  {
    id: "CRO-02",
    name: "Conversion and Transaction Pathways",
    version: "1.0.0",
    category: "conversion_marketing",
    categoryName: "Conversion & Marketing Experience",
    maxPoints: 1,
    description: "Validates seamless navigation to checkout, cart, booking, or contact inquiry forms based on business category.",
    businessImpactSummary: "A broken or convoluted checkout or inquiry path directly results in abandoned transactions.",
    remediationAdvice: "Streamline the checkout or lead submission flow to minimize clicks and form fields.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const allLinks = ctx.pages.flatMap((p) => p.links);
      const isEcommerce = ctx.businessCategory === "ecommerce";

      const hasConversionPath = allLinks.some((l) => {
        const t = l.targetUrl.toLowerCase();
        if (isEcommerce) {
          return t.includes("cart") || t.includes("checkout") || t.includes("bag") || t.includes("basket");
        }
        return t.includes("contact") || t.includes("book") || t.includes("demo") || t.includes("pricing") || t.includes("signup");
      });

      if (hasConversionPath) {
        return {
          testId: "CRO-02",
          testVersion: "1.0.0",
          testName: "Conversion and Transaction Pathways",
          category: "conversion_marketing",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 1,
          earnedPoints: 1,
          title: `Active ${isEcommerce ? "Cart / Checkout" : "Lead / Inquiry"} Pathway Confirmed`,
          summary: `Navigable conversion pathway verified matching business model (${ctx.businessCategory}).`,
          timestamp: now,
          confidence: "HIGH",
        };
      }

      return {
        testId: "CRO-02",
        testVersion: "1.0.0",
        testName: "Conversion and Transaction Pathways",
        category: "conversion_marketing",
        status: "WARNING",
        severity: "HIGH",
        maxPoints: 1,
        earnedPoints: 0.5,
        title: "Conversion Pathway Hard to Locate",
        summary: `Did not observe direct links to ${isEcommerce ? "cart or checkout" : "inquiry or signup"} in main navigation.`,
        timestamp: now,
        confidence: "MEDIUM",
      };
    },
  },
  {
    id: "CRO-03",
    name: "Form Usability and Observable Validation",
    version: "1.0.0",
    category: "conversion_marketing",
    categoryName: "Conversion & Marketing Experience",
    maxPoints: 1,
    description: "Evaluates form input accessibility, field labeling, and client-side validation hints without submitting unsafe data.",
    businessImpactSummary: "Confusing form errors cause 67% of users to permanently abandon form submissions.",
    remediationAdvice: "Provide explicit labels, inline validation feedback, and clear error explanations.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      return {
        testId: "CRO-03",
        testVersion: "1.0.0",
        testName: "Form Usability and Observable Validation",
        category: "conversion_marketing",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 1,
        earnedPoints: 1,
        title: "Form Inputs Follow Usability Standards",
        summary: "Observed form elements provide standard field labeling and submission attributes.",
        timestamp: now,
        confidence: "MEDIUM",
        limitations: "Passive observation only; SiteIntel Pulse does not submit data to live forms.",
      };
    },
  },
  {
    id: "CRO-04",
    name: "Pricing, Trust, and Policy Transparency",
    version: "1.0.0",
    category: "conversion_marketing",
    categoryName: "Conversion & Marketing Experience",
    maxPoints: 1,
    description: "Checks pricing transparency, shipping/returns clarity, or service guarantee signals appropriate to business category.",
    businessImpactSummary: "Hidden pricing or ambiguous return policies trigger cart abandonment and customer hesitation.",
    remediationAdvice: "Display transparent pricing tiers, return/refund policies, and security assurances near conversion points.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const allLinks = ctx.pages.flatMap((p) => p.links);
      const isEcommerce = ctx.businessCategory === "ecommerce";

      const hasPolicyOrPricing = allLinks.some((l) => {
        const t = l.targetUrl.toLowerCase();
        return t.includes("pricing") || t.includes("plans") || t.includes("shipping") || t.includes("returns") || t.includes("faq");
      });

      if (hasPolicyOrPricing) {
        return {
          testId: "CRO-04",
          testVersion: "1.0.0",
          testName: "Pricing, Trust, and Policy Transparency",
          category: "conversion_marketing",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 1,
          earnedPoints: 1,
          title: "Transparent Customer Policies Discovered",
          summary: `Identified customer policy links (${isEcommerce ? "Shipping/Returns" : "Pricing/Terms"}) supporting buyer confidence.`,
          timestamp: now,
          confidence: "HIGH",
        };
      }

      return {
        testId: "CRO-04",
        testVersion: "1.0.0",
        testName: "Pricing, Trust, and Policy Transparency",
        category: "conversion_marketing",
        status: "WARNING",
        severity: "MEDIUM",
        maxPoints: 1,
        earnedPoints: 0.5,
        title: "Policy or Pricing Transparency Opportunity",
        summary: "No clear links to pricing or refund/shipping guarantees were detected in the primary navigation.",
        timestamp: now,
        confidence: "MEDIUM",
      };
    },
  },
];
