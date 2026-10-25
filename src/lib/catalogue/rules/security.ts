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

      if (!entry) {
        return {
          testId: "SEC-01",
          testVersion: "1.0.0",
          testName: "HTTPS and TLS Configuration",
          category: "public_security",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Entry Page Inaccessible",
          summary: "No page data available to verify HTTPS and TLS reachability.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      if (entry.finalUrl.startsWith("https://")) {
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
    remediationAdvice: "Configure Strict-Transport-Security, X-Content-Type-Options: nosniff, Content-Security-Policy, X-Frame-Options, and Referrer-Policy in your web server or CDN.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const entry = ctx.pages[0];
      if (!entry) {
        return {
          testId: "SEC-02",
          testVersion: "1.0.0",
          testName: "Security Response Headers",
          category: "public_security",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Headers Unobservable",
          summary: "No page data available to evaluate security response headers.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const headers = entry.headers || {};

      const hasHsts = Boolean(headers["strict-transport-security"]);
      const hasCsp = Boolean(headers["content-security-policy"]);
      const hasXcto = Boolean(headers["x-content-type-options"]);
      const hasXfo = Boolean(headers["x-frame-options"]);
      const hasRp = Boolean(headers["referrer-policy"]);

      const presentHeaders: string[] = [];
      if (hasHsts) presentHeaders.push("Strict-Transport-Security");
      if (hasCsp) presentHeaders.push("Content-Security-Policy");
      if (hasXcto) presentHeaders.push("X-Content-Type-Options");
      if (hasXfo) presentHeaders.push("X-Frame-Options");
      if (hasRp) presentHeaders.push("Referrer-Policy");

      const presentCount = presentHeaders.length;

      if (presentCount >= 4) {
        return {
          testId: "SEC-02",
          testVersion: "1.0.0",
          testName: "Security Response Headers",
          category: "public_security",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: `Strong Security Headers Configured (${presentCount}/5)`,
          summary: `${presentCount} of 5 essential security response headers configured (HSTS: ${hasHsts ? "Yes" : "No"}, CSP: ${hasCsp ? "Yes" : "No"}, X-Content-Type-Options: ${hasXcto ? "Yes" : "No"}, X-Frame-Options: ${hasXfo ? "Yes" : "No"}, Referrer-Policy: ${hasRp ? "Yes" : "No"}).`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: presentHeaders,
        };
      }

      if (presentCount >= 2) {
        return {
          testId: "SEC-02",
          testVersion: "1.0.0",
          testName: "Security Response Headers",
          category: "public_security",
          status: "WARNING",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 1,
          title: `Partial Security Headers Configured (${presentCount}/5)`,
          summary: `Only ${presentCount} of 5 key security headers detected. Missing headers (e.g. ${!hasHsts ? "HSTS, " : ""}${!hasCsp ? "CSP, " : ""}${!hasRp ? "Referrer-Policy" : ""}) leave defensive gaps.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: [`Present headers: ${presentHeaders.join(", ") || "None"} (${presentCount}/5)`],
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
        title: `Missing Key Security Response Headers (${presentCount}/5)`,
        summary: `Only ${presentCount} of 5 standard defense-in-depth headers were detected. Missing HSTS, CSP, X-Content-Type-Options, X-Frame-Options, or Referrer-Policy.`,
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: [`Present headers: ${presentHeaders.join(", ") || "None"} (${presentCount}/5)`],
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
      if (ctx.pages.length === 0) {
        return {
          testId: "SEC-03",
          testVersion: "1.0.0",
          testName: "Mixed Content and Insecure Resource References",
          category: "public_security",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Mixed Content Unobservable",
          summary: "No page data available to audit mixed content.",
          timestamp: now,
          confidence: "LOW",
        };
      }

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
      const allCookies = ctx.pages.flatMap((p) => p.cookieAttributes || []);

      if (allCookies.length === 0) {
        return {
          testId: "SEC-04",
          testVersion: "1.0.0",
          testName: "Publicly Observable Cookie Attributes",
          category: "public_security",
          status: "UNKNOWN",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "No Public Cookies Observed",
          summary: "No session or tracking cookies were set during initial page discovery. Transport security flags (Secure, HttpOnly, SameSite) remain unobserved / unknown.",
          timestamp: now,
          confidence: "LOW",
          limitations: "No Set-Cookie response headers observed during passive crawl. Presence of secure flags cannot be verified without cookie issuance.",
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
          sampleEvidence: allCookies.slice(0, 3).map((c) => `Cookie '${c.name}': Secure=${c.secure}, HttpOnly=${c.httpOnly}`),
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
        summary: `${insecureCookies.length} cookie(s) are missing Secure or HttpOnly attributes.`,
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
      const exposure = ctx.exposureResults;

      // Inspect crawled pages for directory indexing and stack traces
      const pagesWithDirectoryIndexing = ctx.pages.filter((p) =>
        (p.title || "").toLowerCase().includes("index of /") ||
        (p.visibleTextSample || "").toLowerCase().includes("parent directory")
      );
      const pagesWithStackTraces = ctx.pages.filter((p) => {
        const text = (p.visibleTextSample || "").toLowerCase();
        return (
          text.includes("traceback (most recent call last)") ||
          text.includes("fatal error:") ||
          text.includes("whoops! there was an error")
        );
      });

      if (exposure?.hasExposure || pagesWithDirectoryIndexing.length > 0 || pagesWithStackTraces.length > 0) {
        const issues: string[] = [
          ...(exposure?.safeSummaries || []),
          pagesWithDirectoryIndexing.length > 0 ? "Directory indexing pattern ('Index of /') detected on public pages." : "",
          pagesWithStackTraces.length > 0 ? "Application error / stack trace pattern detected on public pages." : "",
        ].filter(Boolean);

        return {
          testId: "SEC-05",
          testVersion: "1.0.0",
          testName: "Public Exposure and Configuration Clues",
          category: "public_security",
          status: "FAIL",
          severity: "CRITICAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Public Configuration Exposure Detected",
          summary: issues.join(" "),
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: exposure?.evidence || ["Sensitive configuration indicators detected (details redacted)"],
        };
      }

      if (exposure?.isInconclusive) {
        return {
          testId: "SEC-05",
          testVersion: "1.0.0",
          testName: "Public Exposure and Configuration Clues",
          category: "public_security",
          status: "UNKNOWN",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Public Exposure Probes Inconclusive",
          summary: exposure.inconclusiveReason || "Server returned generic HTML application fallback for probe paths; absence of sensitive files cannot be conclusively verified.",
          timestamp: now,
          confidence: "LOW",
          sampleEvidence: exposure.evidence,
          limitations: "Catch-all HTTP 200 routing on probe targets prevents conclusive static confirmation.",
        };
      }

      if (exposure?.executed) {
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
          summary: "Bounded probes confirmed .env and .git/HEAD are inaccessible or not found; no directory indexing or debug traces detected.",
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: exposure.evidence,
        };
      }

      return {
        testId: "SEC-05",
        testVersion: "1.0.0",
        testName: "Public Exposure and Configuration Clues",
        category: "public_security",
        status: "NOT_TESTED",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 0,
        title: "Public Exposure Probes Not Executed",
        summary: "Public configuration exposure probes were not run in this scan pass.",
        timestamp: now,
        confidence: "LOW",
        limitations: "Bounded probes required to verify absence of exposed .env or .git files.",
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
      if (ctx.pages.length === 0) {
        return {
          testId: "SEC-06",
          testVersion: "1.0.0",
          testName: "Third-Party Script Inventory and Policy",
          category: "public_security",
          status: "UNKNOWN",
          severity: "MEDIUM",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Scripts Unobservable",
          summary: "No page data available to audit third-party script inventory.",
          timestamp: now,
          confidence: "LOW",
        };
      }

      const thirdPartyScripts = ctx.pages.flatMap((p) =>
        p.resources.filter((r) => r.type === "script" && r.isThirdParty)
      );

      const uniqueDomains = new Set<string>();
      thirdPartyScripts.forEach((s) => {
        try {
          uniqueDomains.add(new URL(s.url).hostname);
        } catch {}
      });

      if (uniqueDomains.size <= 5) {
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
          summary: `Identified ${uniqueDomains.size} third-party script origin(s) across crawled pages.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: Array.from(uniqueDomains),
        };
      }

      return {
        testId: "SEC-06",
        testVersion: "1.0.0",
        testName: "Third-Party Script Inventory and Policy",
        category: "public_security",
        status: "WARNING",
        severity: "MEDIUM",
        maxPoints: 2,
        earnedPoints: 1,
        title: "High Third-Party Script Origin Diversity",
        summary: `Detected ${uniqueDomains.size} external third-party script origins, which increases supply chain risk and slows down page rendering.`,
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: Array.from(uniqueDomains).slice(0, 5),
      };
    },
  },
];
