# SiteIntel Pulse — Version 1.0 Assessment Catalogue (100 Points Total)

The assessment catalogue defines 56 deterministic automated rules across 11 categories totaling exactly 100 points.

| Category ID | Category Name | Points | Tests Count |
|---|---|---:|---:|
| CAT-01 | Technical Health and Crawlability | 12 | 6 |
| CAT-02 | Technical and On-Page SEO | 18 | 9 |
| CAT-03 | Performance | 10 | 5 |
| CAT-04 | Responsive Experience and Basic Accessibility | 10 | 5 |
| CAT-05 | Public Security Configuration | 12 | 6 |
| CAT-06 | Observable Authentication Posture | 8 | 4 |
| CAT-07 | Content Quality and Trust | 10 | 5 |
| CAT-08 | GEO / AEO and AI-Search Readiness | 8 | 4 |
| CAT-09 | Analytics and Tracking Readiness | 5 | 5 |
| CAT-10 | Conversion and Marketing Experience | 4 | 4 |
| CAT-11 | Competitive Comparison Readiness | 3 | 3 |
| **Total** | | **100** | **56** |

---

### Category 1: Technical Health and Crawlability (12 Points, 6 Tests @ 2 pts)
- **TCH-01: HTTPS and Page Availability (2 pts)** — Assesses entry URL availability, HTTP status code 200, TLS reachability, and response timing.
- **TCH-02: Preferred Hostname and Redirect Consistency (2 pts)** — Validates HTTP-to-HTTPS redirect, www vs non-www canonical resolution, and loop/chain detection.
- **TCH-03: Crawlability and Indexability Signals (2 pts)** — Checks robots meta tag, X-Robots-Tag, and fetchable HTML status.
- **TCH-04: Broken Internal Links (2 pts)** — Measures discovered internal link targets, broken link rates, and 404/500 responses.
- **TCH-05: Robots.txt and XML Sitemap Availability (2 pts)** — Validates robots.txt parseability, XML sitemap reference, and eligible URL coverage.
- **TCH-06: Failed or Blocked Resources and Server Errors (2 pts)** — Tracks failed in-scope scripts, styles, images, and server 5xx anomalies.

### Category 2: Technical and On-Page SEO (18 Points, 9 Tests @ 2 pts)
- **SEO-01: Title Presence, Length, and Uniqueness (2 pts)** — Evaluates presence (30–60 chars recommended) and uniqueness across discovered pages.
- **SEO-02: Meta Description Presence and Quality (2 pts)** — Checks presence (70–160 chars recommended), emptiness, and duplicate clusters.
- **SEO-03: Heading Structure and Outline (2 pts)** — Checks single primary H1, hierarchical H1-H6 outline, and heading absence.
- **SEO-04: Canonical and Robots Directive Consistency (2 pts)** — Checks self-referencing canonical vs duplicate URL declarations and indexability harmony.
- **SEO-05: URL Slug Quality and Variants (2 pts)** — Analyzes path cleanliness, query parameters, uppercase anomalies, and duplicate paths.
- **SEO-06: Image Accessibility and Optimization (2 pts)** — Validates alt attribute presence (with decorative exceptions), dimensions, and loading hints.
- **SEO-07: Internal/External Link Hygiene and Rel Attributes (2 pts)** — Audits empty anchors, broken targets, and appropriate rel attributes (noopener/nofollow where applicable).
- **SEO-08: Structured Data Detection and Validation (2 pts)** — Detects JSON-LD, Microdata, and RDFa shapes and syntax validity.
- **SEO-09: Content Relevance and Thin/Duplicate Indicators (2 pts)** — Checks visible word volume, main text density, and repetitive template boilerplate.

### Category 3: Performance (10 Points, 5 Tests @ 2 pts)
- **PERF-01: Mobile PageSpeed / Lighthouse Lab Score (2 pts)** — Mobile performance score based on controlled lab execution or PageSpeed API.
- **PERF-02: Desktop PageSpeed / Lighthouse Lab Score (2 pts)** — Desktop performance score based on lab execution or PageSpeed API.
- **PERF-03: Core Web Vitals Field Data (2 pts)** — Evaluates LCP, INP, and CLS field metrics when available; labeled unknown if no field data exists.
- **PERF-04: Render-Blocking and Critical-Path Diagnostics (2 pts)** — Identifies render-blocking CSS/JS resources in the document head.
- **PERF-05: Page Weight and Large Asset Indicators (2 pts)** — Audits total page transfer size, large image payloads, and excessive JavaScript bundles.

### Category 4: Responsive Experience and Basic Accessibility (10 Points, 5 Tests @ 2 pts)
- **RSP-01: Viewport and Responsive Configuration (2 pts)** — Validates `<meta name="viewport">` with `width=device-width` and `initial-scale=1`.
- **RSP-02: Horizontal Overflow across Matrix (2 pts)** — Measures document scroll width across 320, 360, 390, 768, 1024, 1280, and 1440px viewports.
- **RSP-03: Overlaps, Clipping, and Key Control Visibility (2 pts)** — Checks element geometry and visibility of main navigation and buttons.
- **RSP-04: Touch Target and Form Usability (2 pts)** — Checks interactive element sizing (48x48px target recommended) and form field spacing.
- **RSP-05: Basic Accessibility Signals (2 pts)** — Evaluates input labels, accessible names, document language attribute, and color contrast clues.

### Category 5: Public Security Configuration (12 Points, 6 Tests @ 2 pts)
- **SEC-01: HTTPS and TLS Observations (2 pts)** — Verifies valid TLS certificate, cipher negotiation, and secure protocol version.
- **SEC-02: Security Response Headers (2 pts)** — Evaluates HSTS, Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy.
- **SEC-03: Mixed Content and Insecure References (2 pts)** — Identifies HTTP subresources and insecure form actions on HTTPS pages.
- **SEC-04: Publicly Observable Cookie Attributes (2 pts)** — Checks Secure, HttpOnly, and SameSite attributes on public cookies.
- **SEC-05: Public Exposure and Configuration Clues (2 pts)** — Tests for exposed `.git`, `.env`, backup files, directory indexing, or debug endpoints.
- **SEC-06: Third-Party Script Inventory and Policy (2 pts)** — Audits external script origin diversity and CSP script-src alignment.

### Category 6: Observable Authentication Posture (8 Points, 4 Tests @ 2 pts)
- **AUTH-01: Public Authentication Surfaces and HTTPS (2 pts)** — Locates login/signup routes and verifies TLS enforcement.
- **AUTH-02: Login Form Transport and Field Observations (2 pts)** — Verifies POST method, HTTPS action target, and standard password field masking.
- **AUTH-03: Observable Session and Cookie Security (2 pts)** — Observes session token security flags on public entry.
- **AUTH-04: Public Evidence of MFA, SSO, or Passkey Options (2 pts)** — Detects visible options for OAuth/SSO, Passkeys, or MFA prompts.

### Category 7: Content Quality and Trust (10 Points, 5 Tests @ 2 pts)
- **CNT-01: Business Purpose and Service Clarity (2 pts)** — Analyzes visible hero/intro text for clear value proposition and offering description.
- **CNT-02: Content Structure and Readability (2 pts)** — Evaluates paragraph chunking, subheadings, and scan-friendly readability.
- **CNT-03: Trust and Ownership Signals (2 pts)** — Detects About, Contact, Privacy Policy, Terms of Service, and company ownership clues.
- **CNT-04: Knowledge and Resource Content Opportunities (2 pts)** — Context-aware evaluation of blog, FAQ, or documentation presence.
- **CNT-05: Thin, Duplicate, or Stale Content Indicators (2 pts)** — Heuristic checks for placeholder text (Lorem Ipsum), thin content, or copy-paste templates.

### Category 8: GEO / AEO and AI-Search Readiness (8 Points, 4 Tests @ 2 pts)
- **AI-01: AI Crawler Access Policy (2 pts)** — Checks robots.txt directives for GPTBot, ClaudeBot, PerplexityBot, and Google-Extended.
- **AI-02: Main-Content Crawlability (2 pts)** — Compares raw HTML content with rendered DOM to ensure AI bots receive textual substance.
- **AI-03: Entity and Structured Data Clarity (2 pts)** — Checks Organization, LocalBusiness, Product, or Article schema clarity.
- **AI-04: Answer-Ready Content and Direct Explanations (2 pts)** — Checks for structured Q&A, FAQ schemas, and clear concise definitions.

### Category 9: Analytics and Tracking Readiness (5 Points, 5 Tests @ 1 pt)
- **ANA-01: GA4 Identifier / Script Load Signal (1 pt)** — Detects Google Analytics 4 tag (`G-XXXXX`) loading.
- **ANA-02: Google Tag Manager Signal (1 pt)** — Detects Google Tag Manager (`GTM-XXXXX`) container.
- **ANA-03: Advertising and Retargeting Pixels (1 pt)** — Detects Meta Pixel, LinkedIn Insight, or Google Ads tags.
- **ANA-04: Consent UI and Tracking UX Signals (1 pt)** — Detects cookie consent banner / privacy management UI.
- **ANA-05: Owner-Authorized Account Connection (1 pt)** — Reflects server-side connection status for authorized reporting.

### Category 10: Conversion and Marketing Experience (4 Points, 4 Tests @ 1 pt)
- **CRO-01: Primary Value Proposition & Call-to-Action (1 pt)** — Detects primary action button in the first viewport.
- **CRO-02: Contact, Booking, or Purchase Pathway (1 pt)** — Validates navigable link to checkout, cart, booking, or contact page.
- **CRO-03: Form Usability and Observable Validation (1 pt)** — Checks clear field labels and HTML5 validation attributes on lead/inquiry forms.
- **CRO-04: Pricing, Trust, and Policy Transparency (1 pt)** — Checks pricing clarity, shipping/return policy, or guarantee transparency.

### Category 11: Competitive Comparison Readiness (3 Points, 3 Tests @ 1 pt)
- **CMP-01: Competitor and Market Definition (1 pt)** — Evaluates user-supplied or discovered comparator domains.
- **CMP-02: Comparable Public Health & SEO Measurement (1 pt)** — Applies identical rules and crawl parameters to comparator domains.
- **CMP-03: External Market Metric Availability and Provenance (1 pt)** — Documents metric sources, measurement timestamps, and limits without fabrication.
