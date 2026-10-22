# SiteIntel Pulse — Public Live Website Intelligence & Growth Audit Platform

> **Discover Issues. Prove with Evidence. Improve. Grow.**

[![Node.js](https://img.shields.io/badge/node-%3E%3D22.5.0-brightgreen.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue.svg)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/SQLite-WAL%20(node%3Asqlite)-lightgrey.svg)](https://nodejs.org/api/sqlite.html)
[![Showcase](https://img.shields.io/badge/Showcase-GitHub%20Pages-teal.svg)](https://hafiz-hamza-liaqat.github.io/siteintel-pulse/)
[![Tests](https://img.shields.io/badge/Tests-123%20passed%20%7C%2033%20E2E-brightgreen.svg)](https://github.com/Hafiz-Hamza-Liaqat/siteintel-pulse)

SiteIntel Pulse is a secure, persistent, evidence-based website intelligence and growth audit platform. It accepts any public domain or HTTP/HTTPS URL, discovers pages within strict, safe crawler bounds, collects verifiable technical evidence, and produces tailored reports for two distinct audiences:

1. **Company A (Website Owner):** Business-oriented, opportunity-focused Owner Report translating complex technical metrics into executive summaries, high-level impact themes, competitor benchmarks, and visual strategic roadmaps.
2. **Company B (Technical Specialists & Agencies):** In-depth Expert Diagnostic Workbench providing a 19-section diagnostic view, 56-rule Finding Explorer with search/triage filters, crawl inventory, interactive remediation planner with role assignment and SQLite persistence, engineering CSV exports, and multi-page technical PDFs.

🌐 **Static Project Showcase:** [https://hafiz-hamza-liaqat.github.io/siteintel-pulse/](https://hafiz-hamza-liaqat.github.io/siteintel-pulse/)  
*(Note: The GitHub Pages site is a static design showcase and documentation preview. The full interactive scanner runs on native Node.js).*

---

## Public Live Platform & Single-Report Workflow

SiteIntel Pulse is engineered as a publicly usable live audit application:

### 1. Unified Live Intake (`/`)
Visitors can open `/`, choose their report perspective, input any public domain (e.g. `example.com`), and click **Start Owner Audit** or **Start Expert Audit**. Real-time progress displays crawl discovery counts, page testing progress, and active stages.

### 2. Strict Single-Report Invariant
- **Strictly One Report per Scan:** Each audit request generates **exactly ONE** report chosen by the user (`reportType: "owner"` or `reportType: "expert"`). The system never generates or persists both reports for a single request.
- **Dedicated Entry Routes:** `/owner-report` and `/expert-audit` remain available as direct entry points, defaulting to their respective report perspectives.
- **Mutual Exclusivity:** Requesting an Owner Report persists only to `owner_reports`; querying `/api/scan/expert-report` for that scan returns an explicit HTTP 404 explaining the report type. Caching also strictly separates report types so an owner scan cannot satisfy an expert scan.

### 3. Public Guest Sessions with Multi-Tenant Isolation
- **No Registration Required:** Public visitors can run audits immediately without registration.
- **Cryptographic Guest Identity:** The server issues an unpredictable guest identity (`tenant_guest_<timestamp>_<entropy>`) and sets a signed HttpOnly session cookie.
- **Zero Cross-Tenant Tampering:** Guest tenants are isolated at the database query level. Guest B cannot read, download, or modify Guest A's scans, reports, PDFs, CSVs, or remediation tasks.
- **Rate-Limiting Defense:** Both per-tenant quotas (5 scans/hour for guests) and client IP rate limiting (15 scans/hour max) prevent resource exhaustion and cookie-clearing abuse.

---

## Canonical Assessment Catalogue (100 Points Total)

| Category ID | Category Name | Rules Count | Max Points | Core Focus Areas |
| :--- | :--- | :---: | :---: | :--- |
| **CAT-01** | Technical Health and Crawlability | 6 | 12 | HTTPS reachability, redirect loops, robots.txt, sitemaps, internal broken links |
| **CAT-02** | Technical and On-Page SEO | 9 | 18 | Titles, descriptions, H1-H6 outline, canonical consistency, schema, image a11y |
| **CAT-03** | Performance | 5 | 10 | Mobile/desktop lab scores, Core Web Vitals field data, render-blocking assets |
| **CAT-04** | Responsive Experience & Accessibility | 5 | 10 | Viewport tags, horizontal scroll overflow (7 viewports: 320–1440px), touch targets |
| **CAT-05** | Public Security Configuration | 6 | 12 | TLS certificate, security response headers (HSTS, CSP), mixed content, cookies |
| **CAT-06** | Observable Authentication Posture | 4 | 8 | Public auth surfaces, login form transport security, session security flags |
| **CAT-07** | Content Quality and Trust | 5 | 10 | Value proposition clarity, readability structure, ownership/trust signals, thin content |
| **CAT-08** | GEO / AEO and AI-Search Readiness | 4 | 8 | AI bot policies (GPTBot, ClaudeBot), main-text crawlability, structured entity data |
| **CAT-09** | Analytics and Tracking Readiness | 5 | 5 | GA4 tags, Google Tag Manager container, ad pixels, cookie consent banners |
| **CAT-10** | Conversion and Marketing Experience | 4 | 4 | Primary CTA above fold, checkout/lead pathways, form usability, policy transparency |
| **CAT-11** | Competitive Comparison Readiness | 3 | 3 | Competitor definition, comparative health metrics, external market data provenance |
| **Total** | | **56 rules** | **100 pts** | **Deterministic Scoring Baseline** |

### Scoring & Coverage Semantics
- **Category Score Percentage:** `100 * earnedPoints / testedPoints` (score among applicable, evaluated tests).
- **Category Coverage Percentage:** `100 * testedPoints / allocatedWeight` (fraction of category rules actually evaluated).
- **Earned Allocation Percentage:** `100 * earnedPoints / allocatedWeight` (points earned out of total category potential).
- **Provisional Status:** Categories evaluating `< 60%` of their allocated weight are flagged as **Provisional**, informing decision-makers when findings reflect limited crawl discovery.

---

## Security Hardening & Isolation Safeguards

- **OWASP-Recommended Password Hashing:** PBKDF2-HMAC-SHA-512 with 220,000 iterations for stored passwords.
- **Timing-Safe Verification:** Timing-safe comparisons against timing attacks, with transparent legacy rehash migration.
- **SQL Operator Precedence Fixed:** Parenthesized tenant scoping in database queries ensures zero cross-tenant leakage.
- **Staging Seed Protection:** Demonstration accounts strictly locked out when `NODE_ENV=production`.
- **SSRF Defense:** Evaluates and resolves target domains prior to socket connection, blocking loopback (`127.0.0.0/8`, `::1`), private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud link-local metadata endpoints (`169.254.169.254`).
- **Crawler Bounds:** Default limit of 50 pages (hard cap 100), max crawl depth of 3, 2 MiB per-page decompression limit, 50 MiB total scan limit, concurrency cap of 3.

---

## Local Setup & Quickstart

### Prerequisites
- **Node.js:** `>=22.5.0` LTS (utilizing native `node:sqlite`)
- **npm:** `>=10.0.0`
- **Docker is NOT required.**

### Installation
```bash
git clone https://github.com/Hafiz-Hamza-Liaqat/siteintel-pulse.git
cd siteintel-pulse
npm ci
```

### Environment Configuration
Copy the example environment file and configure local values:
```bash
cp .env.example .env
```
Ensure `SESSION_SECRET` is populated with a random 32-byte hex secret (`openssl rand -hex 32`).

### Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the live intake platform.

---

## Verification & Test Suite

SiteIntel Pulse maintains a comprehensive, zero-regression test suite:

```bash
# 1. Strict TypeScript compilation check (noEmit)
npm run typecheck

# 2. ESLint static analysis (Next.js Core Web Vitals)
npm run lint

# 3. Unit and integration tests (22 test files, 123 tests)
npm run test

# 4. Playwright End-to-End browser tests (33 tests across Desktop, Tablet, Mobile)
npm run test:e2e

# 5. Playwright headless Chromium PDF generation verification
npm run test:pdf

# 6. Database backup, restoration, and data fidelity verification
npm run db:verify

# 7. Next.js production build compilation (19 static & dynamic routes)
npm run build
```

---

## Production Deployment & Hosting Runbook

SiteIntel Pulse is designed for **native persistent Node.js execution** without Docker.

### Hosting Requirements
- **Server:** Linux VPS (e.g. Ubuntu 24.04 LTS), 2+ vCPUs, 2+ GB RAM, persistent SSD.
- **Runtime:** Node.js >=22.5.0 LTS.
- **Process Manager:** `systemd` or `pm2`.
- **Reverse Proxy:** Nginx or Caddy with TLS certificates.
- **Storage:** Persistent local POSIX filesystem for SQLite WAL database (`./data/siteintel.db`).
- **See Full Guide:** [`docs/native-node-deployment.md`](docs/native-node-deployment.md).

### Current Status: IMPLEMENTED — HOSTING REQUIRED
The full public live audit platform, single-report generation pipeline, guest session system, tenant isolation, and security controls are 100% implemented and verified locally. Public live production operation requires deploying the application to persistent Node.js hosting.

---

## Repository Documentation

- [`docs/public-audit-acceptance.md`](docs/public-audit-acceptance.md): Complete public audit acceptance report and verification ledger.
- [`docs/native-node-deployment.md`](docs/native-node-deployment.md): Comprehensive native Node.js deployment runbook.
- [`docs/assessment-catalogue.md`](docs/assessment-catalogue.md): Complete 56-rule catalogue definitions and point allocations.
- [`docs/architecture.md`](docs/architecture.md): Full architectural overview and database schema.

---

## License

Private & Proprietary. All rights reserved.
