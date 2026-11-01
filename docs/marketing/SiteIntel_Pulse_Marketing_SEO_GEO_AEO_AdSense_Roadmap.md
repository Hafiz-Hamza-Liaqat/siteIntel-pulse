# SiteIntel Pulse — Complete Marketing, Search Visibility, AI Discovery & AdSense Roadmap

**Version:** 2.0  
**Roadmap date:** 1 November 2026  
**Status:** Unified Execution Baseline (Reconciled with Permanent Business Charter)  
**Product:** SiteIntel Pulse — evidence-driven website intelligence and growth audit platform  
**Governing Charter:** [`SITEINTEL_PULSE_PERMANENT_BUSINESS_MODEL_CHARTER.md`](./SITEINTEL_PULSE_PERMANENT_BUSINESS_MODEL_CHARTER.md)

---

## 0. Permanent Business Invariants (Mandatory Charter Compliance)

This roadmap is strictly governed by the **Permanent Business Model & Marketing Strategy Charter**. The following rules apply unconditionally across all present and future phases:

1. **Permanently 100% Free Platform:** SiteIntel Pulse is, and will forever remain, completely free for all users.
2. **Strictly Prohibited:**
   - Subscriptions, recurring fees, and paid billing systems (no Stripe, Paddle, or equivalent subscription billing integrations).
   - Premium tiers, "Pro" plans, paid memberships, and paywalls.
   - Paid report unlocking, token packs, credit meters, or feature gating based on payment.
3. **Monetization Engine:** Compliant advertising revenue via Google AdSense on public editorial and educational pages.
4. **User Experience Protection:** Advertisements must never appear on private report dashboards, scan intake forms, utility screens, or login interfaces. Ads must never mimic interface buttons, compromise Core Web Vitals, or introduce deceptive layout shifts.
5. **Growth Core:** Compounding organic search visibility, authentic audience trust, original people-first content, and comprehensive search/AI discovery (SEO, GEO, and AEO).
6. **Honest Claims:** No guarantees of search engine indexation, top rankings, AI citation placement, traffic volumes, or AdSense approval.

---

## 1. Mission and outcome

Build a discoverable, trustworthy public website for SiteIntel Pulse that:

1. Explains the free website audit clearly and converts the right visitors into completed audits.
2. Is technically accessible to Google Search, Bing/Copilot, and major AI search / answer systems on public marketing and editorial pages.
3. Publishes original, useful guides, product updates, and audit education content that can earn organic visits and citations.
4. Measures discovery, audit completion, report engagement, referrals, and revenue without fabricating traffic or engagement.
5. Is prepared for Google AdSense review through original content, clear navigation, useful public pages, privacy disclosures, compliant ad placement, and policy-safe traffic.
6. Has an auditable “zero known unintended search blockers” release gate. No roadmap can guarantee crawling, indexing, ranking, AI citations, AdSense approval, or virality.

**Product positioning (draft):** “Understand your website. Find what to fix. Grow with confidence.” SiteIntel Pulse produces a business-friendly website health and growth assessment and an evidence-linked expert diagnostic. All claims must match implemented and tested functionality.

## 2. Principles that govern every phase

- **People first:** Publish useful original material with evidence, practical examples, and clear ownership. Do not mass-produce near-duplicate AI pages, scrape and rewrite other publishers’ stories, fabricate author credentials, reviews, benchmarks, or results.
- **SEO is the foundation for AI Search:** Google's current guidance says existing technical SEO and helpful, reliable, people-first content remain the foundation for AI features. Do not sell or implement “GEO hacks” as guaranteed ranking factors. Google says `llms.txt`, arbitrary content chunking, and inauthentic mentions are not required for its Search AI features and should not be treated as ranking requirements.
- **Separate crawl access from data-use preference:** Search crawlers, user-requested fetchers, advertising validators, and model-training crawlers have different purposes. Make the site's intended policy explicit.
- **Public pages are discoverable; private customer data is not:** Never expose dashboard data, audit results, API payloads, tokens, user information, internal URLs, or tenant data for the sake of AI visibility. Protect data with authentication and authorization; `robots.txt` is not access control.
- **No accidental search blockers:** Intended public canonical pages must not be blocked by robots, `noindex`, wrong canonical URLs, authentication, CDN/WAF challenges, broken rendering, redirects, or server errors.
- **AdSense is an application/review, not an SEO checkbox:** Passing technical checks does not guarantee approval. Google reviews the site and policies; do not invent a minimum-traffic or minimum-page-count rule.
- **Never buy fake engagement:** No click exchanges, paid-to-click, automated impressions, asking users to click ads, or bots to inflate analytics. Paid traffic must be real, relevant, and directed to useful landing pages.
- **Measure before scaling:** Prefer completed useful audits, retention, and qualified referrals over raw page views or impressions.
- **No scope creep:** Complete phase gates in order. Do not create bulk pages or install every possible integration before the core indexable site, analytics, and product funnel work.

## 3. Governance and definition of done

### Work statuses

Every implementation item must use one of: `NOT STARTED`, `IN PROGRESS`, `BLOCKED`, `PASS`, `FAIL`, `DEFERRED BY DECISION`. `BLOCKED` requires a named cause and owner. Do not call something complete merely because the code compiles.

### Acceptance evidence

For every item, keep:
- affected routes and files;
- before/after behavior or output;
- commands and actual exit codes where tests apply;
- screenshots or crawler/browser evidence for visible and live-site checks;
- what remains unverified (such as domain, DNS, Google account verification, real AdSense review, or real-user data).

### “Zero known unintended search blockers” gate

Before public launch, enumerate every intended indexable public URL and test all of these:
1. Final production hostname resolves and uses HTTPS; one canonical hostname is enforced with redirects.
2. Each intended public URL returns a successful final `200` response (or a deliberately correct status for redirects / gone pages) with meaningful visible content.
3. No unintended `noindex`, `X-Robots-Tag: noindex`, `nofollow`, canonical-to-another-page, robots disallow, authentication redirect, geo wall, consent wall that hides all main content, CDN challenge, or WAF rule blocks public crawler access.
4. Important text, links, titles, canonical tags, and structured data are present in rendered/indexable HTML and not solely available after a private or user-triggered state.
5. `robots.txt` loads with `200`, contains correct production sitemap URL(s), and rules match the intended crawl policy.
6. XML sitemaps contain only canonical, public, indexable URLs that return the expected status; no staging, private report, search parameter, auth, API, redirect, or `noindex` URLs.
7. Important CSS/JS/image assets are not blocked when their access is needed to render public content.
8. Check the CDN, WAF, rate limits, bot mitigation, and origin logs. Validate official bots using the publisher’s current verification procedure or published IP ranges where offered; never trust a user-agent string alone for a security exception.
9. Run automated crawl checks and manual URL inspection samples from Google Search Console and Bing Webmaster Tools after the public domain is live.
10. Any finding that blocks these tests is a release blocker, not a later SEO improvement. Indexing itself is not guaranteed by search engines.

---

# 4. Complete phased roadmap

## Phase 0 — Lock baseline, repository audit, and launch scope

**Goal:** Discover what already exists before adding or duplicating features.

### Steps
1. Inventory existing routes, layouts, metadata, `robots.txt`, XML sitemap, RSS/feed routes, structured data, analytics, consent components, auth routes, report routes, and existing content.
2. Map which routes are public, private, user-generated, and potentially monetizable.
3. Record the public canonical hostname, deployment/staging hostnames, current rendering strategy, CDN/WAF provider, and any hosting-specific bot protections.
4. Inventory current content: page title, purpose, audience, uniqueness, last reviewed date, author/reviewer, internal links, and indexability.
5. Trace each existing conversion path from landing page to starting an audit, completing it, viewing/downloading a report, and sharing/referring.
6. Build a baseline crawl report with every URL and status. Save it as a pre-implementation baseline.
7. Keep existing report artifacts and unrelated code changes untouched.

### Acceptance criteria
- One route inventory exists with a classification for every route.
- One current-state checklist shows implemented / missing / broken / not yet testable because the domain is not live.
- No coding begins for features already implemented and verified.
- Unverified assumptions are marked as such.

## Phase 1 — Audience, market, keyword, and conversion strategy

**Goal:** Make the site target real user problems and a coherent product promise.

### Steps
1. Define the primary audiences: small business owners, startup founders, freelancers, SEO consultants, web agencies, and in-house web teams. Prioritize 1–2 initial segments instead of writing every page for everyone.
2. Interview or gather feedback from initial users; record the job they need done, alternatives they use, objections, and reason to trust a report.
3. Separate keyword intent into: free audit intent, issue/problem intent, how-to education, comparison/decision intent, AI search visibility questions, agency/workflow intent, and SiteIntel brand intent.
4. Build a keyword-to-page map. Every primary query cluster maps to one best page; avoid multiple pages targeting the same phrase with near-identical copy.
5. Review competing tools and their real capabilities, pricing, limitations, content gaps, and messaging. Use observations, not copied copy or unsupported superiority claims.
6. Draft value proposition, free-plan limits, CTA language, differentiation, target markets, and clear descriptions of what the tool does not verify.
7. Define first conversion: “Start a free audit” / “Run website audit”; second conversion: complete audit and view report; sharing is an optional referral step.

### Acceptance criteria
- Approved audience/persona and keyword-to-page map.
- No unsupported claims such as “guaranteed rankings,” “complete security certification,” or “guaranteed AI citations.”
- Each page has a distinct user intent, useful content promise, and CTA.

## Phase 2 — Information architecture and public page map

**Goal:** Create a coherent site that users, search engines, AI systems, and AdSense reviewers can navigate.

### Core pages to assess/build

**Product and conversion**
- `/` — homepage and primary CTA.
- `/free-website-audit/` — public landing page explaining what the free audit includes and its limits; the actual tool may be a separate route.
- `/how-it-works/` — steps, expected input/output, typical completion, and caveats.
- `/features/` — feature overview linked to real feature details.
- `/sample-reports/` — synthetic or explicitly permissioned, sanitized examples; never expose private customer reports.
- `/methodology/` — scoring, evidence, unknown/not-tested statuses, lab-vs-field data, crawl limits, competitor assumptions, and estimation limitations.
- `/use-cases/` plus distinct pages only where evidence supports them (for example agencies, small businesses, freelancers).
- `/free-platform/` — public page explaining the 100% free model, zero-paywall guarantee, and AdSense sponsorship. (Note: In strict alignment with the permanent charter, no `/pricing/` or paid tier pages exist).
- `/contact/`, `/about/`, and optional public company/product background page.

**Public service/feature landing pages** — create only when the product genuinely supports the assessment and each page can be meaningfully unique:
- `/website-seo-audit/`
- `/website-performance-audit/`
- `/mobile-responsiveness-audit/`
- `/website-technical-health/`
- `/website-security-checks/`
- `/ai-search-visibility/` (GEO/AEO; explain scope and limits)
- `/analytics-and-measurement/` (only where implemented)
- `/competitor-benchmarking/` (only where implemented and data limitations are disclosed)

**Content hub**
- `/blog/` — original educational articles, evergreen guides, and case studies.
- `/blog/category/[category]/` — curated categories with helpful descriptions; no empty/thin categories.
- `/blog/[slug]/` — canonical article pages.
- `/guides/` and `/guides/[slug]/` — step-by-step resources or tutorials, only if this is a genuinely distinct format.
- `/updates/` and `/updates/[slug]/` — original product release notes, feature changes, maintenance notices, and transparent roadmap updates.
- `/resources/glossary/[term]/` — only for useful, edited definitions, not mass-generated keyword doorway pages.
- `/feed.xml` or `/rss.xml` — valid RSS/Atom feed of public posts and updates with canonical links, publication/modification dates, and only public content.
- `/search/` — if included, define pagination/query canonical/noindex policy. Do not generate indexable thin search-result URLs.

**Trust, policy and accessibility**
- `/privacy/` — accurate data use, scan URLs/data, cookies/analytics/advertising, sharing, retention, contact and user rights.
- `/terms/` — use terms that match the real product and plans.
- `/cookie-policy/` or equivalent cookie disclosures when applicable.
- `/disclaimer/` — methodology limits, non-guarantees, financial estimation caveats, and no implication of a formal security certification.
- `/editorial-policy/` — how guides are researched, fact-checked, cited, updated, and corrected.
- `/corrections/` or an explicit corrections policy.
- Author/contributor profile pages where articles are attributed to real people with real experience.
- `/accessibility/` or an accessibility statement if the product can support a meaningful one.
- `/404/` (real not-found response) and useful error states.

### Private/non-indexable routes

Inventory route names from the actual repository; likely categories include login/signup, account, dashboard, scan creation/status, private reports, API endpoints, admin, and internal callbacks. Do not assume these literal prefixes exist without checking. Enforce auth/tenant authorization server-side. Do not make private content public for crawler access. Apply `noindex` where appropriate, avoid adding private URLs to sitemaps, and use robots rules intentionally. `robots.txt` is not a security boundary.

### Acceptance criteria
- Approved sitemap of current and future intended routes.
- No dead nav links, placeholder pages, empty category pages, or unsupported feature pages.
- Every public page has a clear primary purpose, distinct content, a relevant internal link path, and a CTA where appropriate.

## Phase 3 — Search crawler, AI crawler, and “no blocker” foundation

**Goal:** Allow reputable search and AI discovery systems to retrieve intended public content without exposing private content or disabling protective controls.

### Bot policy matrix

Implement current official user-agent tokens according to their publisher documentation; review them periodically because identifiers and policies can change.

| Publisher / system | Important user-agent token(s) | Purpose / action |
|---|---|---|
| Google Search | `Googlebot` | Allow public indexable marketing, guide, article, and update pages. |
| Google Images/Video | `Googlebot-Image`, `Googlebot-Video` | Allow assets and pages where image/video discovery is wanted. |
| Google News | `Googlebot-News` | Enable where relevant; do not assume the marketing blog qualifies as a news publisher. |
| Google Ads landing-page checks | `AdsBot-Google` | Allow checks of public landing pages if running Google Ads. |
| Google Gemini/AI usage control | `Google-Extended` | Separate control for how content may be used for Gemini model training/grounding; it does **not** control Google Search inclusion. Choose this explicitly. |
| Microsoft/Bing/Copilot | `bingbot` | Allow public content and verify with Bing Webmaster Tools. |
| OpenAI / ChatGPT search | `OAI-SearchBot` | Allow public pages so they can be surfaced in ChatGPT search. |
| OpenAI user fetch | `ChatGPT-User` | Allow user-requested retrieval of public pages, according to current OpenAI docs. |
| OpenAI training | `GPTBot` | Separate opt-in/out decision; allowing it permits crawling content that may be used to improve/train models. |
| OpenAI ads landing validation | `OAI-AdsBot` | Allow if a relevant ChatGPT advertising use case requires it; it is not a general search-ranking bot. |
| Anthropic / Claude search | `Claude-SearchBot` | Allow public content for Claude search discovery. |
| Anthropic user-requested retrieval | `Claude-User` | Allow public content retrieved in response to user requests. |
| Anthropic training | `ClaudeBot` | Separate opt-in/out decision for potential model-development data collection. |
| Perplexity search | `PerplexityBot` | Allow public pages for Perplexity search-result discovery. |
| Perplexity user-requested retrieval | `Perplexity-User` | Permit public pages where this user-initiated retrieval is appropriate; validate WAF behavior against current official docs. |
| Apple search/discovery | `Applebot`; consider `Applebot-Extended` based on Apple's current docs and chosen data-use policy | Allow relevant public content; treat extended/model-use preferences separately where applicable. |
| Other crawlers | Add only verified, official crawler tokens after checking the publisher's current documentation | Do not invent tokens or trust arbitrary user-agent strings. |

**Default recommendation for maximum public discovery:** Allow major search bots and AI search/user-fetch bots on public pages. Make a conscious, documented choice on model-training crawlers (`GPTBot`, `ClaudeBot`, `Google-Extended`, and any current equivalents) because search visibility and training permission are separate decisions. For this product's public educational/product material, the owner may choose to allow these too; never allow bots access to private customer data just because training is permitted for public content.

### Implementation rules
1. Review actual `robots.txt` generation (for example, the framework's robots route/file) and write one source of truth for allowed public routes, private route exclusions, and sitemap URLs.
2. Every named crawler group must retain required private/API exclusions if specific user-agent rules are used; do not accidentally override wildcard restrictions with a more-specific group.
3. Public CSS/JS/images needed to render/index content must not be blocked.
4. Allow public routes through the CDN/WAF, but do not trust user-agent alone. For verified publisher crawlers that publish IP ranges or verification procedures, use current official verification evidence before adding WAF exceptions.
5. Do not serve different misleading content to users and crawlers; do not use cloaking.
6. Avoid blanket bot blocking or JavaScript challenges on public content that legitimate search/AI crawlers cannot complete. Preserve rate limits against abusive traffic.
7. Test all relevant hostnames (apex, `www`, staging). Staging must remain non-indexable/password-protected; production must not inherit staging `noindex` or robots blocks.
8. Inspect response headers, HTML meta robots, canonical URL, redirect chain, HTTP status, rendering output, robots policy, and sitemap membership per public page.
9. Check route middleware, auth redirects, rate limiting, geoblocking, bot management, CSP/asset loads, and server-side content delivery—not only `robots.txt`.
10. Keep an explicit test list: homepage, every pillar page, blog index, one blog post, updates index/post, RSS feed, sitemap, privacy, terms, sample report, and private app/API routes.

### `llms.txt` policy
A file such as `/llms.txt` can be supplied if there is a separate product or agent integration use case, but it is not a required Google Search signal and must not be described as a ranking boost. It must not replace HTML pages, robots rules, sitemaps, API authentication, or useful content. Do not add it merely to claim “AI SEO complete.”

### Acceptance criteria
- No intended public canonical page is accidentally blocked by robots, meta/header noindex, auth, wrong canonical, 4xx/5xx, or WAF challenges.
- No private data or API is made public for crawler access.
- Public AI/search bots are covered in a versioned policy and verified against real hosting/CDN rules after domain go-live.
- The bot matrix clearly separates search, user-fetch, ads validation, and training roles.

## Phase 4 — Technical SEO, metadata and shared site hooks

**Goal:** Build reusable hooks/components so pages are consistent and no SEO-critical fields are forgotten.

### Centralized site metadata hook/config
Create or refine a central SEO configuration module that owns:
- production `siteUrl` and canonical hostname (never infer canonical from an untrusted Host header);
- defaults for title, description, brand, default social image, locale, and robots policy;
- per-route title/description/canonical/robots values;
- `generateMetadata` or framework-equivalent integration for each page;
- a way to prevent noindex/private metadata leaking into production public routes or vice versa.

### Reusable components/hooks
- Metadata/SEO head integration per route.
- Canonical URL generator.
- Structured-data/JSON-LD helper with schema selection and output validation.
- Breadcrumb component and matching breadcrumb structured data where appropriate.
- Open Graph/social-sharing image and metadata hooks.
- RSS/Atom feed builder and canonical article URL helper.
- Sitemap builder with `lastmod` based on real update timestamps; avoid changing every `lastmod` on every build.
- Analytics event helper with consent-aware behavior and typed event names.
- Consent/ad loading state that prevents unauthorized tracking/ad scripts before consent where required.
- Error/reporting hooks that never send private audit payloads to analytics.
- Optional content freshness/editorial metadata (author, reviewed date, modified date) based on real records.

### Metadata and HTML requirements
- Unique useful `<title>` and meta description for all indexable pages.
- One clear main heading, semantic section hierarchy, useful descriptive link text, descriptive alt text, valid language/locale, and readable content independent of ad code.
- Open Graph/Twitter-compatible social metadata.
- Canonical tags on public canonical routes and deliberate handling of pagination, category filters, UTM parameters, and trailing slashes.
- Valid crawlable `<a href>` links; no SEO-critical navigation that exists only in inaccessible interaction states.
- Use server-rendered or reliably rendered content so titles, headings, article text and important links are available to crawlers.
- Correct `404`, `410`, redirects, and error handling; no soft-404 “success” pages for nonexistent content.

### Structured data
Use only schema types and properties supported by the real content and relevant platform guidelines. Potential types, when accurate: `Organization`, `WebSite`, `WebPage`, `BreadcrumbList`, `Article`/`BlogPosting`, `Person` for real authors, and `VideoObject` for actual videos. Software/application markup can describe the product but is not a promise of a Google rich result. Never fabricate reviews, ratings, authors, dates, FAQ content, logos, or product prices. As of the roadmap date, do not rely on deprecated Google FAQ rich results as a growth strategy.

### Acceptance criteria
- Metadata/JSON-LD tests cover every public route template.
- No duplicated canonical URL confusion, missing public titles, malformed structured data, or fake structured fields.
- JSON-LD agrees with visible page content.
- Lighthouse/field performance and accessibility tests are recorded as diagnostics, not interpreted as guaranteed rankings.

## Phase 5 — Blog, updates/news, RSS and editorial publishing system

**Goal:** Publish original, useful, maintained material; do not make a low-value content farm.

### Blog system
1. Build a fast, accessible `/blog/` index with pagination, categories, article cards, author attribution, publish/update dates, reading time estimates, and meaningful excerpts.
2. Build `/blog/[slug]/` pages with unique title/description, canonical URL, social sharing metadata (Open Graph/Twitter Cards), article schema (`Article` / `BlogPosting` JSON-LD), author profiles, published/modified dates, citations, breadcrumb navigation, and related internal links.
3. Support a structured editorial and publishing workflow:
   `Research & User Need → Keyword & Search Intent → Topic Selection → Outline → Draft → Fact Checking & Evidence Verification → Editorial Review → SEO/GEO/AEO Review → Approval → Staged Publishing → Internal Linking → Distribution → Performance Monitoring → Maintenance & Updates`.
4. Include explicit quality gates: strictly reject thin, repetitive, scraped, spun, or automated generic AI filler without first-hand analysis.
5. Provide rich internal content discovery: related articles, contextual resource suggestions, latest publications, popular guides, and category/tag filtering.
6. Add original, licensed article diagrams and screenshots; optimize format, dimensions, and descriptive alt text for image search indexing.
7. Include prominent, non-deceptive CTAs to run free website audits. CTAs must never masquerade as advertisements or interrupt reading flow.
8. Maintain transparent editorial, correction, and update policies; refresh content when search platform documentation or web standards evolve.

### Topic clusters and audience engagement
Prioritize depth, educational clarity, and practical utility across core clusters:
- Website audit fundamentals: audit scope, evidence, prioritization, what automated checks can/cannot prove.
- Technical SEO: crawlability, indexing, canonicalization, XML sitemaps, robots.txt, redirect hygiene, structured data.
- Performance & Core Web Vitals: lab vs. field metrics (LCP, INP, CLS, FCP, TTFB), render-blocking assets, layout shifts, image optimization.
- Responsive design and usability: mobile horizontal overflow, touch target sizing, semantic hierarchy, accessibility fundamentals.
- Public security hygiene: response headers (HSTS, CSP, X-Content-Type-Options), TLS configuration, cookie flags, limitations of passive scans.
- Generative & Answer Engine Optimization (GEO/AEO): sustainable AI search visibility across ChatGPT Search, Microsoft Copilot, Claude, and Perplexity through direct-answer summaries, entity clarity, structured tables, and primary source citations.
- Audit operations: interpreting Owner Reports, Expert Diagnostics, Cost of Inaction financial modeling, and remediation task tracking.
- Product updates: transparent release notes, verified bug fixes, and platform capabilities.

### Audience engagement without dark patterns
- Contextual related-content recommendations based on topic tags.
- Related tools, checklists, and next-reading pathways.
- Non-intrusive newsletter subscription planning (opt-in with clear privacy disclosure; strictly no invasive popups, modal takeovers, or forced data capture).
- Returning-visitor engagement via saved local audit history and historical comparisons.

### Blog/feed pages and subpages
- `/blog/`
- `/blog/category/[category]/` (only categories with useful description and enough useful entries)
- `/blog/[slug]/`
- `/guides/[slug]/` only if guides are materially different from articles
- `/updates/` and `/updates/[slug]/` for product releases, not scraped general news
- `/feed.xml` or `/rss.xml` for public blog + updates
- `/sitemap.xml` or sitemap index + segmented content sitemaps when useful
- `/news-sitemap.xml` only if SiteIntel Pulse develops genuine, original news publishing and meets Google's news sitemap rules. A product-update blog does not automatically qualify as a news publisher. If used, include only current news articles in the previous two days and update it appropriately.

### AI/GEO/AEO content format
For content likely to answer a real question:
- State the question and direct answer clearly near the top, then explain the evidence and caveats.
- Use descriptive headings, steps, examples, comparison tables, definitions, images/alt text, and links to primary sources where relevant.
- Distinguish facts, first-hand testing, estimates, assumptions, opinions, and unknowns.
- Name real authors/reviewers and show their relevant experience; disclose meaningful AI assistance where it would otherwise mislead readers.
- Include original screenshots/test data/diagrams when safe, useful, and verifiable.
- Link to canonical supporting guides and relevant product features.
- Keep dates accurate; do not change publish dates only to appear fresh.

### Acceptance criteria
- Publishing templates generate clean canonical pages, feed entries, sitemap entries and structured data.
- Posts are human-reviewed, original and source-grounded.
- Feed validates and contains public canonical URLs only.
- No broad auto-generated programmatic SEO page rollout without quality review.

## Phase 6 — Search Engine registration, webmaster tooling, and indexing

**Goal:** Establish measurement and notify search systems without making indexing promises.

### Google Search
1. Verify the production domain property in Google Search Console after domain/DNS is under the owner's control.
2. Submit the sitemap once it is correct; inspect processing status rather than repeatedly resubmitting an unchanged sitemap.
3. Run URL Inspection on representative critical pages. Request indexing only for important new/fixed pages when appropriate.
4. Review Page Indexing, Sitemaps, Core Web Vitals, manual actions/security issues where available, and performance queries/pages/countries.
5. Check that public pages are crawlable and have indexable content; fix unexpected `noindex`, wrong canonical, redirect chains, blocked assets, server failures, and soft 404s.
6. Monitor changes after releases. Search may take time and may choose not to index low-value/duplicate URLs even if technically accessible.
7. Google Search AI features use the same technical/indexing fundamentals. No separate “AI indexing approval” is required; eligibility is not guaranteed.

### Bing and other engines
1. Verify the domain in Bing Webmaster Tools; import verified Search Console property if available.
2. Submit the main sitemap and use URL inspection/site explorer/diagnostics.
3. Evaluate IndexNow for genuinely added, updated, or deleted public URLs, following the protocol and key-file requirements. Do not submit private URLs or every insignificant event.
4. Review Bing's AI Performance reporting if available to the verified property; use citation activity as a diagnostic rather than a ranking guarantee.
5. Consider relevant privacy and index controls for other general search engines; prioritize systems with real target audience/use.

### AI search visibility measurement (GEO / AEO)
- Maintain a controlled, versioned test suite of queries targeting the product and core educational topics.
- Systematically sample citation activity across diverse platforms: ChatGPT Search, Microsoft Copilot, Claude Search, and Perplexity AI.
- Do not assume that crawlers or citation systems operate identically:
  - `OAI-SearchBot` indexes content for ChatGPT Search results, distinct from `GPTBot` (training).
  - `bingbot` feeds the Bing index powering Microsoft Copilot answers and Bing AI Performance metrics.
  - `Claude-SearchBot` and `Claude-User` retrieve sources for Claude's cited answers, separate from `ClaudeBot`.
  - `PerplexityBot` and `Perplexity-User` retrieve and cite live sources for Perplexity answers.
- Separate and track 5 distinct pipeline stages:
  1. Crawler access (HTTP 200 via `robots.txt` allowance).
  2. Indexation status (presence in search/retrieval indices).
  3. Answer citation (source attribution in AI-synthesized responses).
  4. Referral session (inbound referral visit from AI platforms).
  5. Conversion (completed free audit or report download).
- Never claim a single positive AI citation is proof of permanent visibility or search ranking.

### Acceptance criteria
- Search Console and Bing properties verified when possible.
- Sitemaps processed without known errors.
- Indexability audit reports zero known unintended blockers on intended public URLs.
- A repeatable monitoring runbook and baseline exist; tool account setup that requires owner credentials remains explicitly assigned to the owner.

## Phase 7 — Analytics, event hooks, consent and growth funnel

**Goal:** Know what generates useful users without violating privacy.

### Required measurement events (names can match the codebase convention)
- `landing_view` (or page view from analytics platform)
- `audit_started`
- `audit_completed`
- `report_viewed`
- `report_downloaded`
- `report_shared` (only if sharing is a real feature)
- `signup_started` / `signup_completed` if accounts exist
- `referral_visit` / `referred_audit_completed` if referrals are implemented
- `newsletter_subscribed` only if an opt-in newsletter exists

Do not send raw scanned URLs, business private details, report bodies, authorization tokens, or personal data to analytics. Use minimization, defined retention, and consent where required.

### Setup
1. Decide GA4 or an alternative analytics system based on privacy, functionality and compliance; keep Search Console as the source of Google Search query/click/impression data.
2. Add a single typed event layer rather than calling analytics APIs inconsistently across components.
3. Separate marketing consent from essential security/session behavior.
4. Set up conversions, UTM conventions, channel tagging, referral attribution and retention cohorts.
5. Create dashboards for acquisition, landing page engagement, completed audits, report actions, return usage and referrals.
6. Verify events in debug/preview mode before public launch; ensure ad blockers or consent-denied state do not break the site.

### Acceptance criteria
- Test events fire once and only for the correct action.
- No sensitive report or audit data leaks to analytics.
- Consent states control applicable nonessential tags, especially for covered jurisdictions.
- A baseline dashboard distinguishes organic search, organic social, referrals, direct, and paid traffic.

## Phase 8 — Privacy, policy pages, and AdSense readiness

**Goal:** Build a genuinely useful public site suitable for review; do not attempt to game approval.

### AdSense-readiness work
1. Confirm site ownership and the ability to make required source/configuration changes.
2. Ensure the site has original, relevant, sufficiently useful public content and coherent navigation.
3. Complete and verify About, Contact, Privacy, Terms, cookie/consent disclosures where applicable, methodology/disclaimer, and editorial/correction policies. These pages must be accurate, not generic filler copied from another site.
4. Publish a meaningful set of original articles/guides and product information before applying. Do not invent a minimum article count or traffic threshold; Google does not promise approval based on a numerical checklist.
5. Ensure all linked pages exist, work, render correctly, and do not contain placeholders or under-construction filler.
6. Check all content against Google Publisher Policies and AdSense Program Policies, including restricted/prohibited content, copyright, deceptive navigation, malware, and invalid traffic rules.
7. Do not use paid-to-click, click exchanges, traffic exchanges, automated engagement or incentivized ad clicks.
8. Prepare privacy disclosures that accurately explain analytics, cookies, ad serving, data use/sharing, and applicable identifiers.
9. If serving personalized ads to visitors in the EEA, UK, or Switzerland, use a Google-certified CMP integrated with the IAB TCF as required by Google's current consent policy. Assess other applicable laws and user-location needs as well.
10. Keep ads off login, private dashboard, API, scan-in-progress, private report, account settings, and other pages whose main purpose is a private interaction or utility rather than useful editorial content. Initial ad placements should be limited to suitable public editorial/informational pages, with enough substantive page content and clear separation from navigation and CTAs.
11. Do not add ad slots, request a review, or invent publisher IDs until the owner has an actual AdSense account/site setup that supports the steps.
12. After account setup, add the verification code as instructed; add the real publisher line to `/ads.txt` when provided by AdSense; verify it is publicly reachable and valid. Never commit guessed/fake publisher IDs.
13. Apply for review only after the readiness checklist passes. Check the actual AdSense site-status / Policy Center feedback and remediate any stated issue.

### Ad placement, user experience, and operational safeguards
- **Clean Utility Surfaces:** No ads on login screens, scan creation/queue forms, private report viewers, expert workbenches, or API responses. Ad placements are strictly confined to public, content-rich editorial articles and guides.
- **CLS & Core Web Vitals Protection:** All ad slots must have explicit reserved minimum dimensions (min-height and min-width wrappers) to completely eliminate Cumulative Layout Shift (CLS).
- **Zero Deception:** Ads must be explicitly labeled (e.g., "Advertisement" or "Sponsored") and visually separated from article text, navigation menus, CTAs, and report action buttons.
- **Strict Compliance:**
  - Never ask visitors to view or click ads.
  - Never click own ads or use traffic generators/click rings.
  - Strictly prohibit intrusive interstitials, pop-ups, modal blockers, or surprise redirects.
  - Monitor Google AdSense Policy Center, ads.txt status, and invalid traffic diagnostics proactively.

### Acceptance criteria
- Policy page links are visible from site navigation/footer where appropriate and all policies reflect actual behavior.
- A policy and privacy review is complete.
- No ads on private or non-content utility pages; eligible public editorial placements have adequate real content.
- The site is marked “ready to submit” only when every checklist item has evidence. Approval itself can only be determined by Google's review.

## Phase 9 — Free-product distribution and viral loop

**Goal:** Make the free audit genuinely useful and naturally shareable.

### Features to plan
1. An attractive sample report containing synthetic or permissioned data and explaining the evidence.
2. A safe report summary/share card containing only the information the user chose to disclose.
3. Explicit private-by-default report settings; share links must be random/unpredictable, revocable where feasible, and exclude sensitive details.
4. A concise “Run your own audit” link/CTA on public sample guides and share pages.
5. Optional report footer branding or an attribution badge only when the user agrees; it must not be deceptive or forced.
6. Referral tracking that does not manipulate search engagement or ads; reward referrals with product benefit only if the terms are clear and don't reward ad clicks.
7. A feedback prompt after report delivery and a lightweight way to report false positives/bugs.
8. Public case studies only with permission and verified data; redact customer identifiers and security-sensitive details.

### Acceptance criteria
- Share flow is tested for privacy leakage and access control.
- Every public share page has canonical/robots policy and a clear owner action.
- Referral events can be distinguished from fake or automated traffic.

## Phase 10 — Content launch, social distribution and outreach

**Goal:** Start consistent acquisition with a sustainable workload.

### First 30-day content rhythm (adapt to available time)
- One thoroughly researched guide per week.
- Two or three short video/social derivatives per week based on the guide or a real demo.
- One product update only when there is a meaningful actual release.
- One original case study or teardown when permission and evidence permit.
- Weekly outreach to a small number of relevant agencies, freelancers, startup communities, and web professionals with a personalized ask for feedback—not mass spam.

### Channels
- SEO and Search Console (long-term compounding discovery).
- LinkedIn for agency/founder/professional explanations.
- YouTube Shorts / Reels for visible before/after issues and report walkthroughs.
- Relevant communities, with helpful answers and compliance with community promotion rules.
- Product directories and launch communities where audience fit is strong; ensure all descriptions and screenshots are accurate.
- Partnerships with web agencies/freelancers, educators, and technical communities.
- Email/newsletter only with clear opt-in and unsubscribe behavior.

### Acceptance criteria
- Each campaign links to a page that fulfills its promise.
- Traffic quality is measured through engaged visits, audits completed and return/referral usage.
- No unsolicited mass email, link buying, fake reviews, automated engagement, or content scraping.

## Phase 11 — Paid ads and controlled experiments

**Goal:** Buy qualified attention only when the funnel can measure what happens next.

### Preconditions
- Live site/domain and reliable audit completion path.
- Analytics/conversion events validated.
- At least one landing page matched to the target keyword or audience.
- Privacy and cookie/consent behavior reviewed.
- Ad account and billing access controlled by owner.

### Test order
1. Start with a small capped Google Search Ads test for high-intent terms such as free website audit or technical SEO audit; use only the relevant terms actually supported by the product.
2. Exclude irrelevant terms and monitor search-term quality, landing-page experience, and completed-audit cost.
3. Run separate landing page / message tests one change at a time. Do not use a paid click as a successful conversion unless the intended event happens.
4. Test LinkedIn or Meta creatives after organic content identifies messages that resonate.
5. Retarget only where lawful, consented and supported by the chosen platform policies.
6. Scale only when cost per completed useful audit and downstream retention/referral trends justify it.

### Acceptance criteria
- Every paid campaign has a hypothesis, cap, event definition, landing page and stop condition.
- There is no incentivized/automated ad traffic or request for ad clicks.
- No claim of profitability until real spend and conversion data support it.

## Phase 12 — Ongoing SEO, AI visibility, AdSense and product growth governance

**Weekly / after releases**
- Crawl public URLs and detect accidental robots/noindex/canonical/status changes.
- Check logs for verified crawler access, 403/429/5xx, redirect loops, slow responses and WAF challenges.
- Validate sitemap/feed and newly published article metadata.
- Review content accuracy, broken external citations and outdated product screenshots.
- Monitor conversion event health and referral attribution.

**Monthly**
- Review Google Search Console: indexing, queries, pages, impressions, clicks, CTR, position trends, Core Web Vitals and any manual/security actions.
- Review Bing Webmaster Tools and AI Performance citation trends if available.
- Review GA4/analytics acquisition, landing pages, audit start/completion, report actions and return usage.
- Review AdSense Policy Center, ads.txt status, invalid traffic alerts, page experience and ad placement.
- Refresh high-value content where evidence/product behavior has changed; merge or retire pages that are thin, redundant, misleading or no longer useful.
- Review publisher bot-documentation changes and current official IP verification instructions.

**Quarterly**
- Revisit positioning, target audiences, competitor set, keyword-to-page map, editorial quality, privacy/retention and monetization economics.
- Make a deliberate decision on model-training crawler policy and record it.
- Re-evaluate whether the editorial/news output has enough originality to justify scaling volume.

---

# 5. Phased Implementation Sequence & Dependencies

The marketing roadmap is organized into nine sequential, independently verifiable phases aligned directly with platform architecture and governance:

| Phase | Title | Focus & Core Deliverables | Prerequisites & External Dependencies |
| :--- | :--- | :--- | :--- |
| **P0** | **Public Website & Technical SEO Foundation** | Canonical domain fail-safe, Next.js metadata, `/robots.txt`, `/sitemap.xml`, 5 trust pages (`/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer`), private route protection (`noindex`), and security headers. | Local code & build verification. (Completed locally). |
| **P1** | **Search Console, Bing Webmaster & Search Visibility** | Google Search Console domain property verification (DNS TXT), Bing Webmaster Tools setup, sitemap submission, initial crawl inspection, and IndexNow evaluation. | External owner prerequisite: live canonical domain, DNS access, Google & Bing accounts. |
| **P2** | **Blog Architecture & Editorial Infrastructure** | Accessible `/blog/` index, `/blog/[slug]/` template, category pillars, tag taxonomy, author profiles, breadcrumbs, reading time, Open Graph sharing, Article JSON-LD, and valid `/feed.xml`. | Completion of P0 and P1. |
| **P3** | **Content Roadmap & Publishing Workflow** | 14-step editorial governance process (Research → Verification → Review → Approval → Staged Publication), initial 12 original technical guides, and zero-spam quality gates. | P2 publishing infrastructure live. |
| **P4** | **Advanced SEO, GEO & AEO Discovery Engine** | Entity clarity, structured answer summaries, cross-engine AI retrieval verification (`Googlebot`, `bingbot`, `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`), and image search metadata. | P2 and P3 content live. |
| **P5** | **Audience Engagement & Natural Retention** | Contextual related-guide suggestions, tool pathways, ethical opt-in newsletter infrastructure (zero invasive popups), and returning-visitor local audit comparison. | P2 and P3 live. |
| **P6** | **Analytics & Organic Funnel Optimization** | Privacy-conscious event tracking (GA4/alternative), consent mode governance, organic traffic dashboards, and conversion measurement (audit start to completed report). | Live domain and owner analytics property. |
| **P7** | **Google AdSense Readiness Assessment** | Comprehensive pre-submission audit: navigation integrity, original content depth, privacy disclosures, mobile usability, and Google Publisher/Program policy compliance check. | Substantive original content published; verified organic traffic. |
| **P8** | **Authorized AdSense Integration & Compliance** | Post-approval implementation: ads.txt publication, reserved-dimension ad slots (zero CLS), non-deceptive labels, and exclusion of private report/auth screens. | External prerequisite: formal Google AdSense account approval. |

# 6. Search-blocker audit checklist for every intended public URL

Use this list as a strict release checklist, not a general suggestion list.

- [ ] Final production URL resolves to the intended HTTPS canonical host.
- [ ] Final response code is correct (normally 200 for a valid public page).
- [ ] No unexpected robots.txt disallow rule applies.
- [ ] No unexpected meta robots or `X-Robots-Tag` directives block indexing/snippets.
- [ ] Canonical points to the same intended URL (or a justified canonical target).
- [ ] Page is not accidentally behind auth, CAPTCHA, JS challenge, region wall or consent wall that prevents crawlers from reading its main content.
- [ ] WAF/CDN/firewall/rate limit does not block verified publisher crawler traffic on public routes.
- [ ] Main article/product text and links render; metadata is valid and not just default template content.
- [ ] CSS/JS/images required for correct rendering can load.
- [ ] Sitemap includes the canonical URL and no private/redirect/noindex pages.
- [ ] RSS feed includes only public canonical posts/updates.
- [ ] No staging hostname, duplicate host variant, or preview deployment is accidentally indexable.
- [ ] Private dashboard, private report, account, admin, API and callback routes remain protected and are not in sitemaps.
- [ ] The public route passes a representative crawler fetch and real browser rendering test.
- [ ] Search Console URL Inspection / Bing URL Inspection are checked after domain live; any reported issue is triaged.

**Pass definition:** zero *known unintended* blockers on the intended public route list. Search indexing is an external decision and remains unguaranteed.

# 7. AdSense pre-submission checklist

- [ ] Site owner controls the domain and site source/configuration.
- [ ] Original, useful content exists beyond short promotional text and thin automated pages.
- [ ] Clear navigation and working internal links across the public site.
- [ ] Homepage accurately describes the tool and takes visitors to a working experience.
- [ ] About, Contact, Privacy, Terms, and other relevant disclosures are accurate and visible.
- [ ] Methodology, limitations, editorial standards and authorship are honest and verifiable.
- [ ] No copied/scraped article archive, content farm, placeholder pages or unsupported product claims.
- [ ] No prohibited/restricted content or infringing material in content, comments or media.
- [ ] No deceptive navigation, ad placements resembling controls, pop-ups that interfere, malware or unwanted redirects.
- [ ] No invalid traffic, click exchange, paid-to-click, self-clicking, incentivized ad clicks or bot inflation.
- [ ] A privacy policy describes actual ad/analytics cookies, data collection and sharing; regional consent obligations are fulfilled.
- [ ] If applicable, a Google-certified TCF CMP is configured for personalized ads to EEA/UK/Swiss users under current Google policy.
- [ ] Ads are restricted to suitable content pages; private app/dashboard/report and content-light utility screens are excluded by default.
- [ ] Account setup and site review are completed through AdSense's official workflow.
- [ ] `ads.txt` is published only with the real publisher information provided by AdSense, and its status is checked.
- [ ] Site review feedback is addressed; no claim of approval until AdSense actually marks the site ready.

# 8. Recommended content backlog (first 12 originals)

1. What a Website Audit Can—and Cannot—Tell You
2. A Practical Website Audit Checklist for Small Businesses
3. How to Read a Website Health Report and Prioritize Fixes
4. Technical SEO: Crawlability, Indexing, Canonical URLs and Sitemaps
5. Robots.txt vs Noindex: How to Avoid Accidental Search Blocks
6. Lab Performance vs Real-User Core Web Vitals: What the Numbers Mean
7. How to Investigate Mobile Horizontal Overflow
8. What Missing Security Response Headers Mean (and What They Do Not Prove)
9. How to Validate an SEO Finding Before Paying to Fix It
10. GEO and AEO Explained: Sustainable AI Search Visibility Without Hacks
11. How to Interpret Unknown, Not Tested and Blocked Audit Results
12. SiteIntel Pulse Methodology: Evidence, Scoring, Limitations and Remediation Estimates

Every article must have original explanation, cited primary sources, examples/screenshots where useful, a real author/reviewer, useful internal links, a clear reviewed date when material, and an appropriate product CTA. The article list is a backlog, not permission to auto-publish all 12 without review.

# 9. Implementation workflow for the engineering agent

The roadmap must be implemented in gates rather than a single uncontrolled request.

1. **Audit-only gate:** Inspect current routes/files and mark each roadmap item `PASS`, `FAIL`, `MISSING`, or `NOT TESTABLE YET`. Do not modify code during this gate.
2. **P0 implementation gate:** Fix existing unintended blockers, protect private paths, implement the real robots/sitemap/canonical/metadata controls, and create required trust/policy pages based on actual behavior.
3. **P0 verification gate:** Run unit/integration/e2e/build checks; run URL/crawler checks against local or staging; give evidence for every public route. Confirm accepted report artifacts remain unchanged.
4. **Content engine gate:** Implement blog/update/RSS templates and editorial metadata; test one sample article end-to-end before bulk content creation.
5. **Search/analytics gate:** Integrate hooks and provide configuration instructions. Account verification and domain/DNS actions requiring user access must be listed for the site owner rather than falsely marked complete.
6. **AdSense readiness gate:** Run the full pre-submission checklist; do not insert production ad code or invent publisher IDs before the owner has completed account setup.
7. **Growth gate:** Launch a small measured content/partner test; add paid ads only after conversion tracking and landing pages pass.
8. **No silent scope changes:** Do not change unrelated application logic, dependency versions, accepted scan results or artifact files as part of marketing work without a concrete requirement and regression proof.

## 10. Official policy and technical references

Use these primary sources for implementation and re-check them before launch because policies and crawler details can change.

### Google Search, AI Search and crawling
- Google Search AI optimization guide: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google Search technical requirements: https://developers.google.com/search/docs/essentials/technical
- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Helpful, reliable, people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Crawling/indexing documentation: https://developers.google.com/search/docs/crawling-indexing
- Google crawler list and behavior: https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
- Google-Extended details: https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
- Search Console setup: https://developers.google.com/search/docs/monitor-debug/search-console-start
- News sitemap guidance (only if genuinely applicable): https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
- Google documentation changes: https://developers.google.com/search/updates

### Search and AI crawler policies
- OpenAI crawlers: https://developers.openai.com/api/docs/bots
- Anthropic crawler policy: https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- Perplexity crawlers: https://docs.perplexity.ai/docs/resources/perplexity-crawlers
- Bing Webmaster Tools: https://www.bing.com/webmasters
- IndexNow: https://www.indexnow.org/
- Bing AI Performance announcement/context: https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/

### Google AdSense and privacy
- AdSense eligibility: https://support.google.com/adsense/answer/9724
- AdSense site readiness: https://support.google.com/adsense/answer/7299563
- AdSense Program policies: https://support.google.com/adsense/answer/48182
- Google Publisher Policies / privacy disclosures: https://support.google.com/adsense/answer/10502938
- Consent requirements for EEA/UK/Switzerland: https://support.google.com/adsense/answer/13554116
- AdSense site status: https://support.google.com/adsense/answer/12170222
- ads.txt implementation: https://support.google.com/adsense/answer/12171612
- AdSense account setup: https://support.google.com/adsense/answer/7402256

## Final success criteria

The roadmap is successfully implemented when:
1. The public site is clearly positioned and its key flows work.
2. All intended public pages are documented and pass the zero-known-unintended-blockers checklist.
3. The approved AI/search bot policy is implemented and verified at both robots and hosting/WAF layers.
4. Metadata, canonicals, structured data, feeds, sitemaps and internal links are tested.
5. The blog/update publishing workflow supports original, edited, maintainable content.
6. Search Console, Bing Webmaster Tools, and analytics are configured when the owner has live-domain access.
7. Privacy/consent and AdSense policies are reviewed, and ad placement is restricted to suitable public content pages.
8. The initial organic/referral launch can be measured and paid acquisition has a budget cap and stop conditions.
9. Remaining external actions—DNS/domain, account verification, user consent configuration, actual AdSense review—are listed clearly and never falsely marked as completed.

**Explicit non-guarantees:** no implementation can guarantee Google indexing, first-page ranking, AI citations, viral growth, revenue, or AdSense approval. The objective is to remove controllable blockers, publish genuinely valuable content, maintain compliance, and measure real results.
