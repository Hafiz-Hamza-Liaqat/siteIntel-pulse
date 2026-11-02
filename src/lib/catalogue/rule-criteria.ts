/**
 * Measurable acceptance criteria and rule-specific validation procedures
 * for all 56 SiteIntel Pulse catalogue rules.
 */

export interface RuleCriteria {
  measurableThreshold: string;
  validationProcedure: string;
}

export const RULE_CRITERIA_MAP: Record<string, RuleCriteria> = {
  // 1. Technical Health & Crawlability (TCH-01 to TCH-06)
  "TCH-01": {
    measurableThreshold: "Primary entry URL must return HTTP 200 over a valid HTTPS certificate with response latency < 1000ms.",
    validationProcedure: "Execute `curl -Iv https://<target>` and verify HTTP/2 or HTTP/1.1 200 OK within 1000ms and valid TLS chain.",
  },
  "TCH-02": {
    measurableThreshold: "HTTP requests must 301-redirect to HTTPS and single canonical host (www vs non-www) without chained hops.",
    validationProcedure: "Issue requests to `http://<domain>`, `http://www.<domain>`, and alternative host; verify single permanent redirect hop to canonical HTTPS URL.",
  },
  "TCH-03": {
    measurableThreshold: "100% of indexable public pages must omit noindex/none meta directives and allow crawler access in HTTP headers.",
    validationProcedure: "Inspect HTML `<head>` for `<meta name='robots'>` and HTTP `X-Robots-Tag` headers; verify absence of accidental 'noindex' directives.",
  },
  "TCH-04": {
    measurableThreshold: "Zero (0) internal links within crawl boundary should return HTTP 404, 5xx, or network failure codes.",
    validationProcedure: "Crawl in-scope anchor `href` links and assert HTTP status < 400 for all local origin destinations.",
  },
  "TCH-05": {
    measurableThreshold: "Accessible `/robots.txt` returning HTTP 200 with at least one valid XML sitemap reference resolving to HTTP 200.",
    validationProcedure: "Fetch `/robots.txt`, parse `Sitemap:` declarations, and verify each sitemap index or urlset returns valid XML under 1 MB.",
  },
  "TCH-06": {
    measurableThreshold: "Zero (0) critical in-scope scripts, stylesheets, or core fonts fail with HTTP 4xx/5xx or CORS blocks.",
    validationProcedure: "Inspect browser network waterfall during page load and assert zero failed HTTP responses for critical head assets.",
  },

  // 2. Technical & On-Page SEO (SEO-01 to SEO-09)
  "SEO-01": {
    measurableThreshold: "100% of indexable HTML pages must have a non-empty, unique `<title>` between 30 and 60 characters.",
    validationProcedure: "Extract `document.title` on every crawl page, verify string length is 30–60 chars and distinct across all pages.",
  },
  "SEO-02": {
    measurableThreshold: ">= 90% of indexable pages feature descriptive `<meta name='description'>` tags between 70 and 160 characters.",
    validationProcedure: "Query `meta[name='description']` on all HTML pages and assert length is 70–160 characters with keyword relevance.",
  },
  "SEO-03": {
    measurableThreshold: "Every HTML page must feature exactly one prominent `<h1>` tag with valid downward hierarchy (`<h2>`, `<h3>`).",
    validationProcedure: "Run `document.querySelectorAll('h1')` asserting count === 1 and verify subsequent headings follow sequential outline.",
  },
  "SEO-04": {
    measurableThreshold: "100% of indexable pages must declare a self-referencing or authoritative `<link rel='canonical'>` tag.",
    validationProcedure: "Inspect `link[rel='canonical']` href attribute on each page and verify absolute URL matches requested canonical destination.",
  },
  "SEO-05": {
    measurableThreshold: "URLs must consist of clean lowercase, hyphen-delimited alphanumeric slugs without query parameter clutter.",
    validationProcedure: "Inspect crawled URL path segments for uppercase characters, underscores, session IDs, or repeated parameter tokens.",
  },
  "SEO-06": {
    measurableThreshold: ">= 95% of content `<img>` elements must have meaningful descriptive `alt` attributes (decorative images alt='').",
    validationProcedure: "Query `document.querySelectorAll('img:not([alt])')` and assert zero unhandled informational images.",
  },
  "SEO-07": {
    measurableThreshold: "All links have descriptive anchor text (no bare URLs or 'click here') and outbound links declare appropriate rel attributes.",
    validationProcedure: "Inspect anchor tags across crawled pages for generic anchor phrases ('click here', 'more') and verify rel='noopener' on external links.",
  },
  "SEO-08": {
    measurableThreshold: "Valid Schema.org structured data (Organization, WebSite, Product, Article, or LocalBusiness) present via JSON-LD.",
    validationProcedure: "Extract `script[type='application/ld+json']` blocks and validate syntax against Schema.org specifications.",
  },
  "SEO-09": {
    measurableThreshold: "Core landing and informational pages must contain >= 200 words of substantive, non-boilerplate content.",
    validationProcedure: "Compute visible body word count excluding navigation, footer, and boilerplate elements across all crawled pages.",
  },

  // 3. Performance (PERF-01 to PERF-05)
  "PERF-01": {
    measurableThreshold: "Mobile Lighthouse performance lab score >= 85/100 (Good: >=85, Needs Improvement: 60-84, Poor: <60).",
    validationProcedure: "Run mobile Lighthouse audit emulation (390x844, 4x CPU throttle) and measure composite score and metrics.",
  },
  "PERF-02": {
    measurableThreshold: "Desktop Lighthouse performance lab score >= 85/100 (Good: >=85, Needs Improvement: 60-84, Poor: <60).",
    validationProcedure: "Run desktop Lighthouse audit emulation (1280x800, unthrottled) and measure composite score and metrics.",
  },
  "PERF-03": {
    measurableThreshold: "CrUX real-user 75th percentile: LCP <= 2500ms, INP <= 200ms, and CLS <= 0.10 across 28-day window.",
    validationProcedure: "Query Google Chrome User Experience Report (CrUX) API for origin/page and compare p75 metrics to CWV thresholds.",
  },
  "PERF-04": {
    measurableThreshold: "Critical render path must contain <= 2 synchronous blocking scripts or non-critical head stylesheets.",
    validationProcedure: "Inspect DOM head for `<script>` tags lacking `defer`/`async` or stylesheets without `media` queries.",
  },
  "PERF-05": {
    measurableThreshold: "Total transferred page weight under initial load must not exceed 2.5 MB (2,621,440 bytes).",
    validationProcedure: "Sum transferSize from `performance.getEntriesByType('resource')` plus navigation entry on primary landing page.",
  },

  // 4. Responsive & Accessibility (RSP-01 to RSP-05)
  "RSP-01": {
    measurableThreshold: "Valid `<meta name='viewport' content='width=device-width, initial-scale=1'>` tag declared in `<head>`.",
    validationProcedure: "Query `meta[name='viewport']` and assert content string contains width=device-width and initial-scale=1.",
  },
  "RSP-02": {
    measurableThreshold: "Zero horizontal scrolling (`scrollWidth <= clientWidth`) across 320, 360, 390, 768, 1024, 1280, 1440px viewports.",
    validationProcedure: "Render page in Chromium at each of the 7 viewports and assert `document.documentElement.scrollWidth <= window.innerWidth + 3`.",
  },
  "RSP-03": {
    measurableThreshold: "Primary navigation and action buttons must be fully visible without clipping or overlapping sticky elements.",
    validationProcedure: "Inspect bounding client rects of navigation headers and primary action buttons across mobile viewports for clipped edges.",
  },
  "RSP-04": {
    measurableThreshold: "Interactive mobile touch targets must measure >= 40x40px and mobile body text font size must be >= 14px.",
    validationProcedure: "Inspect computed CSS dimensions of `<a>`, `<button>`, and `<input>` elements at 390px viewport; flag controls < 40x40px.",
  },
  "RSP-05": {
    measurableThreshold: "Root `<html lang='...'>` attribute defined with valid BCP 47 language code and basic input labels present.",
    validationProcedure: "Verify `document.documentElement.lang` is non-empty and all form inputs have associated `<label>` or `aria-label`.",
  },

  // 5. Public Security Configuration (SEC-01 to SEC-06)
  "SEC-01": {
    measurableThreshold: "Target platform communicates exclusively over TLS 1.2+ with valid, trusted certificate and HSTS enabled.",
    validationProcedure: "Inspect TLS socket connection parameters, certificate issuer, validity dates, and Strict-Transport-Security header.",
  },
  "SEC-02": {
    measurableThreshold: "Web server must emit all 5 key defense-in-depth headers: HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy.",
    validationProcedure: "Inspect response headers from `curl -s -D - https://<target> -o /dev/null` and verify presence of all 5 security headers.",
  },
  "SEC-03": {
    measurableThreshold: "Zero (0) passive or active subresources loaded over unencrypted HTTP protocol on HTTPS pages.",
    validationProcedure: "Scan all script, link, img, iframe, and audio/video src attributes for `http://` URLs in DOM and network traffic.",
  },
  "SEC-04": {
    measurableThreshold: "All cookies set in response headers must specify `Secure` and `SameSite=Lax` (or Strict); session cookies require `HttpOnly`.",
    validationProcedure: "Inspect Set-Cookie header directives across crawl requests and verify security attribute flags on all cookies.",
  },
  "SEC-05": {
    measurableThreshold: "Public probes to `/.env`, `/.git/HEAD`, `/config.json`, and backup files must return HTTP 403 or 404 without debug leaks.",
    validationProcedure: "Issue bounded HEAD/GET requests to sensitive path candidates and verify server denies access without revealing source code.",
  },
  "SEC-06": {
    measurableThreshold: "Third-party script origins must be bounded (<= 5 distinct third-party domains) and loaded asynchronously.",
    validationProcedure: "Analyze external script hostnames loaded in DOM and verify they are documented and load with async/defer flags.",
  },

  // 6. Observable Authentication Posture (AUTH-01 to AUTH-04)
  "AUTH-01": {
    measurableThreshold: "All discovered login, register, and password-reset links must resolve exclusively to HTTPS destinations.",
    validationProcedure: "Identify auth-related anchors (`/login`, `/signup`, `/signin`) and verify destinations enforce HTTPS protocol.",
  },
  "AUTH-02": {
    measurableThreshold: "Authentication forms must use POST method, submit to HTTPS actions, and mask sensitive password inputs.",
    validationProcedure: "Inspect form DOM elements on login surfaces for method='POST', HTTPS action URL, and input type='password'.",
  },
  "AUTH-03": {
    measurableThreshold: "Session and auth tokens must include `HttpOnly`, `Secure`, and `SameSite=Lax/Strict` cookie flags.",
    validationProcedure: "Inspect Set-Cookie directives on authentication response headers for HttpOnly, Secure, and SameSite protection.",
  },
  "AUTH-04": {
    measurableThreshold: "Public support for modern federated Single Sign-On (Google, Apple, Microsoft) or Passkey authentication.",
    validationProcedure: "Scan authentication surfaces for OAuth/OIDC federated sign-in buttons or WebAuthn/Passkey registration options.",
  },

  // 7. Content Quality & Trust (CNT-01 to CNT-05)
  "CNT-01": {
    measurableThreshold: "Hero section must state primary value proposition and business category clearly within first 50 words.",
    validationProcedure: "Inspect homepage hero heading and introductory copy for concise problem statement and target audience clarity.",
  },
  "CNT-02": {
    measurableThreshold: "Content formatted with structured headings (H2/H3), bulleted lists, and paragraph blocks under 100 words.",
    validationProcedure: "Analyze DOM structure on content pages for heading-to-paragraph distribution and scan-friendly readability.",
  },
  "CNT-03": {
    measurableThreshold: "Footer or main navigation links to About Us, Contact, Privacy Policy, and Terms of Service pages.",
    validationProcedure: "Query anchor elements in `<nav>` and `<footer>` for presence of contact, privacy, terms, and company identity links.",
  },
  "CNT-04": {
    measurableThreshold: "Active knowledge resources, blog, documentation, or FAQ section with industry-relevant articles.",
    validationProcedure: "Discover links to `/blog`, `/resources`, `/knowledge-base`, or `/docs` and verify publication of informative content.",
  },
  "CNT-05": {
    measurableThreshold: "Zero (0) placeholder text ('Lorem Ipsum', 'Test Product', 'Sample Text') found across crawled body content.",
    validationProcedure: "Regex scan body text across all crawled pages for template placeholder strings and unpopulated content tags.",
  },

  // 8. GEO / AEO & AI Readiness (AI-01 to AI-04)
  "AI-01": {
    measurableThreshold: "robots.txt must declare explicit crawler access policy for major AI search agents (GPTBot, ClaudeBot, PerplexityBot).",
    validationProcedure: "Inspect `/robots.txt` for specific user-agent rules addressing AI crawler agents and verify intentional access directives.",
  },
  "AI-02": {
    measurableThreshold: "Primary informational content rendered server-side in initial HTML response (>= 300 words without client JS execution).",
    validationProcedure: "Fetch raw HTTP response without JavaScript execution and verify primary article/page body copy is present in initial DOM.",
  },
  "AI-03": {
    measurableThreshold: "Clear Schema.org Organization/Brand entity definition linking to official social profiles and Wikidata/sameAs URLs.",
    validationProcedure: "Inspect JSON-LD structured data for `@type: Organization` with name, url, logo, and `sameAs` social identity links.",
  },
  "AI-04": {
    measurableThreshold: "Direct answer-ready content blocks (concise 1–2 sentence definitions or FAQ schema) answering core customer queries.",
    validationProcedure: "Check for FAQPage structured data or distinct Q&A heading-paragraph pairings answering frequent customer inquiries.",
  },

  // 9. Analytics & Tracking Readiness (ANA-01 to ANA-05)
  "ANA-01": {
    measurableThreshold: "Google Analytics 4 measurement ID (`G-XXXXXXXXXX`) script tag installed and loaded on all public pages.",
    validationProcedure: "Search DOM scripts and network requests for Google tag loader (`gtag/js?id=G-` or `googletagmanager.com/gtag/js`).",
  },
  "ANA-02": {
    measurableThreshold: "Google Tag Manager container (`GTM-XXXXXXX`) deployed correctly in `<head>` and `<body>`.",
    validationProcedure: "Search document head for `googletagmanager.com/gtm.js?id=GTM-` container snippet.",
  },
  "ANA-03": {
    measurableThreshold: "Conversion and retargeting pixels configured for active advertising acquisition channels (Meta, Google, LinkedIn).",
    validationProcedure: "Inspect network traffic and loaded scripts for advertising pixel origins (e.g. `connect.facebook.net`, `googleads`).",
  },
  "ANA-04": {
    measurableThreshold: "Compliant Consent Management Platform (CMP) banner present to handle cookie choices before firing tracking tags.",
    validationProcedure: "Check DOM for recognized CMP containers (OneTrust, Cookiebot, Iubenda) or custom consent management UI dialogs.",
  },
  "ANA-05": {
    measurableThreshold: "Authorized connection to Google Search Console or Google Analytics 4 verified in platform settings.",
    validationProcedure: "Verify authenticated OAuth provider credentials in SiteIntel Pulse provider connection store for live traffic reporting.",
  },

  // 10. Conversion & Marketing Experience (CRO-01 to CRO-04)
  "CRO-01": {
    measurableThreshold: "At least one clear, high-contrast primary Call-to-Action button visible in hero section above the fold.",
    validationProcedure: "Inspect elements within initial viewport height (<= 800px) for prominent interactive CTA anchors or submit buttons.",
  },
  "CRO-02": {
    measurableThreshold: "Primary transaction or inquiry pathway navigable in <= 3 clicks without broken intermediary steps.",
    validationProcedure: "Follow primary conversion funnel links from homepage to final checkout or lead-capture form and verify continuity.",
  },
  "CRO-03": {
    measurableThreshold: "All form inputs provide visible `<label>` elements, input types, and client-side validation feedback.",
    validationProcedure: "Inspect form fields on lead capture or inquiry surfaces for explicit label associations, required flags, and error states.",
  },
  "CRO-04": {
    measurableThreshold: "Transparent pricing information, guarantee terms, and security assurances accessible near conversion triggers.",
    validationProcedure: "Verify presence of pricing tables, refund/cancellation policies, or customer security trust seals near conversion triggers.",
  },

  // 11. Competitive Comparison Readiness (CMP-01 to CMP-03)
  "CMP-01": {
    measurableThreshold: "At least 2 relevant competitor domains identified and configured for comparative benchmark evaluation.",
    validationProcedure: "Verify audit intake request includes 2–3 valid competitor domain names operating in the same market category.",
  },
  "CMP-02": {
    measurableThreshold: "Uniform crawl bounds and identical assessment rules applied across target domain and competitor domains.",
    validationProcedure: "Compare scan request configuration parameters between target domain and competitor scans to ensure identical test bounds.",
  },
  "CMP-03": {
    measurableThreshold: "External market intelligence metrics (SERP visibility, backlinks) labeled with data source provider and date.",
    validationProcedure: "Verify third-party domain metrics in competitive analysis specify data provenance, measurement window, and provider source.",
  },
};

/**
 * Returns measurable threshold for a rule ID with fallback.
 */
export function getMeasurableThreshold(ruleId: string, fallbackDescription?: string): string {
  return RULE_CRITERIA_MAP[ruleId]?.measurableThreshold || fallbackDescription || "Must satisfy documented catalogue acceptance criteria.";
}

/**
 * Returns actionable validation procedure for a rule ID with fallback.
 */
export function getValidationProcedure(ruleId: string): string {
  return RULE_CRITERIA_MAP[ruleId]?.validationProcedure || `Execute automated rule verification for ${ruleId}.`;
}
