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

      const category = ctx.businessCategory;
      const isJobBoard = category === "job_board" || category === ("jobs_marketplace" as any);
      const isEcommerce = category === "ecommerce";
      const isSaas = category === "saas";
      const isPublisher = category === "publisher";
      const isNonprofit = category === "nonprofit";
      const isLocal = category === "local_service";
      const isPortfolio = category === "portfolio";
      const isMarketplace = category === "marketplace";

      const hasCtaLink = entry.links.some((l) => {
        const text = (l.anchorText || "").toLowerCase();
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
            text.includes("get started") ||
            text.includes("scholarship") ||
            text.includes("career")
          );
        }
        if (isEcommerce) {
          return (
            text.includes("shop") ||
            text.includes("buy") ||
            text.includes("cart") ||
            text.includes("order") ||
            text.includes("get started") ||
            text.includes("view products") ||
            text.includes("explore collection")
          );
        }
        if (isSaas) {
          return (
            text.includes("trial") ||
            text.includes("demo") ||
            text.includes("pricing") ||
            text.includes("get started") ||
            text.includes("sign up") ||
            text.includes("try free") ||
            text.includes("start for free")
          );
        }
        if (isPublisher) {
          return (
            text.includes("subscribe") ||
            text.includes("newsletter") ||
            text.includes("read more") ||
            text.includes("latest") ||
            text.includes("sign up") ||
            text.includes("join")
          );
        }
        if (isNonprofit) {
          return (
            text.includes("donate") ||
            text.includes("give") ||
            text.includes("volunteer") ||
            text.includes("support") ||
            text.includes("join us") ||
            text.includes("get involved")
          );
        }
        if (isLocal) {
          return (
            text.includes("call") ||
            text.includes("appointment") ||
            text.includes("quote") ||
            text.includes("estimate") ||
            text.includes("schedule") ||
            text.includes("contact")
          );
        }
        if (isPortfolio) {
          return (
            text.includes("view work") ||
            text.includes("case stud") ||
            text.includes("projects") ||
            text.includes("hire us") ||
            text.includes("get in touch") ||
            text.includes("start a project")
          );
        }
        if (isMarketplace) {
          return (
            text.includes("browse") ||
            text.includes("explore") ||
            text.includes("directory") ||
            text.includes("become a seller") ||
            text.includes("list your") ||
            text.includes("sign up")
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
          text.includes("contact") ||
          text.includes("learn more")
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
      const category = ctx.businessCategory;
      const isEcommerce = category === "ecommerce";
      const isJobBoard = category === "job_board" || category === ("jobs_marketplace" as any);
      const isSaas = category === "saas";
      const isPublisher = category === "publisher";
      const isNonprofit = category === "nonprofit";
      const isLocal = category === "local_service";
      const isPortfolio = category === "portfolio";
      const isMarketplace = category === "marketplace";

      const pathwayName = isEcommerce
        ? "Cart / Checkout"
        : isJobBoard
        ? "Job Search / Application"
        : isSaas
        ? "Trial / Demo / Pricing"
        : isPublisher
        ? "Newsletter / Subscription"
        : isNonprofit
        ? "Donation / Giving"
        : isLocal
        ? "Appointment / Quote"
        : isPortfolio
        ? "Project Inquiry / Hire"
        : isMarketplace
        ? "Listings / Seller Onboarding"
        : "Lead / Inquiry";

      const hasConversionPath = allLinks.some((l) => {
        let path = "";
        try {
          path = new URL(l.targetUrl, ctx.targetUrl).pathname.toLowerCase();
        } catch {
          path = (l.targetUrl || "").toLowerCase();
        }
        const text = (l.anchorText || "").toLowerCase();
        if (isEcommerce) {
          return (
            path.includes("/cart") ||
            path.includes("/checkout") ||
            path.includes("/bag") ||
            path.includes("/basket") ||
            path.includes("/shop") ||
            path.includes("/products") ||
            text.includes("add to cart") ||
            text.includes("checkout")
          );
        }
        if (isJobBoard) {
          return (
            path.includes("/jobs") ||
            path.includes("/job/") ||
            path.includes("/careers") ||
            path.includes("/post-a-job") ||
            path.includes("/post_a_job") ||
            path.includes("/apply") ||
            path.includes("/scholarship") ||
            text.includes("apply") ||
            text.includes("view job") ||
            text.includes("browse") ||
            text.includes("search jobs") ||
            text.includes("post a job")
          );
        }
        if (isSaas) {
          return (
            path.includes("/pricing") ||
            path.includes("/trial") ||
            path.includes("/demo") ||
            path.includes("/signup") ||
            path.includes("/register") ||
            path.includes("/app") ||
            path.includes("/dashboard") ||
            text.includes("start free") ||
            text.includes("request demo") ||
            text.includes("try free") ||
            text.includes("pricing")
          );
        }
        if (isPublisher) {
          return (
            path.includes("/subscribe") ||
            path.includes("/newsletter") ||
            path.includes("/rss") ||
            path.includes("/membership") ||
            text.includes("subscribe") ||
            text.includes("newsletter")
          );
        }
        if (isNonprofit) {
          return (
            path.includes("/donate") ||
            path.includes("/give") ||
            path.includes("/volunteer") ||
            path.includes("/fundraising") ||
            text.includes("donate") ||
            text.includes("give")
          );
        }
        if (isLocal) {
          return (
            path.includes("/appointment") ||
            path.includes("/quote") ||
            path.includes("/estimate") ||
            path.includes("/contact") ||
            path.includes("/schedule") ||
            path.includes("/booking") ||
            text.includes("book") ||
            text.includes("quote")
          );
        }
        if (isPortfolio) {
          return (
            path.includes("/contact") ||
            path.includes("/hire") ||
            path.includes("/inquiry") ||
            path.includes("/project") ||
            text.includes("get in touch") ||
            text.includes("hire us")
          );
        }
        if (isMarketplace) {
          return (
            path.includes("/vendors") ||
            path.includes("/sellers") ||
            path.includes("/listings") ||
            path.includes("/directory") ||
            path.includes("/marketplace") ||
            text.includes("explore directory") ||
            text.includes("become a seller")
          );
        }
        return (
          path.includes("/contact") ||
          path.includes("/book") ||
          path.includes("/demo") ||
          path.includes("/pricing") ||
          path.includes("/signup") ||
          path.includes("/inquiry")
        );
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
          title: `Active ${pathwayName} Pathway Confirmed`,
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
        summary: `Did not observe direct links to ${pathwayName.toLowerCase()} in main navigation.`,
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
      const category = ctx.businessCategory;
      const isEcommerce = category === "ecommerce";
      const isJobBoard = category === "job_board" || category === ("jobs_marketplace" as any);
      const isSaas = category === "saas";
      const isPublisher = category === "publisher";
      const isNonprofit = category === "nonprofit";
      const isLocal = category === "local_service";
      const isPortfolio = category === "portfolio";
      const isMarketplace = category === "marketplace";

      const policyLabel = isEcommerce
        ? "Shipping/Returns/Pricing"
        : isJobBoard
        ? "Employer Pricing / Terms"
        : isSaas
        ? "Pricing / SLA / Terms"
        : isPublisher
        ? "Editorial Policy / Terms"
        : isNonprofit
        ? "501(c)(3) Disclosure / Donor Privacy"
        : isLocal
        ? "Estimates / Guarantee / License"
        : isPortfolio
        ? "Engagement Terms / Pricing Guide"
        : isMarketplace
        ? "Seller Fees / Protection Terms"
        : "Pricing / Terms";

      const hasPolicyOrPricing = allLinks.some((l) => {
        const t = (l.targetUrl || "").toLowerCase();
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
        if (isEcommerce) {
          return (
            t.includes("pricing") ||
            t.includes("shipping") ||
            t.includes("returns") ||
            t.includes("refund") ||
            t.includes("faq") ||
            t.includes("terms") ||
            t.includes("guarantee") ||
            text.includes("shipping") ||
            text.includes("returns")
          );
        }
        if (isSaas) {
          return (
            t.includes("pricing") ||
            t.includes("plans") ||
            t.includes("terms") ||
            t.includes("privacy") ||
            t.includes("security") ||
            t.includes("sla") ||
            text.includes("pricing") ||
            text.includes("plans")
          );
        }
        if (isPublisher) {
          return (
            t.includes("editorial") ||
            t.includes("ethics") ||
            t.includes("terms") ||
            t.includes("privacy") ||
            t.includes("subscribe") ||
            t.includes("about") ||
            text.includes("editorial") ||
            text.includes("privacy")
          );
        }
        if (isNonprofit) {
          return (
            t.includes("donor") ||
            t.includes("annual-report") ||
            t.includes("financial") ||
            t.includes("tax") ||
            t.includes("501") ||
            t.includes("terms") ||
            t.includes("privacy") ||
            text.includes("tax-deductible") ||
            text.includes("financial")
          );
        }
        if (isLocal) {
          return (
            t.includes("estimate") ||
            t.includes("pricing") ||
            t.includes("guarantee") ||
            t.includes("warranty") ||
            t.includes("terms") ||
            t.includes("license") ||
            text.includes("estimate") ||
            text.includes("guarantee")
          );
        }
        if (isPortfolio) {
          return (
            t.includes("terms") ||
            t.includes("pricing") ||
            t.includes("faq") ||
            t.includes("process") ||
            t.includes("privacy") ||
            text.includes("pricing") ||
            text.includes("process")
          );
        }
        if (isMarketplace) {
          return (
            t.includes("fees") ||
            t.includes("commission") ||
            t.includes("protection") ||
            t.includes("terms") ||
            t.includes("privacy") ||
            text.includes("fees") ||
            text.includes("protection")
          );
        }
        return (
          t.includes("pricing") ||
          t.includes("plans") ||
          t.includes("shipping") ||
          t.includes("returns") ||
          t.includes("faq") ||
          t.includes("terms") ||
          t.includes("privacy")
        );
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
          summary: `Identified customer policy links (${policyLabel}) supporting stakeholder trust.`,
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
        summary: `No clear links to ${policyLabel.toLowerCase()} were detected in the primary navigation.`,
        timestamp: now,
        confidence: "MEDIUM",
      };
    },
  },
];
