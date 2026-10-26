# SiteIntel Pulse — Canonical Release Candidate Readiness & Preflight Audit

**Project:** SiteIntel Pulse — Website Intelligence & Growth Audit Platform
**Repository:** `https://github.com/Hafiz-Hamza-Liaqat/siteintel-pulse`
**Preflight Starting Baseline:** `1eeea94c4a4c6c9b4fb69e44b595665c4e1dc0f8` (GitHub Actions Run [40254925772](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40254925772), `conclusion: success`)
**Staging-Hardening RC Baseline:** `d82d755cadea25adcfbd829c2783349feacadb99` (GitHub Actions Run [40256871873](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40256871873), `conclusion: success`)
**Preflight Reconciliation Baseline:** `5b5f52913304d3e07b9affc060c6fa22dbb2a9f7` (GitHub Actions Run [40263026167](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40263026167), `conclusion: success`)
**Production Provisioning Baseline:** `6b5ab864e4287e92dd298bd7912409be6f1d5bb8` (GitHub Actions Run [40265255675](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40265255675), `conclusion: success`)
**Provisioning Hardening Baseline:** `7423ca35de29a9f8c859e10511eac28f51dfb8f7` (GitHub Actions Run [40267531497](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40267531497), `conclusion: success`)
**Static Showcase URL:** `https://hafiz-hamza-liaqat.github.io/siteintel-pulse/`
**Document Status:** `AUTHORITATIVE RELEASE CANDIDATE AUDIT — STAGING PREFLIGHT COMPLETE`
**Launch Status:** **`NOT PUBLICLY LAUNCHED — STAGING DEPLOYMENT PENDING`**

---

## 1. Executive Summary & Release Status

This canonical readiness document consolidates all preceding milestone audits and verification reports (`docs/final-release-readiness-audit.md`, `docs/milestone-4-staging-release.md`, `docs/milestone-4.1-container-acceptance.md`, `docs/staging-acceptance-report.md`, and `docs/public-audit-acceptance.md`).

The SiteIntel Pulse codebase has achieved **Release Candidate (RC)** status. All core engine capabilities, catalogue rules, persistence mechanics, multi-tenant isolation barriers, pinned egress network safety, and bounded truncation truthfulness have been fully implemented and verified locally and in GitHub Actions CI.

### 1.1 Release Candidate Commit Lineage & CI Records
- **Preflight Starting Baseline (`1eeea94`):**
  GitHub Actions CI Run [40254925772](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40254925772) (`conclusion: success`, all 7 quality gates passed).
- **Staging-Hardening RC Baseline (`d82d755`):**
  Hardened Docker Compose security (`127.0.0.1:3000` loopback port binding, mandatory `SESSION_SECRET` interpolation), updated runbooks, and introduced focused staging security tests.
  GitHub Actions CI Run [40256871873](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40256871873) (`conclusion: success`, all 7 quality gates passed).
- **Preflight Reconciliation Baseline (`5b5f529`):**
  Reconciled runbook placeholders, eliminated literal fake secrets, documented the production-mode account provisioning blocker, and converted cross-references to repository-relative links.
  GitHub Actions CI Run [40263026167](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40263026167) (`conclusion: success`, all 7 quality gates passed).
- **Production Provisioning Baseline (`6b5ab86`):**
  Implemented the server-side administrative CLI (`npm run admin:provision-tenant` / `scripts/provision-tenant-owner.mjs`), enforced 64-hexadecimal `SESSION_SECRET` format, and reconciled readiness and runbook procedures.
  GitHub Actions CI Run [40265255675](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40265255675) (`conclusion: success`, all 7 quality gates passed, 30 test files and 272/272 tests passed, 33/33 Playwright tests passed).
- **Provisioning Hardening Baseline (`7423ca3`):**
  Hardened interactive password entry (requiring both `process.stdin.isTTY` and `process.stdout.isTTY`), rejected known public CI test fixtures in production mode, corrected native systemd same-host binding to `127.0.0.1:3000`, resolved native `DATABASE_PATH` to `/var/lib/siteintel/data/siteintel.db`, and implemented non-destructive environment discovery.
  GitHub Actions CI Run [40267531497](https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse/actions/runs/40267531497) (`conclusion: success`, all 7 quality gates passed, 30 test files and 282/282 tests passed, 33/33 Playwright tests passed).
- **Docker Container Packaging & Acceptance Freeze:** Current Working Tree / HEAD
  Packaged Playwright Chromium into the production Docker runner image with non-root execution permissions, decoupled Next.js build-phase static generation from runtime secrets (`NEXT_PHASE=phase-production-build`), enhanced query parameter handling, and instituted the 15-step GitHub Actions container acceptance pipeline (`.github/workflows/container-acceptance.yml`).

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

### 2.7 Secure Production Account Provisioning CLI
- **Tooling:** `npm run admin:provision-tenant` backed by [`scripts/provision-tenant-owner.mjs`](../scripts/provision-tenant-owner.mjs).
- **Operational Model:** Server-side administrative CLI invoked manually via interactive terminal (TTY); never exposed as an HTTP route.
- **Production Hardening:**
  - Requires `NODE_ENV=production`.
  - Enforces a valid 64-character hexadecimal `SESSION_SECRET` matching `openssl rand -hex 32` format; strictly rejects default placeholders and predictable test fixtures.
  - Validates that the database file and migrated schema (`tenants`, `users`) exist prior to execution.
  - Requires both `stdin` and `stdout` to be interactive terminals (`isTTY`); strictly aborts non-interactive, piped, or redirected-output executions before prompting for any password.
  - Reads passwords with masked input (zero terminal echo); rejects passwords passed via command-line arguments or non-interactive streams.
  - Enforces strong password complexity ($\ge 12$ chars, mixed case, digit, symbol, no whitespace) and confirmation matching.
  - Atomically creates the tenant and owner user in a single SQLite transaction with uniqueness checks on slug and email.
  - Assigns strictly the tenant-level `owner` role with zero cross-tenant access.
  - Supports safe environment discovery from `ENV_FILE`, `/etc/siteintel.env`, or `.env.production` without overriding host variables.
  - Outputs only non-sensitive identifiers; passwords and secrets are never printed, stored, or logged.

---

## 3. Local & CI Quality Gates Evidence

All quality gates have been executed sequentially against the codebase:

| Gate | Execution Command | Result | Verification Notes |
| :--- | :--- | :---: | :--- |
| **Focused Account Provisioning Tests** | `npx vitest run src/lib/auth/provision-tenant-owner.test.ts` | **PASS** | 23/23 tests passed (stdin/stdout TTY check, secret validation, atomic transaction, rollback, password non-exposure) |
| **Focused Staging Security Tests** | `npx vitest run src/lib/security/staging-preflight-security.test.ts` | **PASS** | 20/20 tests passed (64-hex secret format, build-phase independence, CI test fixture rejection, placeholder rejection, IP trust contract) |
| **Focused Password Security Tests** | `npx vitest run src/lib/auth/password-security.test.ts` | **PASS** | 17/17 tests passed (220k PBKDF2 iterations, benchmark, session rotation) |
| **Focused Catalogue Integrity Tests** | `npx vitest run src/lib/catalogue/rules-evidence-integrity.test.ts src/lib/catalogue/rules.test.ts` | **PASS** | 36/36 tests passed (13 truncation tests, complete catalogue suite) |
| **Focused Transport Tests** | `npx vitest run src/lib/scanner/pinned-transport.test.ts src/lib/scanner/crawler.test.ts` | **PASS** | 28/28 tests passed (SSRF pinning, budget enforcement, truncation signals) |
| **Gate 1: TypeScript Check** | `npm run typecheck` | **PASS** | Clean `tsc --noEmit` across all components, API routes, and schemas |
| **Gate 2: ESLint Hygiene** | `npm run lint` | **PASS** | 0 warnings, 0 errors |
| **Gate 3: Full Test Suite** | `npm run test` | **PASS** | 30 test files passed, 284/284 tests passed (100% pass rate) |
| **Gate 4: Playwright E2E** | `npm run test:e2e` | **PASS** | 33/33 tests passed across Desktop, Tablet, and Mobile viewports |
| **Gate 5: PDF Verification** | `npm run test:pdf` | **PASS** | Generated & verified Owner PDF and Expert PDF |
| **Gate 6: SQLite Recovery** | `npm run db:verify` | **PASS** | 100% bit-accurate recovery of tenants, users, scan jobs, and reports |
| **Gate 7: Production Build** | `npm run build` | **PASS** | Next.js 15 App Router compiled all 19 static and dynamic routes |
| **Gate 8: Live Scan Validation** | `npx tsx scripts/live-scan-caferemote.mjs` | **PASS** | Live audit of permitted target passed with all catalogue rules intact |
| **Docker Container Runtime Acceptance** | GitHub Actions Pipeline (`container-acceptance.yml`) | **AUTOMATED** | Automated 15-step container runtime pipeline executing on Ubuntu Docker runner (verifies build, healthcheck, loopback binding, in-container PDF scripts, scan execution, `%PDF-` binary magic bytes, container restart persistence, and single-report mutual exclusivity) |

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

## 5. Explicitly Unverified Items & Operational Prerequisites

To preserve evidence integrity, the following operational requirements are explicitly recorded as **UNVERIFIED**:

1. **External Staging Hosting (Unverified):**
   No remote staging virtual machine has been provisioned or credentialed from this workspace. Staging deployment will occur following release candidate freeze.
2. **Production TLS / SSL Termination (Unverified):**
   Let's Encrypt / TLS certificates have not been provisioned on an external domain.
3. **Persistent Storage Across Physical Reboots (Unverified):**
   Verified in container restart tests and automated simulation (`npm run db:verify`), but unverified across a physical host reboot or cloud volume detachment on an external VPS.
4. **Live Staging Host Acceptance (Unverified):**
   Acceptance tests must be run against the live external staging URL once deployed to a host with an assigned domain.

### 5.1 Automated Container Runtime Acceptance Architecture
While Docker is not installed on the local Windows development machine, full runtime container acceptance is automated via `.github/workflows/container-acceptance.yml` running on a standard GitHub-hosted Ubuntu runner. The 15-step pipeline verifies:
1. Rejection of compose commands when `SESSION_SECRET` is unset.
2. Dynamic high-entropy 64-hex secret generation with CI log masking (`::add-mask::`).
3. Production Docker multi-stage build packaging Node 22, native `node:sqlite`, and Playwright headless Chromium.
4. Background container launch and `/api/health` polling to healthy HTTP 200 state.
5. Verification that host published ports are bound strictly to `127.0.0.1` and never exposed on `0.0.0.0`.
6. Successful execution of `scripts/verify-pdf.mjs` and `scripts/verify-expert-pdf.mjs` inside the running container as non-root user `nextjs`.
7. Public scan submission with reverse-proxy trust header (`X-Real-IP: 198.51.100.10`) and cookie jar capture.
8. Polling until scan job transitions to `completed`.
9. Download and binary verification of the generated Owner PDF artifact asserting `Content-Type: application/pdf` and `%PDF-` magic header bytes.
10. Container restart durability verifying persisted SQLite report retrieval and PDF re-download across process restarts.
11. Single-report invariant verification asserting HTTP 404 when querying unrequested report types.

### 5.2 Server-Side Account Provisioning Procedure
The dedicated administrative CLI provides secure tenant-owner provisioning under `NODE_ENV=production`:
- Operators invoke `NODE_ENV=production npm run admin:provision-tenant` (or `docker exec -it siteintel-pulse-staging npm run admin:provision-tenant`).
- For multi-tenant staging acceptance, operators invoke this command twice to provision two distinct tenants:
  - **Tenant 1 (Company A Owner):** e.g. Name: "Company A E-Commerce", Slug: `comp-a`, Role: `owner`.
  - **Tenant 2 (Company B Specialist):** e.g. Name: "Company B Agency", Slug: `comp-b`, Role: `owner`.
- The CLI enforces high-entropy passwords without terminal echo, applies atomic SQLite transactions, and maintains strict cross-tenant boundary isolation. Staging seed lockout in production remains completely intact.

---

## 6. Staging Acceptance Runbook Reference

For detailed staging deployment steps, Nginx configuration templates, automated backup cron jobs, and post-deployment acceptance checklists, see:
- [`docs/staging-deployment-runbook.md`](staging-deployment-runbook.md)
- [`docs/native-node-deployment.md`](native-node-deployment.md)
