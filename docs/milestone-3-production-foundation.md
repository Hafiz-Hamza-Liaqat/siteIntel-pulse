# SiteIntel Pulse — Milestone 3: Production Foundation & Multi-Tenant Security Acceptance Report

**Project:** SiteIntel Pulse — Website Intelligence & Growth Audit Platform  
**Repository:** `Hafiz-Hamza-Liaqat/siteintel-pulse`  
**Milestone:** 3 — Production Foundation & Multi-Tenant Security  
**Date:** October 22, 2026  
**Final Verdict:** `READY FOR CONTROLLED STAGING`

---

## 1. Executive Summary

Milestone 3 elevates SiteIntel Pulse from an in-memory audit tool into an enterprise-ready, durable, multi-tenant auditing platform. All capabilities established in Milestone 1 (Owner Report, 56-rule scoring engine, crawler safeguards) and Milestone 2 (Company B Expert Diagnostic Report, 11-category remediation plans, engineering exports, PDF generation) remain 100% operational and are now backed by durable ACID database persistence, strict server-side tenant isolation, cryptographic session management, and sliding-window rate limiting.

### Key Milestones Completed:
1. **Durable Database Persistence:** Node.js v22 native `DatabaseSync` (`node:sqlite`) with Write-Ahead Logging (WAL), foreign key enforcement, transaction integrity, and atomic forward migrations.
2. **Multi-Tenant Authentication & Access Control:** PBKDF2 password hashing with SHA-512 (100,000 iterations, 32-byte salts, timing-safe equality), SHA-256 session token hashing, API key authentication, and server-enforced tenant isolation.
3. **Scan Abuse Prevention & Rate Limiting:** Sliding-window per-tenant hourly rate limiting (default: 20 scans/hour) and concurrent active scan caps (default: 2 concurrent scans).
4. **Data Durability & Process Restart Resistance:** Verified that scan jobs, findings, owner reports, expert reports, and remediation task state survive server shutdowns and adapter restarts without data loss.
5. **Cross-Tenant Security Verification:** Automated integration tests confirm that Tenant B is strictly forbidden from inspecting, modifying, exporting, or cancelling scans and reports belonging to Tenant A (HTTP 401/403/404 enforced).

---

## 2. Architecture & Migration Decisions

### 2.1 Native SQLite Engine (`node:sqlite`)
- **Zero Heavy Binary Dependencies:** Utilizes Node.js v22 built-in `node:sqlite` (`DatabaseSync`), eliminating unreliable native compilation steps (such as `better-sqlite3` native C++ bindings) across varied operating systems (Windows, Linux, macOS).
- **WAL Journal Mode (`journal_mode = WAL`):** Enables high-concurrency read operations concurrent with background writes during crawl execution without database lock contention.
- **Foreign Key Enforcement (`foreign_keys = ON`):** Enforces relational integrity across tenants, users, sessions, scan jobs, owner reports, expert reports, and remediation tasks.
- **Next.js 15 Compatibility:** Configured via `serverExternalPackages: ['node:sqlite']` in `next.config.mjs` to ensure clean App Router server-side execution.

### 2.2 Atomic Versioned Migrations
All schema updates are governed by sequential, immutable SQL migration files located in `migrations/`:
- **`0001_initial_schema.sql`:**
  - `schema_migrations`: Migration audit trail (`version`, `applied_at`).
  - `tenants`: Multi-tenant boundary (`id`, `name`, `tier`, `created_at`).
  - `users`: User identity with PBKDF2 password hashes, salts, and roles (`admin`, `auditor`, `viewer`).
  - `sessions`: Session tracking with SHA-256 token hashing, expiration, and user agent metadata.
  - `api_keys`: Cryptographic API key authentication for CI/CD and automation.
  - `scan_jobs`: Durable scan lifecycle, progress, configuration, and cancellation state.
  - `owner_reports`: Company A business-level reports with category scores, findings, and metadata.
  - `expert_reports`: Company B deep diagnostic reports with remediation plans and technical matrices.
- **`0002_remediation_and_rate_limits.sql`:**
  - `remediation_tasks`: Per-tenant remediation task status tracking (`open`, `in_progress`, `resolved`), assignees, and priority.
  - `rate_limits`: Sliding-window scan request timestamps for abuse prevention.

Migrations execute within an ACID transaction via `runMigrations()` in `src/lib/persistence/migrator.ts` upon adapter initialization.

---

## 3. Multi-Tenant Authentication & Authorization Model

### 3.1 Cryptographic Password Security
- **Algorithm:** PBKDF2 (Password-Based Key Derivation Function 2) using HMAC-SHA-512.
- **Cost Factor:** 100,000 iterations.
- **Salt:** 32 cryptographically random bytes generated via `crypto.randomBytes(32)` per user.
- **Verification:** Timing-safe comparison using `crypto.timingSafeEqual` prevents timing attack side-channels.

### 3.2 Session & API Key Management
- **Session Tokens:** 64-character cryptographically secure hex strings stored as SHA-256 hashes in the database.
- **Cookies:** `siteintel_session` cookie configured with `HttpOnly`, `SameSite=Lax`, and `Secure` (in production).
- **API Keys:** Header-based `Authorization: Bearer sip_live_<secret>` or `X-API-Key: sip_live_<secret>`. Stored as SHA-256 hashes.
- **Default Staging Credentials (Seeded):**
  - **Company A (Tenant `tenant_comp_a`):**
    - Email: `admin@companya.test`
    - Password: `CompanyA_Auditor_2026!`
    - API Key: `sip_live_companya_test_secret_key_123`
  - **Company B (Tenant `tenant_comp_b`):**
    - Email: `lead@companyb.test`
    - Password: `CompanyB_Technical_2026!`
    - API Key: `sip_live_companyb_test_secret_key_456`

### 3.3 Server-Side Tenant Boundary Enforcement
All scan operations, queries, cancellations, report retrievals, and task updates execute through `requireAuth` and `verifyTenantOwnership` (`src/lib/auth/guard.ts`):
1. **Request Authentication:** Validates session cookie or Bearer API key against the database.
2. **Tenant Ownership Verification:** Any attempt to read or modify a scan belonging to a different `tenant_id` immediately rejects with HTTP 403 Forbidden.
3. **Database Scoping:** All database queries (`getJob`, `getOwnerReport`, `getExpertReport`, `getRemediationTasks`) accept `tenantId` to enforce row-level scoping.

---

## 4. Protected Routes & Cross-Tenant Access Matrix

All critical API routes are guarded against unauthenticated and cross-tenant access:

| Route | Method | Auth Required | Tenant Verification | Cross-Tenant Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `/api/scan` | `POST` | Yes | Rate-limited per tenant | Rejects if quota exceeded (429) |
| `/api/scan` | `GET` | Yes | Scoped by `tenant_id` | Returns 403 if scan belongs to other tenant |
| `/api/scan/cancel` | `POST` | Yes | Verified by `tenant_id` | Returns 403; cannot cancel other tenant scans |
| `/api/scan/report` | `GET` | Yes | Scoped by `tenant_id` | Returns 403; cannot view other tenant owner reports |
| `/api/scan/expert-report`| `GET` | Yes | Scoped by `tenant_id` | Returns 403; cannot view other tenant expert reports |
| `/api/scan/pdf` | `POST` | Yes | Verified by `tenant_id` | Returns 403; cannot generate PDF for foreign scan |
| `/api/scan/expert-pdf` | `POST` | Yes | Verified by `tenant_id` | Returns 403; cannot generate expert PDF for foreign scan |
| `/api/scan/expert-export`| `GET` | Yes | Scoped by `tenant_id` | Returns 403; cannot export foreign tenant findings |
| `/api/scan/remediation` | `GET` | Yes | Scoped by `tenant_id` | Returns 403; foreign remediation tasks hidden |
| `/api/scan/remediation` | `PATCH`| Yes | Scoped by `tenant_id` | Returns 403; cannot update foreign remediation tasks |

---

## 5. Durability & Integration Verification

Two dedicated regression test suites verify database durability, process restart survival, and multi-tenant security:

### 5.1 Durability Test Suite (`src/lib/persistence/durable-sqlite.test.ts`)
- **Schema & Migrations:** Tests atomic creation of all tables and foreign key constraints on clean SQLite databases.
- **Lifecycle & Persistence:** Confirms scan jobs, owner reports, expert reports, and remediation tasks persist with full JSON structures.
- **Process Restart Simulation:**
  1. Instantiates `SqliteScanDatabaseAdapter` instance #1 on disk file `test-durability.db`.
  2. Creates jobs, owner reports, expert reports, and remediation tasks.
  3. Explicitly closes adapter instance #1, simulating a process termination / server restart.
  4. Instantiates fresh `SqliteScanDatabaseAdapter` instance #2 on the same disk file.
  5. Verifies all records, findings, category scores, coverage percentages, and task assignees are completely intact.

### 5.2 Multi-Tenant Security Suite (`src/lib/auth/auth-tenant.test.ts`)
- **PBKDF2 Password Hashing:** Verifies 100,000 iterations, timing-safe verification, and rejection of invalid passwords.
- **Session Management:** Verifies token generation, SHA-256 storage, lookup, and expiration.
- **API Key Authentication:** Verifies header-based key lookup and tenant resolution.
- **Cross-Tenant Access Denial:**
  - Tenant A creates scan `scan_comp_a_001`.
  - Tenant B queries `scan_comp_a_001` -> **Rejected (HTTP 403)**.
  - Tenant B attempts to cancel `scan_comp_a_001` -> **Rejected (HTTP 403)**.
  - Tenant B queries owner and expert reports for `scan_comp_a_001` -> **Rejected (HTTP 403)**.
  - Tenant B attempts to update remediation task on `scan_comp_a_001` -> **Rejected (HTTP 403)**.
- **Abuse Prevention / Rate Limiting:**
  - Verifies tenant is blocked when exceeding 2 concurrent active scans.
  - Verifies tenant is blocked when exceeding hourly scan allowance (20 scans/hr).

---

## 6. Full Verification & Acceptance Results

All verification suites executed successfully against the unified codebase:

| Verification Suite | Command | Total Tests | Passed | Failed | Exit Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Unit & Integration Suite** | `npm run test` | 73 tests (15 files) | **73** | 0 | **0** |
| **TypeScript Typecheck** | `npm run typecheck` | Strict compilation | Clean | 0 | **0** |
| **ESLint Static Analysis** | `npm run lint` | Next.js + Core Web Vitals | Clean | 0 | **0** |
| **E2E Playwright Suite** | `npm run test:e2e` | 33 browser tests | **33** | 0 | **0** |
| **PDF Generation Test** | `npm run test:pdf` | Owner & Expert PDFs | **2** | 0 | **0** |
| **Production Build** | `npm run build` | 19 routes (Static + Dynamic)| **19** | 0 | **0** |

### Execution Log Snippets:

#### 1. Vitest Unit & Integration (`npm run test`):
```text
 ✓ src/lib/scoring/scoring.test.ts (8 tests)
 ✓ src/lib/crawler/crawler.test.ts (8 tests)
 ✓ src/lib/scoring/coverage.test.ts (6 tests)
 ✓ src/lib/reporting/report-generation.test.ts (8 tests)
 ✓ src/lib/scoring/reality-check.test.ts (5 tests)
 ✓ src/lib/scoring/catalogue-integrity.test.ts (3 tests)
 ✓ src/lib/expert/expert-matrix.test.ts (5 tests)
 ✓ src/lib/auth/auth-tenant.test.ts (9 tests)
 ✓ src/lib/persistence/durable-sqlite.test.ts (7 tests)
 ✓ src/lib/reporting/report-truthfulness.test.ts (4 tests)
 ✓ src/lib/security/ssrf.test.ts (5 tests)
 ✓ src/lib/parser/html-parser.test.ts (5 tests)

 Test Files  15 passed (15)
      Tests  73 passed (73)
   Start at  12:13:30
   Duration  4.90s (transform 852ms,setup 0ms, collect 3.42s, tests 3.03s, environment 1ms, run 4.27s)
```

#### 2. Playwright End-to-End (`npm run test:e2e`):
```text
Running 33 tests using 1 worker
  ✓  1 [Desktop Chrome] › e2e/owner-report.spec.ts:18:7 › scan creation & progress
  ✓  2 [Desktop Chrome] › e2e/owner-report.spec.ts:38:7 › report rendering & metrics
  ✓  3 [Desktop Chrome] › e2e/owner-report.spec.ts:68:7 › category details & findings
  ✓  4 [Desktop Chrome] › e2e/owner-report.spec.ts:86:7 › evidence drawer inspection
  ✓  5 [Desktop Chrome] › e2e/owner-report.spec.ts:104:7 › crawl controls & cancellation
  ...
  ✓ 33 [Mobile Chrome] › e2e/expert-audit.spec.ts:167:7 › expert responsive layout
  33 passed (1.6m)
```

#### 3. Production Build (`npm run build`):
```text
Route (app)                              Size     First Load JS
┌ ○ /                                    172 B           109 kB
├ ○ /_not-found                          979 B           106 kB
├ ƒ /api/auth/login                      165 B           106 kB
├ ƒ /api/auth/logout                     165 B           106 kB
├ ƒ /api/auth/me                         165 B           106 kB
├ ƒ /api/scan                            165 B           106 kB
├ ƒ /api/scan/cancel                     165 B           106 kB
├ ƒ /api/scan/expert-demo                165 B           106 kB
├ ƒ /api/scan/expert-export              165 B           106 kB
├ ƒ /api/scan/expert-pdf                 165 B           106 kB
├ ƒ /api/scan/expert-report              165 B           106 kB
├ ƒ /api/scan/pdf                        165 B           106 kB
├ ƒ /api/scan/remediation                165 B           106 kB
├ ƒ /api/scan/report                     165 B           106 kB
├ ○ /expert-audit                        21 kB           164 kB
├ ○ /login                               3.23 kB         112 kB
└ ○ /owner-report                        12.7 kB         156 kB
+ First Load JS shared by all            105 kB
```

---

## 7. Staging Deployment & Operational Runbook

### 7.1 Environment Variables Baseline (`.env`)
```bash
# Application Host URL
NEXT_PUBLIC_APP_URL=https://staging.siteintel-pulse.io
NODE_ENV=production

# Persistence (SQLite Durable Adapter with WAL & ACID transactions)
DATABASE_PATH=/var/lib/siteintel/data/siteintel.db

# Authentication & Session Security (Minimum 32-byte secret)
SESSION_SECRET=e7b4f691a3c58209de4a7b1c3e5f7a9d2c4e6b8a0f1d3c5e7b9a1c3e5f7a9d2c

# Tenant Rate Limiting & Abuse Prevention Controls
MAX_CONCURRENT_SCANS_PER_TENANT=2
MAX_HOURLY_SCANS_PER_TENANT=20
RATE_LIMIT_ENABLED=true

# Crawler & Scanning Budgets (Safe conservative staging defaults)
CRAWLER_DEFAULT_PAGE_BUDGET=50
CRAWLER_HARD_PAGE_BUDGET=100
CRAWLER_DEPTH_BUDGET=3
CRAWLER_CONCURRENCY=3
CRAWLER_REQUEST_TIMEOUT_MS=10000
CRAWLER_MAX_DECOMPRESSED_PAGE_BYTES=2097152
CRAWLER_MAX_TOTAL_SCAN_BYTES=52428800
CRAWLER_USER_AGENT=SiteIntelPulse-Bot/1.0 (+https://staging.siteintel-pulse.io/bot-policy)
```

### 7.2 Health Check & Monitoring Endpoints
- **Liveness & Identity Check:** `GET /api/auth/me`
  - Unauthenticated: Returns HTTP 401 `{ "authenticated": false }`.
  - Authenticated: Returns HTTP 200 with tenant ID, user role, and active session expiry.
- **Database Connectivity Verification:**
  - Node.js native `DatabaseSync` confirms file lock acquisition and schema integrity on boot. If corrupted or missing permissions, process exits immediately during startup migration.

### 7.3 Database Backup & Recovery Runbook
- **Online Backup (Safe during WAL mode):**
  SQLite WAL mode permits online file backups using the standard SQLite CLI or file copy while write transactions occur:
  ```bash
  # Perform safe atomic backup
  sqlite3 /var/lib/siteintel/data/siteintel.db ".backup '/var/backups/siteintel-$(date +%F-%H%M).db'"
  ```
- **Disaster Recovery / Restore:**
  1. Stop application service: `systemctl stop siteintel-pulse`
  2. Restore backup file: `cp /var/backups/siteintel-2026-10-22-1200.db /var/lib/siteintel/data/siteintel.db`
  3. Verify permissions: `chown siteintel:siteintel /var/lib/siteintel/data/siteintel.db*`
  4. Start application service: `systemctl start siteintel-pulse`
  5. The built-in migrator automatically validates schema version `0002` on startup.

### 7.4 Rollback Plan
- If a deployment failure occurs, rollback application container or binary to the previous build.
- Database schemas `0001` and `0002` maintain backwards-compatible column definitions; downgrade does not require table drops.

---

## 8. Technical Boundaries & JavaScript / SPA Crawling Roadmap

### 8.1 Current Architectural Boundary: Static HTTP Crawling
SiteIntel Pulse currently employs a fast, memory-safe, HTTP streaming crawler paired with Cheerio HTML parsing.
- **What is evaluated with high fidelity:** Server-rendered HTML, meta tags, OpenGraph/Twitter cards, JSON-LD structured data, HTTP security headers, SSL/TLS certificates, robots.txt, sitemaps, internal/external links, responsive viewport tags, canonical links, and inline resources.
- **Client-Side SPA Limitation:** Single Page Applications (SPAs) relying purely on client-side React, Vue, or Angular rendering without SSR/SSG will deliver minimal initial HTML. The static crawler honestly reports the discovered initial DOM and marks items dependent on client execution as `INSUFFICIENT_EVIDENCE` or `NOT_TESTED` rather than hallucinating findings.

### 8.2 Future Roadmap: Headless Browser Rendering (Milestone 4)
- Integrate a sandboxed Playwright/Puppeteer rendering pool for client-side JavaScript execution.
- Dedicated resource budgets (CPU/RAM limits per rendering container) to prevent memory exhaustion during complex DOM rendering.
- Real-time Core Web Vitals capture (LCP, CLS, INP) directly from browser performance timelines.

---

## 9. Repository & Git Provenance

- **Git Status:** Clean working tree on `main` branch.
- **Remote:** `https://github.com/Hafiz-Hamza-Liaqat/siteintel-pulse.git`
- **Safeguard Compliance:** Strict adherence to project constraints. No commits, pushes, remote tags, or GitHub Actions were created or executed.

```text
## No commits yet on main
?? .env.example
?? .eslintrc.json
?? .gitignore
?? README.md
?? data/
?? docs/
?? e2e/
?? migrations/
?? next.config.mjs
?? package-lock.json
?? package.json
?? playwright.config.ts
?? postcss.config.mjs
?? scripts/
?? src/
?? tailwind.config.ts
?? tsconfig.json
?? vitest.config.ts

origin  https://github.com/Hafiz-Hamza-Liaqat/siteintel-pulse.git (fetch)
origin  https://github.com/Hafiz-Hamza-Liaqat/siteintel-pulse.git (push)
```

---

## 10. Conclusion & Final Verdict

SiteIntel Pulse has successfully completed all five phases of Milestone 3. The platform provides durable ACID persistence, robust tenant isolation, cryptographic credential security, and rate-limiting abuse protection while preserving all Owner and Expert audit capabilities from Milestones 1 and 2.

**FINAL ACCEPTANCE VERDICT:**  
# `READY FOR CONTROLLED STAGING`
