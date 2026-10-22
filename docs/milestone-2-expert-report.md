# SiteIntel Pulse — Milestone 2: Company B Expert Diagnostic & Growth Intelligence Report

## 1. Executive Mission & Dual-Audience Architecture

SiteIntel Pulse is built on a shared, deterministic evidence and scoring foundation that projects into two distinct personas:

| Attribute | Company A: Website Owner Report (`/owner-report`) | Company B: Expert Diagnostic Workbench (`/expert-audit`) |
| :--- | :--- | :--- |
| **Target Audience** | Founders, Executives, E-commerce Managers | SEO Consultants, Developers, UX Designers, Security Engineers |
| **Tone & Vocabulary** | Business impact, visibility, conversion risks | Root cause, DOM selectors, network traces, remediation steps |
| **Technical Depth** | Executive scorecards, high-level opportunity themes | Page-level inventories, 19 diagnostic sections, rule-level ledger |
| **Action Plan** | Strategic growth & trust roadmap | Specialist workstreams (P0-P3, estimated hours, validation steps) |
| **Deliverables** | A4 Executive PDF Report | A4 Diagnostic PDF, CSVs (Findings, URLs, Tasks), JSON Bundle |

---

## 2. The 19 Integrated Diagnostic Sections

The Company B Workbench (`/expert-audit`) implements 19 integrated diagnostic sections:

1. **Cover & Executive Summary**: Target domain, platform name, composite 100-point score, catalogue coverage %, issue triage (Critical, High, Medium, Low), and total workstream hours.
2. **Scope & Execution Parameters**: Max crawl budget, depth, duration, concurrency, DNS/SSRF safety, and passive vs authorized dynamic mode indicator.
3. **Platform Profile & Stack**: CMS category, frontend frameworks, edge CDN/server signatures, and AI assistance integrations.
4. **56-Rule Assessment Score Ledger**: 11 categories with explicit denominators (`earnedPoints`, `allocatedWeight`, `scorePercentage`, `coveragePercentage`, and threshold eligibility).
5. **Discovered Page Inventory & URL Diagnostics**: Paginated table with text search, indexability filters (Indexable, Noindex, Canonicalized), status code filters (200, 3xx, 4xx/5xx), response time (ms), canonical target, headings outline, and word counts.
6. **Technical SEO Deep-Dive**: Title/meta length validation, H1-H6 heading hierarchy outline, Open Graph tags, and Schema.org JSON-LD entity viewer.
7. **Link Architecture & Orphan Analysis**: Internal vs outbound links, broken links ledger (404/500 targets), redirect targets, anchor text distribution (empty, generic, descriptive), and orphan page candidates.
8. **Core Web Vitals & Lab Diagnostics**: TTFB, FCP, LCP, CLS, INP lab estimates, render-blocking scripts/stylesheets table, and asset optimization breakdown.
9. **Responsive Multi-Viewport Matrix**: Synthetic emulation across 7 screen resolutions (320px, 375px, 414px, 768px, 1024px, 1280px, 1440px), horizontal overflow detection, touch target compliance (&ge;48x48px), and layout clipping.
10. **Public Security Configuration**: HTTP security headers table (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), observed directives, exploitability notes, and recommended remediations.
11. **Authentication Posture & Session Controls**: Discovered public login/register/reset endpoints, HTTPS enforcement, CSRF tokens, session cookie flags (Secure, HttpOnly, SameSite), and explicit boundaries for untested deep RBAC penetration tests.
12. **Content Quality Diagnostics**: Total analyzed body words, average words per page, and thin content warning table (&lt;300 words).
13. **GEO, AEO & AI Readiness**: Robots.txt AI crawler policies (GPTBot, ClaudeBot, CCBot), direct answer readiness (FAQPage, HowTo schema), and llms.txt availability.
14. **Analytics, Tags & Consent Integrations**: Google Analytics 4, Google Tag Manager, Meta Pixel, and Consent Management Platform (CMP) detection with status badges (`DETECTED`, `NOT_DETECTED`, `CONSENT_GATED`).
15. **Conversion & UX Flow Diagnostics**: Above-the-fold primary CTA visibility, HTML5 form accessibility, and customer support contact channels.
16. **Competitor Benchmark Analysis**: Multi-domain comparative baseline table against industry competitors with live crawl data provenance.
17. **Diagnostic Finding Ledger**: The core diagnostic tool featuring real-time search, multi-facet filtering (Category, Severity, Status, Workstream), sorting (Severity, Status, Category, Rule), and expandable details (DOM selectors, discrepancy, technical impact, business impact, remediation, validation procedure).
18. **Specialist Remediation Action Plan**: Actionable tasks organized into specialist workstreams (`seo`, `performance`, `security`, `accessibility`, `analytics`, `content`, `ai_automation`, `engineering`), priority badges (P0-P3), estimated effort (`QUICK_FIX`, `MODERATE`, `COMPLEX`, `STRATEGIC`), estimated hours, execution steps, and engineering validation procedures.
19. **Export Manifest & Cryptographic Sign-Off**: SHA-256 integrity checksum, export manifest ID, auditor sign-off, and one-click export triggers.

---

## 3. Data Integrity & Redaction Policy

- **Zero Metric Fabrication**: No artificial revenue, traffic, backlinks, or search rankings are fabricated. Unavailable external integrations are honestly reported as unavailable.
- **Redaction of Sensitive Secrets**: All authorized testing account credentials, session tokens, and repository tokens are redacted (`test_auditor_***`, `s3cr3t_***`) before being stored, displayed, or exported.
- **Passive vs Active Disclosure**: Clear boundary alerts distinguish non-destructive public web crawling from authorized authenticated penetration testing.

---

## 4. Multi-Format Export Endpoints

| Route | Format | Output |
| :--- | :--- | :--- |
| `/api/scan/expert-pdf?id={id}` | PDF / HTML | Print-ready A4 Expert Diagnostic Report rendered via Playwright Chromium |
| `/api/scan/expert-export?id={id}&format=csv_findings` | CSV | Technical diagnostic findings ledger with DOM elements, discrepancy, and impacts |
| `/api/scan/expert-export?id={id}&format=csv_inventory` | CSV | Full discovered URL inventory with status, canonicals, titles, and word counts |
| `/api/scan/expert-export?id={id}&format=csv_remediation` | CSV | Workstream remediation tasks with priority, effort, steps, and validation |
| `/api/scan/expert-export?id={id}&format=json` | JSON | Complete 19-section ExpertReport JSON bundle |
| `/api/scan/expert-export?id={id}&format=manifest` | JSON | Cryptographic integrity manifest with SHA-256 checksum and summary stats |

---

## 5. Verification Results

- **TypeScript Typecheck (`npm run typecheck`)**: Exit code 0 (zero errors).
- **ESLint (`npm run lint`)**: Exit code 0 (zero warnings, zero errors).
- **Vitest Unit Tests (`npm run test`)**: 13 test files, 62 passed tests (100% pass rate).
- **Playwright E2E Tests (`npm run test:e2e`)**: 33 tests across Desktop Chrome, Tablet Chrome, and Mobile Chrome (100% pass rate).
- **PDF Generation Test (`npm run test:pdf`)**: Generated both Milestone 1 Owner Report PDF (88 KB) and Milestone 2 Expert Diagnostic PDF (107 KB) successfully.
- **Production Build (`npm run build`)**: Next.js 15 App Router production bundle compiled successfully with all static and dynamic routes.
