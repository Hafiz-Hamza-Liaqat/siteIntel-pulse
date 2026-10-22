# SiteIntel Pulse — Website Intelligence & Growth Audit Platform

> **Discover Issues. Prove with Evidence. Improve. Grow.**

[![Node.js](https://img.shields.io/badge/node-%3E%3D22.5.0-brightgreen.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue.svg)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/SQLite-WAL%20(node%3Asqlite)-lightgrey.svg)](https://nodejs.org/api/sqlite.html)
[![Showcase](https://img.shields.io/badge/Showcase-GitHub%20Pages-teal.svg)](https://hafiz-hamza-liaqat.github.io/siteintel-pulse/)

SiteIntel Pulse is a secure, multi-tenant, evidence-based website intelligence and growth audit platform. It accepts a public domain or HTTP/HTTPS URL, discovers pages within strict, safe crawler bounds, collects verifiable technical evidence, and produces tailored reports for two distinct audiences:

1. **Company A (Website Owner):** Business-oriented, opportunity-focused Owner Report translating complex technical metrics into executive summaries, high-level impact themes, and visual strategic roadmaps.
2. **Company B (Technical Specialists & Agencies):** In-depth Expert Diagnostic Workbench providing a 19-section diagnostic view, Finding Explorer with search/triage filters, crawl inventory, interactive 11-category remediation planner with role assignment and SQLite persistence, engineering CSV exports, and multi-page technical PDFs.

🌐 **Static Project Showcase:** [https://hafiz-hamza-liaqat.github.io/siteintel-pulse/](https://hafiz-hamza-liaqat.github.io/siteintel-pulse/)  
*(Note: The GitHub Pages site is a static design showcase and documentation preview. It does not perform active backend scanning or database operations).*

---

## Key Capabilities

- **Dual-Audience Report Projections:** Seamless switching between Company A Owner views (`/owner-report`) and Company B Expert Diagnostic Workbench (`/expert-audit`).
- **Canonical 56-Rule Assessment Engine:** Deterministic evaluation across 11 audit categories totaling exactly 100 maximum points.
- **Strict Provenance & Honest Scoring:** Explicit mathematical separation between points earned, applicable tests evaluated, category coverage percentages, and provisional score indicators. Unconfigured external providers (PageSpeed, Google Search Console, Analytics) are honestly reported as unavailable without synthetic fabrication.
- **Enterprise Multi-Tenant Security:** Server-side tenant isolation enforced across all 15 API route handlers, OWASP-aligned 220,000-iteration PBKDF2-HMAC-SHA-512 password hashing with automatic legacy upgrade, durable SQLite login rate limiting (preventing DoS lockouts), and production staging seed lockouts.
- **Defense-in-Depth Crawler Safeguards:** Strict SSRF DNS validation (rejecting loopback, RFC 1918 private IPv4/IPv6, and link-local cloud metadata endpoints like `169.254.169.254`), 2 MiB per-page decompression limits, 50 MiB total scan budget, depth caps (3), and concurrency throttling.
- **Durable Disk Persistence & Backup:** Relational schema backed by native Node.js 22 `node:sqlite` in Write-Ahead Logging (`WAL`) mode. Online hot backups powered by SQLite `VACUUM INTO` and safe disaster recovery tools.
- **High-Fidelity PDF & Data Exports:** Headless Chromium rendering via Playwright streaming binary PDFs for both Owner and Expert reports, alongside 56-finding CSV remediation spreadsheets and raw scan JSON.

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

## Architecture & Technology Stack

```
SiteIntel Pulse Architecture
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js 15 App Router & React 19                    │
├───────────────────────────────────┬────────────────────────────────────┤
│    Company A: Owner Report        │    Company B: Expert Workbench     │
│    (/owner-report)                │    (/expert-audit)                 │
│    • Executive Summaries          │    • 19 Diagnostic Sections        │
│    • 13 Dashboard Cards           │    • Finding Explorer (Triage)     │
│    • Visual Strategic Roadmap     │    • Interactive Remediation Plan  │
│    • Executive PDF Export         │    • CSV Finding Logs & 8-Page PDF │
├───────────────────────────────────┴────────────────────────────────────┤
│                      Audit & Scoring Engine                            │
│    • 56 Deterministic Rules across 11 Categories (100 Points Total)   │
│    • Coverage Thresholds (60% Minimum) & Provisional Scoring Badges    │
├────────────────────────────────────────────────────────────────────────┤
│                     Crawler & Security Sandbox                         │
│    • SSRF DNS Resolution Filtering (Private IP & AWS Metadata Blocking)│
│    • Page & Byte Budgets (50 Pages, 50 MiB Max Scan Cap)              │
│    • Playwright Headless Chromium PDF Generator                        │
├────────────────────────────────────────────────────────────────────────┤
│                     Durable Persistence & Auth                         │
│    • Node.js 22 Native SQLite (DatabaseSync) with WAL Mode & Acid Trans│
│    • Multi-Tenant Isolation across all 15 API Route Handlers           │
│    • OWASP PBKDF2 (220,000 Iterations) & Durable Login Rate Limiting   │
│    • Safe Online Hot Backup (VACUUM INTO) & Automated Disaster Recovery│
└────────────────────────────────────────────────────────────────────────┘
```

- **Frontend & Full-Stack Framework:** Next.js 15.1.7 (App Router), React 19, Tailwind CSS 3.4.
- **Runtime:** Node.js >= 22.5.0 LTS (utilizing native `node:sqlite`).
- **Database:** SQLite with Write-Ahead Logging (`WAL`), `PRAGMA busy_timeout = 5000;`, and relational foreign keys.
- **Authentication:** PBKDF2-HMAC-SHA-512 (220,000 iterations), HttpOnly session cookies, API tokens with SHA-256 hashes.
- **PDF Generation:** Playwright headless Chromium streaming A4 PDFs.

---

## Local Setup & Quickstart

### Prerequisites
- **Node.js:** `>=22.5.0` LTS
- **npm:** `>=10.0.0`
- **Operating System:** Linux, macOS, or Windows (Docker is **not** required).

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
Ensure `SESSION_SECRET` is populated with a random string of at least 32 characters in production. (In development mode, safe local defaults are used automatically).

### Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the landing page.

---

## Verification & Test Suite

SiteIntel Pulse maintains a strict, zero-regression test suite:

```bash
# 1. Strict TypeScript compilation check (noEmit)
npm run typecheck

# 2. ESLint static analysis (Next.js Core Web Vitals)
npm run lint

# 3. Unit and integration tests (20 test files, 116 tests)
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

## Database, Backup & Recovery

SiteIntel Pulse stores data durably on disk at `./data/siteintel.db` (configurable via `DATABASE_PATH`).

### 1. Online Hot Backup
Creates a non-blocking snapshot using SQLite `VACUUM INTO` while WAL mode is active:
```bash
npm run db:backup
# Creates timestamped backup under ./backups/siteintel-backup-YYYY-MM-DD.db
```

### 2. Disaster Recovery / Restoration
Restores a verified backup snapshot and clears stale target WAL/SHM artifacts:
```bash
npm run db:restore ./backups/siteintel-backup-YYYY-MM-DD.db ./data/siteintel.db
```

### 3. Automated Verification
Executes an end-to-end integration test creating sample tenants, uncheckpointed WAL records, running an online backup, dropping the database, restoring, and asserting 100% data fidelity:
```bash
npm run db:verify
```

---

## Deployment & Hosting Requirements

SiteIntel Pulse is designed for **native Node.js execution** without requiring Docker.

### Recommended Hosting Topologies
- **Single-Node Linux VPS (Ubuntu/Debian systemd):** Node.js >=22.5.0 with persistent local SSD storage. (See [`docs/native-node-deployment.md`](docs/native-node-deployment.md)).
- **Container PaaS with Persistent Disks:** Fly.io, Render, Railway, or AWS ECS with mounted persistent volumes (`ReadWriteOnce`).

### Incompatible Architectures (Documented Honestly)
- **Stateless Serverless Functions (e.g. AWS Lambda, standard Vercel Serverless):**  
  *Reason:* SQLite WAL requires a persistent, POSIX-compliant read-write filesystem. Ephemeral lambda execution filesystems reset between invocations, leading to database truncation or lock conflicts. (For horizontally scaled serverless environments, an external PostgreSQL/Supabase database adapter must be configured via `DATABASE_URL`).

---

## Security & Ethical Scanning Policy

- **Non-Invasive Observation:** Crawls evaluate public HTTP/HTTPS responses without injecting exploits, brute-forcing parameters, or submitting mutating form actions.
- **SSRF Defense:** Evaluates and resolves target domains prior to socket connection, blocking loopback (`127.0.0.0/8`, `::1`), private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud link-local metadata endpoints (`169.254.169.254`).
- **Crawler Bounds:** Default limit of 50 pages (hard cap 100), max crawl depth of 3, 2 MiB per-page decompression limit, 50 MiB total scan limit, concurrency cap of 3.
- **Tenant Isolation:** Enforced on all scan status, report views, remediation task updates, and export downloads.

---

## Repository Documentation

- [`docs/native-node-deployment.md`](docs/native-node-deployment.md): Comprehensive no-Docker deployment runbook.
- [`docs/assessment-catalogue.md`](docs/assessment-catalogue.md): Complete 56-rule catalogue definitions and point allocations.
- [`docs/architecture.md`](docs/architecture.md): Full architectural overview and database schema.
- [`docs/staging-deployment-runbook.md`](docs/staging-deployment-runbook.md): Production operational procedures and checklists.
- [`docs/milestone-4.1-container-acceptance.md`](docs/milestone-4.1-container-acceptance.md): Release candidate verification report.

---

## License

Private & Proprietary. All rights reserved.
