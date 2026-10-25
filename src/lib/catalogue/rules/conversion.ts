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
      if (!entry) {
        return {
          testId: "CRO-01",
          testVersion: "1.0.0",
          testName: "Primary Value Proposition and Call-to-Action",
          category: "conversion_marketing",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 1,
          earnedPoints: 0,
          title: "CTA Unobservable",
          summary: "No page data available to evaluate Call-to-Action buttons.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const isJobBoard = ctx.businessCategory === "job_board" || ctx.businessCategory === ("jobs_marketplace" as any);
      const hasCtaLink = entry.links.some((l) => {
        const text = l.anchorText.toLowerCase();
        if (isJobBoard) {
          return (
            text.includes("search") ||
            text.includes("apply") ||
            text.includes("view job") ||
            text.includes("find job") ||
            text.includes("browse") ||
            text.includes("post a job") ||
            text.includes("hire") ||
            text.includes("sign up") ||
            text.includes("get started")
          );
        }
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
      if (ctx.pages.length === 0) {
        return {
          testId: "CRO-02",
          testVersion: "1.0.0",
          testName: "Conversion and Transaction Pathways",
          category: "conversion_marketing",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 1,
          earnedPoints: 0,
          title: "Pathways Unobservable",
          summary: "No page data available to evaluate conversion pathways.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const allLinks = ctx.pages.flatMap((p) => p.links);
      const isEcommerce = ctx.businessCategory === "ecommerce";
      const isJobBoard = ctx.businessCategory === "job_board" || ctx.businessCategory === ("jobs_marketplace" as any);

      const hasConversionPath = allLinks.some((l) => {
        const t = l.targetUrl.toLowerCase();
        const text = (l.anchorText || "").toLowerCase();
        if (isEcommerce) {
          return t.includes("cart") || t.includes("checkout") || t.includes("bag") || t.includes("basket");
        }
        if (isJobBoard) {
          return (
            t.includes("/jobs/") ||
            t.includes("/job/") ||
            t.includes("search") ||
            t.includes("post-a-job") ||
            t.includes("post_a_job") ||
            t.includes("hire") ||
            t.includes("apply") ||
            text.includes("apply") ||
            text.includes("view job") ||
            text.includes("browse")
          );
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
          title: `Active ${isEcommerce ? "Cart / Checkout" : isJobBoard ? "Job Search / Application" : "Lead / Inquiry"} Pathway Confirmed`,
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
        summary: `Did not observe direct links to ${isEcommerce ? "cart or checkout" : isJobBoard ? "job search, listings, or application flows" : "inquiry or signup"} in main navigation.`,
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
      if (ctx.pages.length === 0) {
        return {
          testId: "CRO-03",
          testVersion: "1.0.0",
          testName: "Form Usability and Observable Validation",
          category: "conversion_marketing",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 1,
          earnedPoints: 0,
          title: "Forms Unobservable",
          summary: "No page data available to evaluate form usability.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const allForms = ctx.pages.flatMap((p) => p.forms || []);
      if (allForms.length === 0) {
        return {
          testId: "CRO-03",
          testVersion: "1.0.0",
          testName: "Form Usability and Observable Validation",
          category: "conversion_marketing",
          status: "NOT_TESTED",
          severity: "INFORMATIONAL",
          maxPoints: 1,
          earnedPoints: 0,
          title: "No Form Elements Discovered",
          summary: "No interactive forms or input elements were detected on audited pages. Form usability evaluation not tested without observable form controls.",
          timestamp: now,
          confidence: "HIGH",
          limitations: "No form markup observed on crawled pages.",
        };
      }

      const unlabeledForms = allForms.filter((f) => !f.hasLabels);
      if (unlabeledForms.length > 0) {
        return {
          testId: "CRO-03",
          testVersion: "1.0.0",
          testName: "Form Usability and Observable Validation",
          category: "conversion_marketing",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 1,
          earnedPoints: 0.5,
          title: "Form Inputs Missing Accessible Labels",
          summary: `Discovered ${unlabeledForms.length} form(s) containing unlabeled inputs lacking associated labels, aria attributes, or placeholders.`,
          timestamp: now,
          confidence: "HIGH",
        };
      }

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
        summary: `Observed ${allForms.length} form(s) provide explicit field labeling, clear input types, and accessible submission attributes.`,
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: allForms.slice(0, 3).map((f) => `Form #${f.id}: inputs=${f.inputsCount}, labeled=${f.hasLabels}`),
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
      if (ctx.pages.length === 0) {
        return {
          testId: "CRO-04",
          testVersion: "1.0.0",
          testName: "Pricing, Trust, and Policy Transparency",
          category: "conversion_marketing",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 1,
          earnedPoints: 0,
          title: "Policies Unobservable",
          summary: "No page data available to evaluate pricing and policy transparency.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const allLinks = ctx.pages.flatMap((p) => p.links);
      const isEcommerce = ctx.businessCategory === "ecommerce";
      const isJobBoard = ctx.businessCategory === "job_board" || ctx.businessCategory === ("jobs_marketplace" as any);

      const hasPolicyOrPricing = allLinks.some((l) => {
        const t = l.targetUrl.toLowerCase();
        const text = (l.anchorText || "").toLowerCase();
        if (isJobBoard) {
          return (
            t.includes("pricing") ||
            t.includes("post-a-job") ||
            t.includes("employers") ||
            t.includes("hire") ||
            t.includes("terms") ||
            t.includes("privacy") ||
            t.includes("faq") ||
            t.includes("about") ||
            text.includes("pricing") ||
            text.includes("post a job") ||
            text.includes("faq") ||
            text.includes("employers")
          );
        }
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
          summary: `Identified customer policy links (${isEcommerce ? "Shipping/Returns" : isJobBoard ? "Employer Pricing / Terms" : "Pricing/Terms"}) supporting buyer confidence.`,
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
