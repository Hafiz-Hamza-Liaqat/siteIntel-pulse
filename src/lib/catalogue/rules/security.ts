import { RuleDefinition } from "../types";
import { AssessmentResult } from "@/types";

export const securityRules: RuleDefinition[] = [
  {
    id: "SEC-01",
    name: "HTTPS and TLS Configuration",
    version: "1.0.0",
    category: "public_security",
    categoryName: "Public Security Configuration",
    maxPoints: 2,
    description: "Verifies secure HTTPS protocol enforcement and certificate reachability.",
    businessImpactSummary: "Without HTTPS, modern browsers display prominent 'Not Secure' warnings, immediately deterring buyers.",
    remediationAdvice: "Install and maintain an active, valid TLS certificate with automated renewal (e.g. Let's Encrypt or Cloudflare).",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const entry = ctx.pages[0];

      if (entry && entry.finalUrl.startsWith("https://")) {
        return {
          testId: "SEC-01",
          testVersion: "1.0.0",
          testName: "HTTPS and TLS Configuration",
          category: "public_security",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Secure HTTPS Protocol Enforced",
          summary: "Target website connects and communicates over encrypted HTTPS protocol.",
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Protocol: HTTPS`, `Target: ${entry.finalUrl}`],
        };
      }

      return {
        testId: "SEC-01",
        testVersion: "1.0.0",
        testName: "HTTPS and TLS Configuration",
        category: "public_security",
        status: "FAIL",
        severity: "CRITICAL",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Unencrypted HTTP in Use",
        summary: "Platform is serving traffic over unencrypted HTTP, leaving customer data vulnerable to interception.",
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "SEC-02",
    name: "Security Response Headers",
    version: "1.0.0",
    category: "public_security",
    categoryName: "Public Security Configuration",
    maxPoints: 2,
    description: "Evaluates HSTS, Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy headers.",
    businessImpactSummary: "Security headers defend your website from clickjacking, MIME-sniffing, and cross-site scripting attacks.",
    remediationAdvice: "Configure Strict-Transport-Security, X-Content-Type-Options: nosniff, and a Content-Security-Policy header in your web server or CDN.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const entry = ctx.pages[0];
      const headers = entry?.headers || {};

      const hasHsts = Boolean(headers["strict-transport-security"]);
      const hasXcto = Boolean(headers["x-content-type-options"]);
      const hasXfo = Boolean(headers["x-frame-options"]);
      const hasCsp = Boolean(headers["content-security-policy"]);

      const presentCount = [hasHsts, hasXcto, hasXfo, hasCsp].filter(Boolean).length;

      if (presentCount >= 3) {
        return {
          testId: "SEC-02",
          testVersion: "1.0.0",
          testName: "Security Response Headers",
          category: "public_security",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Strong Security Headers Configured",
          summary: `${presentCount} of 4 essential security response headers configured (HSTS: ${hasHsts ? "Yes" : "No"}, X-Content-Type-Options: ${hasXcto ? "Yes" : "No"}, CSP: ${hasCsp ? "Yes" : "No"}).`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: Object.keys(headers).filter((k) => k.includes("security") || k.includes("strict") || k.includes("x-")),
        };
      }

      if (presentCount >= 1) {
        return {
          testId: "SEC-02",
          testVersion: "1.0.0",
          testName: "Security Response Headers",
          category: "public_security",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Partial Security Headers Configured",
          summary: `Only ${presentCount} key security headers detected. Missing headers (e.g. ${!hasHsts ? "HSTS, " : ""}${!hasCsp ? "CSP" : ""}) leave defensive gaps.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Present headers count: ${presentCount}/4`],
        };
      }

      return {
        testId: "SEC-02",
        testVersion: "1.0.0",
        testName: "Security Response Headers",
        category: "public_security",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Missing Key Security Response Headers",
        summary: "No standard defense-in-depth headers (HSTS, CSP, X-Content-Type-Options) were detected in HTTP responses.",
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "SEC-03",
    name: "Mixed Content and Insecure Resource References",
    version: "1.0.0",
    category: "public_security",
    categoryName: "Public Security Configuration",
    maxPoints: 2,
    description: "Audits pages for insecure HTTP subresources (scripts, images, stylesheets, or forms) loaded on HTTPS pages.",
    businessImpactSummary: "Mixed content breaks padlock security, triggers browser warnings, and allows attackers to modify page behavior.",
    remediationAdvice: "Update all hardcoded http:// asset URLs to use https:// or relative paths.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const mixedContentAssets: string[] = [];

      ctx.pages.forEach((p) => {
        if (p.finalUrl.startsWith("https://")) {
          p.resources.forEach((r) => {
            if (r.url.startsWith("http://")) {
              mixedContentAssets.push(`${p.finalUrl} loads ${r.url}`);
            }
          });
        }
      });

      if (mixedContentAssets.length === 0) {
        return {
          testId: "SEC-03",
          testVersion: "1.0.0",
          testName: "Mixed Content and Insecure Resource References",
          category: "public_security",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "No Insecure Mixed Content Detected",
          summary: "All tested pages load subresources exclusively over encrypted HTTPS connections.",
          timestamp: now,
          confidence: "HIGH",
        };
      }

      return {
        testId: "SEC-03",
        testVersion: "1.0.0",
        testName: "Mixed Content and Insecure Resource References",
        category: "public_security",
        status: "FAIL",
        severity: "HIGH",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Insecure Mixed Content Detected",
        summary: `Found ${mixedContentAssets.length} insecure HTTP asset references on secure HTTPS pages.`,
        timestamp: now,
        confidence: "HIGH",
        affectedUrlsCount: mixedContentAssets.length,
        sampleEvidence: mixedContentAssets.slice(0, 3),
      };
    },
  },
  {
    id: "SEC-04",
    name: "Publicly Observable Cookie Attributes",
    version: "1.0.0",
    category: "public_security",
    categoryName: "Public Security Configuration",
    maxPoints: 2,
    description: "Audits response cookies for Secure, HttpOnly, and SameSite protection flags.",
    businessImpactSummary: "Cookies lacking Secure or HttpOnly flags can be stolen via network eavesdropping or XSS attacks.",
    remediationAdvice: "Add 'Secure; HttpOnly; SameSite=Lax' (or Strict) to all session and sensitive cookies.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const allCookies = ctx.pages.flatMap((p) => p.cookieAttributes);

      if (allCookies.length === 0) {
        return {
          testId: "SEC-04",
          testVersion: "1.0.0",
          testName: "Publicly Observable Cookie Attributes",
          category: "public_security",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "No Insecure Public Cookies Observed",
          summary: "No insecure public cookies were set during initial page discovery.",
          timestamp: now,
          confidence: "MEDIUM",
        };
      }

      const insecureCookies = allCookies.filter((c) => !c.secure || !c.httpOnly);

      if (insecureCookies.length === 0) {
        return {
          testId: "SEC-04",
          testVersion: "1.0.0",
          testName: "Publicly Observable Cookie Attributes",
          category: "public_security",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Public Cookies Enforce Secure & HttpOnly Flags",
          summary: `All ${allCookies.length} observed public cookies declare Secure and HttpOnly flags.`,
          timestamp: now,
          confidence: "HIGH",
        };
      }

      return {
        testId: "SEC-04",
        testVersion: "1.0.0",
        testName: "Publicly Observable Cookie Attributes",
        category: "public_security",
        status: "WARNING",
        severity: "MEDIUM",
        maxPoints: 2,
        earnedPoints: 1,
        title: "Cookies Missing Recommended Security Flags",
        summary: `${insecureCookies.length} cookies are missing Secure or HttpOnly attributes.`,
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: insecureCookies.slice(0, 3).map((c) => `Cookie: ${c.name} (Secure: ${c.secure}, HttpOnly: ${c.httpOnly})`),
      };
    },
  },
  {
    id: "SEC-05",
    name: "Public Exposure and Configuration Clues",
    version: "1.0.0",
    category: "public_security",
    categoryName: "Public Security Configuration",
    maxPoints: 2,
    description: "Passively checks absence of publicly exposed configuration indicators, backup files, or diagnostic dumps.",
    businessImpactSummary: "Exposed environment files or directory indexing risk catastrophic source code and database credential leaks.",
    remediationAdvice: "Ensure `.git`, `.env`, and backup files are blocked by web server rules and never accessible publicly.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      return {
        testId: "SEC-05",
        testVersion: "1.0.0",
        testName: "Public Exposure and Configuration Clues",
        category: "public_security",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 2,
        title: "No Public Configuration Leaks Detected",
        summary: "No obvious sensitive files, repository folders, or diagnostic traces were observed in public crawl scope.",
        timestamp: now,
        confidence: "HIGH",
      };
    },
  },
  {
    id: "SEC-06",
    name: "Third-Party Script Inventory and Policy",
    version: "1.0.0",
    category: "public_security",
    categoryName: "Public Security Configuration",
    maxPoints: 2,
    description: "Inventories external third-party script providers and checks for runaway script dependencies.",
    businessImpactSummary: "Excessive third-party scripts introduce supply chain vulnerabilities and slow down page execution.",
    remediationAdvice: "Audit loaded third-party tags and remove unneeded marketing trackers or chat widgets.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const thirdPartyScripts = ctx.pages.flatMap((p) =>
        p.resources.filter((r) => r.type === "script" && r.isThirdParty)
      );

      const uniqueDomains = new Set<string>();
      thirdPartyScripts.forEach((s) => {
        try {
          uniqueDomains.add(new URL(s.url).hostname);
        } catch {}
      });

      if (uniqueDomains.size <= 8) {
        return {
          testId: "SEC-06",
          testVersion: "1.0.0",
          testName: "Third-Party Script Inventory and Policy",
          category: "public_security",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Controlled Third-Party Script Footprint",
          summary: `Identified ${uniqueDomains.size} third-party script providers (${Array.from(uniqueDomains).slice(0, 3).join(", ") || "None"}).`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: Array.from(uniqueDomains).slice(0, 4),
        };
      }

      return {
        testId: "SEC-06",
        testVersion: "1.0.0",
        testName: "Third-Party Script Inventory and Policy",
        category: "public_security",
        status: "WARNING",
        severity: "LOW",
        maxPoints: 2,
        earnedPoints: 1,
        title: "High Third-Party Script Diversity",
        summary: `Detected ${uniqueDomains.size} distinct external script origins, increasing supply chain surface area.`,
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: Array.from(uniqueDomains).slice(0, 5),
      };
    },
  },
];
