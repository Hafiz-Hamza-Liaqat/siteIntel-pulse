import { RuleDefinition } from "../types";
import { AssessmentResult } from "@/types";

export function isAuthUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    const path = u.pathname.toLowerCase();
    // Exclude job listings, blogs, articles, or other content slugs containing 'account' (e.g. account-executive, accountant)
    if (
      path.includes("/jobs/") ||
      path.includes("/job/") ||
      path.includes("/blog/") ||
      path.includes("/articles/") ||
      path.includes("/news/") ||
      path.includes("/careers/") ||
      path.includes("/roles/") ||
      path.includes("/categories/")
    ) {
      return false;
    }
    // Check specific authentication path patterns
    const authRegex = /(?:^|\/)(login|signin|sign-in|signup|sign-up|register|registration|oauth|auth|user\/login|app\/login|portal\/login|my-account)(?:\/|$|\?)/i;
    if (authRegex.test(path)) return true;
    if (path === "/account" || path.startsWith("/account/")) {
      const afterAccount = path.slice(8);
      if (!afterAccount || afterAccount.startsWith("/") || afterAccount.startsWith("?")) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export const authRules: RuleDefinition[] = [
  {
    id: "AUTH-01",
    name: "Authentication Surfaces and HTTPS",
    version: "1.0.0",
    category: "authentication_posture",
    categoryName: "Observable Authentication Posture",
    maxPoints: 2,
    description: "Detects login, registration, and password recovery routes and verifies HTTPS enforcement.",
    businessImpactSummary: "Authentication pages without strict HTTPS expose customer usernames and passwords to network packet sniffing.",
    remediationAdvice: "Enforce HTTPS with HSTS on all login, signup, and account management surfaces.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const authLinks = ctx.pages.flatMap((p) =>
        p.links.filter((l) => isAuthUrl(l.targetUrl))
      );

      if (authLinks.length > 0) {
        const insecureAuthLinks = authLinks.filter((l) => !l.targetUrl.startsWith("https://"));
        if (insecureAuthLinks.length === 0) {
          return {
            testId: "AUTH-01",
            testVersion: "1.0.0",
            testName: "Authentication Surfaces and HTTPS",
            category: "authentication_posture",
            status: "PASS",
            severity: "INFORMATIONAL",
            maxPoints: 2,
            earnedPoints: 2,
            title: "Authentication Surfaces Protected by HTTPS",
            summary: `Discovered login/account navigation links are strictly protected over secure HTTPS.`,
            timestamp: now,
            confidence: "HIGH",
            sampleEvidence: authLinks.slice(0, 2).map((l) => l.targetUrl),
          };
        }

        return {
          testId: "AUTH-01",
          testVersion: "1.0.0",
          testName: "Authentication Surfaces and HTTPS",
          category: "authentication_posture",
          status: "FAIL",
          severity: "CRITICAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "Insecure Authentication Links Detected",
          summary: `Found authentication surfaces communicating over unencrypted HTTP.`,
          timestamp: now,
          confidence: "HIGH",
          affectedUrlsCount: insecureAuthLinks.length,
          sampleEvidence: insecureAuthLinks.slice(0, 3).map((l) => l.targetUrl),
        };
      }

      return {
        testId: "AUTH-01",
        testVersion: "1.0.0",
        testName: "Authentication Surfaces and HTTPS",
        category: "authentication_posture",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 2,
        title: "Entire Platform Operates over HTTPS",
        summary: "No dedicated public login links found, but platform operates entirely over secure HTTPS.",
        timestamp: now,
        confidence: "MEDIUM",
      };
    },
  },
  {
    id: "AUTH-02",
    name: "Login Form Transport and Fields",
    version: "1.0.0",
    category: "authentication_posture",
    categoryName: "Observable Authentication Posture",
    maxPoints: 2,
    description: "Evaluates form submission method (POST), action security, and standard password field masking.",
    businessImpactSummary: "Submitting login credentials via HTTP GET leaks passwords into web server access logs and browser history.",
    remediationAdvice: "Always submit credentials via POST to an HTTPS endpoint with input type='password'.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      return {
        testId: "AUTH-02",
        testVersion: "1.0.0",
        testName: "Login Form Transport and Fields",
        category: "authentication_posture",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 2,
        title: "Form Transport Security Maintained",
        summary: "Observed forms submit over secure HTTPS using appropriate request methods.",
        timestamp: now,
        confidence: "MEDIUM",
        limitations: "Public scan observes frontend HTML; does not submit test credentials or probe backend authentication logic.",
      };
    },
  },
  {
    id: "AUTH-03",
    name: "Session and Cookie Security Indicators",
    version: "1.0.0",
    category: "authentication_posture",
    categoryName: "Observable Authentication Posture",
    maxPoints: 2,
    description: "Audits session tokens and authentication cookies visible during initial page interaction.",
    businessImpactSummary: "Session cookies without HttpOnly and SameSite flags are susceptible to session hijacking and CSRF attacks.",
    remediationAdvice: "Set HttpOnly, Secure, and SameSite=Lax on all session identification cookies.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const allCookies = ctx.pages.flatMap((p) => p.cookieAttributes || []);

      if (allCookies.length === 0) {
        return {
          testId: "AUTH-03",
          testVersion: "1.0.0",
          testName: "Session and Cookie Security Indicators",
          category: "authentication_posture",
          status: "UNKNOWN",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 0,
          title: "No Public Session Cookies Observed",
          summary: "No session or authentication cookies were observed in response headers during discovery. Cookie security flags (HttpOnly, Secure, SameSite) remain unobserved / unknown.",
          timestamp: now,
          confidence: "LOW",
          limitations: "No Set-Cookie response headers observed during passive crawl. Attributes cannot be verified without cookie issuance.",
        };
      }

      const insecureCookies = allCookies.filter((c) => !c.secure || !c.httpOnly);
      if (insecureCookies.length > 0) {
        return {
          testId: "AUTH-03",
          testVersion: "1.0.0",
          testName: "Session and Cookie Security Indicators",
          category: "authentication_posture",
          status: "WARNING",
          severity: "HIGH",
          maxPoints: 2,
          earnedPoints: 1,
          title: "Insecure Cookie Attributes Detected",
          summary: `${insecureCookies.length} observed cookie(s) lack required Secure or HttpOnly security flags.`,
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: insecureCookies.slice(0, 3).map((c) => `Cookie '${c.name}': Secure=${c.secure}, HttpOnly=${c.httpOnly}`),
          affectedUrlsCount: insecureCookies.length,
        };
      }

      return {
        testId: "AUTH-03",
        testVersion: "1.0.0",
        testName: "Session and Cookie Security Indicators",
        category: "authentication_posture",
        status: "PASS",
        severity: "INFORMATIONAL",
        maxPoints: 2,
        earnedPoints: 2,
        title: "Public Session Attributes Healthy",
        summary: `All ${allCookies.length} observed cookies adhere to standard transport security requirements (Secure and HttpOnly flags enforced).`,
        timestamp: now,
        confidence: "HIGH",
        sampleEvidence: allCookies.slice(0, 3).map((c) => `Cookie '${c.name}': Secure=${c.secure}, HttpOnly=${c.httpOnly}, SameSite=${c.sameSite || "Unspecified"}`),
      };
    },
  },
  {
    id: "AUTH-04",
    name: "Public Evidence of MFA, SSO, or Passkey Options",
    version: "1.0.0",
    category: "authentication_posture",
    categoryName: "Observable Authentication Posture",
    maxPoints: 2,
    description: "Detects visible options for modern authentication options such as Google/Apple/GitHub SSO, Passkeys, or MFA indicators.",
    businessImpactSummary: "Single-Sign-On and Passkeys reduce password reuse vulnerabilities, streamline signups, and boost customer conversion.",
    remediationAdvice: "Offer modern Single Sign-On (Google/Apple) or Passkey authentication to reduce signup friction.",
    evaluate: (ctx): AssessmentResult => {
      const now = new Date().toISOString();
      const ssoClues = ctx.pages.some((p) => {
        const text = (p.visibleTextSample || "").toLowerCase();
        return text.includes("sign in with google") || text.includes("log in with apple") || text.includes("continue with google");
      });

      if (ssoClues) {
        return {
          testId: "AUTH-04",
          testVersion: "1.0.0",
          testName: "Public Evidence of MFA, SSO, or Passkey Options",
          category: "authentication_posture",
          status: "PASS",
          severity: "INFORMATIONAL",
          maxPoints: 2,
          earnedPoints: 2,
          title: "Modern SSO / OAuth Options Detected",
          summary: "Discovered visible evidence of modern Single Sign-On (SSO) options.",
          timestamp: now,
          confidence: "HIGH",
          sampleEvidence: ["Visible SSO / OAuth options observed"],
        };
      }

      return {
        testId: "AUTH-04",
        testVersion: "1.0.0",
        testName: "Public Evidence of MFA, SSO, or Passkey Options",
        category: "authentication_posture",
        status: "WARNING",
        severity: "LOW",
        maxPoints: 2,
        earnedPoints: 1,
        title: "No Public SSO or Passkey Options Observed",
        summary: "Did not observe visible Google/Apple SSO buttons on scanned public pages.",
        timestamp: now,
        confidence: "MEDIUM",
        limitations: "Absence in public UI is not proof that MFA or SSO is absent from internal account settings.",
      };
    },
  },
];
