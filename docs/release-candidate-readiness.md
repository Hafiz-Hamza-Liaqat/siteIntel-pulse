# SiteIntel Pulse — Canonical Release Candidate Readiness & Preflight Audit

**Project:** SiteIntel Pulse — Website Intelligence & Growth Audit Platform
**Repository:** `https://github.com/Hafiz-Hamza-Liaqat/siteintel-pulse`
**Preflight Starting Baseline:** `1eeea94c4a4c6c9b4fb69e44b595665c4e1dc0f8` (GitHub Actions Run [40254925772](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40254925772), `conclusion: success`)
**Published Staging-Hardening Commit:** `d82d755cadea25adcfbd829c2783349feacadb99` (GitHub Actions Run [40256871873](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40256871873), `conclusion: success`)
**Release Preflight Follow-Up:** Current Working Tree / HEAD (see Section 1 for lineage)
**Static Showcase URL:** `https://hafiz-hamza-liaqat.github.io/siteintel-pulse/`
**Document Status:** `AUTHORITATIVE RELEASE CANDIDATE AUDIT — STAGING PREFLIGHT COMPLETE`
**Launch Status:** **`NOT PUBLICLY LAUNCHED — STAGING DEPLOYMENT PENDING`**

---

## 1. Executive Summary & Release Status

This canonical readiness document consolidates all preceding milestone audits and verification reports (`docs/final-release-readiness-audit.md`, `docs/milestone-4-staging-release.md`, `docs/milestone-4.1-container-acceptance.md`, `docs/staging-acceptance-report.md`, and `docs/public-audit-acceptance.md`).

The SiteIntel Pulse codebase has achieved **Release Candidate (RC)** status. All core engine capabilities, catalogue rules, persistence mechanics, multi-tenant isolation barriers, pinned egress network safety, and bounded truncation truthfulness have been fully implemented and verified locally and in GitHub Actions CI.

### 1.1 Release Candidate Commit Lineage & CI Records
- **Preflight Starting Baseline:** `1eeea94c4a4c6c9b4fb69e44b595665c4e1dc0f8`
  GitHub Actions CI Run [40254925772](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40254925772) (`conclusion: success`, all 7 quality gates passed).
- **Published Staging-Hardening RC Commit:** `d82d755cadea25adcfbd829c2783349feacadb99`
  Hardened Docker Compose security (`127.0.0.1:3000` loopback port binding, mandatory `SESSION_SECRET` interpolation), updated runbooks, and introduced focused staging security tests.
  GitHub Actions CI Run [40256871873](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40256871873) (`conclusion: success`, all 7 quality gates passed).
- **Final Staging Preflight Reconciliation Commit:** Working Tree / Current HEAD
  Reconciled runbook placeholders, eliminated literal fake secrets, documented the production-mode account provisioning blocker, and converted document cross-references to repository-relative links. Follow-up CI will verify this state upon publication.

> [!IMPORTANT]
> **Static Showcase vs. Dynamic Scanning Backend Distinction:**
> - **Public GitHub Pages Site (`https://hafiz-hamza-liaqat.github.io/siteintel-pulse/`):** Functions solely as an informational static showcase presenting architecture documentation, interactive UI diagrams, catalogue rule definitions, and report previews.
> - **Dynamic Scanning Backend:** The full-featured auditing backend requires a Node.js (>=22.5.0) runtime with native `node:sqlite` WAL persistence, Playwright headless Chromium for PDF generation, and outbound network socket capabilities. It is **100% implemented and verified locally/in CI**, but has **not yet been deployed to external public hosting**.
> - **Operational Reality:** SiteIntel Pulse is **not publicly launched**. Staging preflight is complete, and live acceptance awaits deployment to a staging server.

---

## 2. Implemented & Verified Application Capabilities

### 2.1 Deterministic Assessment Catalogue (56 Rules, 11 Categories, 100 Points)
The platform evaluates 56 deterministic rules across 11 audit categories with a fixed 100-point total:
- **CAT-01:** Technical Health & Crawlability (6 rules, 12 pts)
- **CAT-02:** Technical & On-Page SEO (9 rules, 18 pts)
- **CAT-03:** Performance (5 rules, 10 pts)
- **CAT-04:** Responsive Experience & Accessibility (5 rules, 10 pts)
- **CAT-05:** Public Security Configuration (6 rules, 12 pts)
- **CAT-06:** Observable Authentication Posture (4 rules, 8 pts)
- **CAT-07:** Content Quality & Trust Signals (5 rules, 10 pts)
- **CAT-08:** GEO / AEO & AI-Search Readiness (4 rules, 8 pts)
- **CAT-09:** Analytics & Tracking Readiness (5 rules, 5 pts)
- **CAT-10:** Conversion & Marketing Experience (4 rules, 4 pts)
- **CAT-11:** Competitive Comparison Readiness (3 rules, 3 pts)

### 2.2 Truthfulness Under Bounded Truncation
- **Network & Parser Layer:** Enforces byte limits (`maxBytes`) during streaming responses without buffer overruns. Caller receives explicit `isTruncated` metadata.
- **Rule Truthfulness:**
  - `SEO-03` (Heading Structure): Returns `UNKNOWN` with low confidence when pages are truncated and no definite multi-H1 violation is observed; does not claim single-H1 `PASS` on partial content.
  - `CNT-03` (Trust Signals): Returns `UNKNOWN` with low confidence if `< 3` trust signals are found and any page was truncated; never claims absence on partial crawls.
  - `TCH-05` (Sitemap & Robots.txt): Consumes truncation flags for both `robots.txt` and XML sitemaps, returning honest `UNKNOWN` when directives or URLs could have been truncated.

### 2.3 Single-Report Mutual Exclusivity
- Scan requests require an explicit `reportType: "owner" | "expert"`.
- Backend orchestrator projects and persists only the requested report type into SQLite.
- Opposite report endpoints return HTTP 404 with clear explanatory messages.
- Cached jobs separate results by `reportType`, preventing cross-satisfaction.

### 2.4 Pinned Egress Transport & Network SSRF Boundaries
- Every outbound request (HTML crawling, sitemaps, robots.txt, exposure checks) passes through `pinnedFetch`.
- Resolves DNS addresses up-front and strictly binds the outgoing TCP socket to the validated IP address.
- Defeats DNS rebinding and TOCTOU attacks.
- Rejects private IPv4/IPv6 ranges (RFC 1918, RFC 4193, loopback, link-local, IPv4-mapped IPv6 `::ffff:127.0.0.1`, and cloud metadata `169.254.169.254`).

### 2.5 Security, Authentication & Tenant Isolation
- **Password Hashing:** PBKDF2-HMAC-SHA512 with OWASP-aligned 220,000 iterations; automatic rehashing of legacy hashes upon successful login.
- **Session HMAC Verification:** Sessions signed using HMAC-SHA256 with timing-safe comparison.
- **Production Secret Guard:** `getSessionSecret()` fails startup in production if `SESSION_SECRET` is missing, shorter than 32 characters, or matches any known placeholder.
- **Production Seed Lockout:** Demonstration accounts cannot be seeded in `NODE_ENV=production` under any circumstances (`ALLOW_STAGING_SEEDS=true` is ignored).
- **Client IP Trust Contract:** In production, `extractClientIp` requires the trusted proxy header (`X-Real-IP`) and rejects spoofable `X-Forwarded-For` headers. Missing headers fail safely (HTTP 400 `UNTRUSTED_CLIENT_IP`).
- **Universal Multi-Tenant Isolation:** All database queries enforce tenant boundaries (`tenant_id = ?`). Cross-tenant access is rejected with HTTP 403 Forbidden.

### 2.6 Persistence & Disaster Recovery
- **Durable SQLite with WAL Mode:** Runs on Node.js v22 native `node:sqlite` with Write-Ahead Logging (`WAL`) and foreign key constraints enabled.
- **Atomic Online Backups:** `scripts/backup-database.mjs` executes non-blocking `VACUUM INTO` and validates snapshot integrity via `PRAGMA quick_check;`.
- **Disaster Restoration:** `scripts/restore-database.mjs` purges stale WAL/SHM artifacts and restores database state with 100% fidelity.
- **Health & Readiness Probe:** `GET /api/health` validates database connectivity and returns HTTP 200 without exposing paths or secrets.

---

## 3. Local & CI Quality Gates Evidence

All quality gates have been executed sequentially against the codebase:

| Gate | Execution Command | Result | Verification Notes |
| :--- | :--- | :---: | :--- |
| **Focused Staging Security Tests** | `npx vitest run src/lib/security/staging-preflight-security.test.ts` | **PASS** | 12/12 tests passed (Compose loopback, secret interpolation, IP trust, seed lockout) |
| **Focused Catalogue Integrity Tests** | `npx vitest run src/lib/catalogue/rules-evidence-integrity.test.ts src/lib/catalogue/rules.test.ts` | **PASS** | 36/36 tests passed (13 truncation tests, complete catalogue suite) |
| **Focused Transport Tests** | `npx vitest run src/lib/scanner/pinned-transport.test.ts src/lib/scanner/crawler.test.ts` | **PASS** | 28/28 tests passed (SSRF pinning, budget enforcement, truncation signals) |
| **Gate 1: TypeScript Check** | `npm run typecheck` | **PASS** | Clean `tsc --noEmit` across all components, API routes, and schemas |
| **Gate 2: ESLint Hygiene** | `npm run lint` | **PASS** | 0 warnings, 0 errors |
| **Gate 3: Full Test Suite** | `npm run test` | **PASS** | 29 test files passed, 252/252 tests passed (100% pass rate) |
| **Gate 4: Playwright E2E** | `npm run test:e2e` | **PASS** | 33/33 tests passed across Desktop, Tablet, and Mobile viewports |
| **Gate 5: PDF Verification** | `npm run test:pdf` | **PASS** | Generated & verified Owner PDF and Expert PDF |
| **Gate 6: SQLite Recovery** | `npm run db:verify` | **PASS** | 100% bit-accurate recovery of tenants, users, scan jobs, and reports |
| **Gate 7: Production Build** | `npm run build` | **PASS** | Next.js 15 App Router compiled all 19 static and dynamic routes |
| **Gate 8: Live Scan Validation** | `npx tsx scripts/live-scan-caferemote.mjs` | **PASS** | Live audit of permitted target passed with all catalogue rules intact |
| **Docker Container Runtime** | `docker compose -f docker-compose.staging.yml up` | **NOT RUN** | Docker is not installed on this Windows environment; no simulation performed |

---

## 4. Staging Configuration & Deployment Topology

### 4.1 Target Hosting Topology
SiteIntel Pulse is designed for a **Single-Node Linux VPS** (Ubuntu 22.04/24.04 LTS or Debian 12) or a **Containerized PaaS with Persistent Volumes** (e.g., Fly.io with NVMe volume, Render with persistent disk):

```
+-------------------------------------------------------------+
| Single-Node Staging Host (Ubuntu 22.04 LTS)                |
|                                                             |
|   Public Internet (Ports 80/443)                            |
|          │                                                  |
|          ▼                                                  |
|   ┌───────────────┐  HTTPS / TLS Termination                |
|   │     Nginx     │  Security Headers, Rate Limiting        |
|   │ Reverse Proxy │  Sets: X-Real-IP $remote_addr           |
|   └───────┬───────┘                                         |
|           │ HTTP (127.0.0.1:3000)                           |
|           ▼                                                 |
|   ┌─────────────────────────────────────────────────────┐   |
|   │ SiteIntel Pulse Application (Node.js 22 / Docker)  │   |
|   │ - Bound strictly to 127.0.0.1 (Loopback only)       │   |
|   │ - Validates X-Real-IP, rejects forged headers       │   |
|   │ - Database: /app/data/siteintel.db (SQLite WAL)     │   |
|   │ - Backups:  /app/backups/ (Atomic snapshots)        │   |
|   └─────────────────────────────────────────────────────┘   |
+-------------------------------------------------------------+
```

### 4.2 Staging Security Invariants
1. **No Direct Public Port Exposure:** `docker-compose.staging.yml` binds `127.0.0.1:3000:3000`. The backend port is not reachable directly from the public internet.
2. **Session Secret Interpolation:** Compose configuration requires `${SESSION_SECRET:?...}`. Startup aborts immediately if unset, shorter than 32 characters, or using a default placeholder.
3. **Persistent Disk Volumes:** Named volumes `siteintel_staging_data` and `siteintel_staging_backups` ensure SQLite databases survive container rebuilds and restarts.
4. **Demonstration Seed Lockout:** In `NODE_ENV=production`, `ALLOW_STAGING_SEEDS=false` is enforced. Demo accounts cannot be seeded.

---

## 5. Explicitly Unverified Items & Deployment Blockers

To preserve evidence integrity, the following operational requirements are explicitly recorded as **UNVERIFIED** or **DEPLOYMENT BLOCKERS**:

1. **Docker Container Runtime Acceptance (Unverified):**
   Docker is not installed on the local developer machine. Compose file syntax and configuration interpolation have been verified programmatically and via automated Vitest regression suites, but live container startup, container healthchecks, and internal container PDF rendering have **NOT RUN**.
2. **External Staging Hosting (Unverified):**
   No remote staging virtual machine has been provisioned or credentialed from this workspace.
3. **Production TLS / SSL Termination (Unverified):**
   Let's Encrypt / TLS certificates have not been provisioned on an external domain.
4. **Persistent Storage Across Physical Reboots (Unverified):**
   Verified via automated simulation (`npm run db:verify`), but unverified across a physical host reboot or cloud volume detachment.
5. **Live Staging Host Acceptance (Unverified):**
   Acceptance tests must be run against the live staging URL once deployed.
6. **Deployment Blocker — Named Password Account Provisioning in Production Mode:**
   In `NODE_ENV=production`, staging demonstration accounts are unconditionally blocked from seeding by the production security guard (`seedInitialAccounts()` in `src/lib/auth/seed.ts` and `scripts/seed-staging.mjs`). The only supported account creation flow in production is the **Public Guest Session** (`POST /api/scan`), which dynamically provisions isolated guest tenants. There is currently no administrative CLI tool or API endpoint for provisioning named multi-tenant password accounts under `NODE_ENV=production`. If named accounts are required on the live staging server for password login (`/login`), a dedicated administrative account bootstrap CLI must be implemented as a deployment prerequisite.

---

## 6. Staging Acceptance Runbook Reference

For detailed staging deployment steps, Nginx configuration templates, automated backup cron jobs, and post-deployment acceptance checklists, see:
- [`docs/staging-deployment-runbook.md`](staging-deployment-runbook.md)
- [`docs/native-node-deployment.md`](native-node-deployment.md)
