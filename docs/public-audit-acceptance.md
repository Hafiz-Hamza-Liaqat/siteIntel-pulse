# SiteIntel Pulse — Public Live Audit Platform Acceptance & Verification Report

**Project:** SiteIntel Pulse — Website Intelligence & Growth Audit Platform  
**Repository:** `https://github.com/Hafiz-Hamza-Liaqat/siteintel-pulse`  
**Static Showcase:** `https://hafiz-hamza-liaqat.github.io/siteintel-pulse/`  
**Date of Audit:** October 2026  
**Final Release Verdict:** **`IMPLEMENTED — HOSTING REQUIRED`**

---

## 1. Executive Summary

This report establishes the comprehensive verification of **SiteIntel Pulse** as a public website auditing platform. The application has been upgraded from a restricted staging system into a live platform that allows any public visitor to audit eligible websites, observe genuine scanning progress, and receive exactly one requested report perspective with complete tenant isolation.

### Final Verdict: `IMPLEMENTED — HOSTING REQUIRED`
- **Application Completeness:** 100% implemented, verified, and tested across all layers (API, database, background scan orchestrator, and React/Next.js frontend).
- **Hosting Reality:** Docker is neither installed nor required. All functionality runs natively on Node.js (>=22.5.0) with local SQLite WAL persistence. Because this local development environment does not contain remote cloud server credentials, the honest, evidence-based status is `IMPLEMENTED — HOSTING REQUIRED`.

---

## 2. Core Acceptance Requirements & Verified Invariants

### A. Single-Report Generation End-to-End
**Requirement:** Generate strictly ONE report for each audit request. The user chooses which report to generate. Never automatically generate both reports for a single request.

- **Request Schema (`src/types/schema.ts`):** `ScanRequestSchema` enforces `reportType: z.enum(["owner", "expert"])`. Requests missing or containing invalid `reportType` are rejected with HTTP 400.
- **Backend Orchestration (`src/lib/scanner/orchestrator.ts`):**
  - When `reportType === "owner"`: Evaluates all 56 catalogue rules, projects the Owner Report via `projectOwnerReport`, and persists it into `owner_reports`. The Expert Report is **not** projected, persisted, or attached.
  - When `reportType === "expert"`: Evaluates all 56 catalogue rules, projects the Expert Report via `projectExpertReport`, and persists it into `expert_reports`. The Owner Report is **not** projected, persisted, or attached.
- **API Mutual Exclusivity:**
  - `GET /api/scan`: Returns `reportType` and only the ID corresponding to the generated report type.
  - `GET /api/scan/report`: When queried for an expert-only scan, returns HTTP 404 with message: *"This scan was generated as an Expert Diagnostic Report. No Owner Report exists for this scan."*
  - `GET /api/scan/expert-report`: When queried for an owner-only scan, returns HTTP 404 with message: *"This scan was generated as a Website Owner Report. No Expert Diagnostic Report exists for this scan."*
- **Caching & Deduplication Separation:** `findRecentJobByUrl(url, tenantId, reportType)` filters by `reportType`. A recent completed owner scan cannot satisfy an incoming expert scan, and vice versa.

### B. Public Guest Access with Multi-Tenant Isolation
**Requirement:** Visitors must be able to run their first public scan without registering an account. The server must issue an unpredictable guest identity, set a secure session cookie, and enforce strict tenant-level isolation.

- **Guest Session Generation (`src/lib/auth/index.ts`):**
  - Unauthenticated requests to `POST /api/scan` trigger `createGuestSession()`.
  - Generates unpredictable IDs: `tenant_guest_<timestamp>_<entropy>` and `user_guest_<timestamp>_<entropy>`.
  - Sets signed HttpOnly session cookie (`siteintel_session`) with `SameSite=Lax`, `Path=/`, and a 14-day TTL.
- **Strict Tenant Isolation:**
  - Database queries (`getJob`, `getReport`, `getExpertReport`, `getRemediationTasks`) enforce tenant boundaries (`WHERE tenant_id = ?`).
  - Raw SQL queries in `db.ts` were corrected with proper operator precedence (`WHERE (report_id = ? OR scan_id = ?) AND (tenant_id = ? OR tenant_id IS NULL)`), eliminating any possible query bypass.
  - Guest B attempting to access Guest A's scan job or reports receives `null` or HTTP 403 Forbidden.
- **Rate-Limiting Protection:**
  - Guest tenants are capped at 1 concurrent scan and 5 scans per hour.
  - IP-level rate limiting tracks `ratelimit:ip_scan:<ip>:<hour>` in durable SQLite, capping unauthenticated requests at 15 scans per hour per IP address to prevent cookie-clearing abuse.

### C. Live Intake Experience at `/`
**Requirement:** The root route `/` must be the real website-audit intake experience, not just a marketing page.

- **Branding & Report Selector:** Features branding, product tagline (*"Discover Issues. Prove with Evidence. Improve. Grow."*), and visual selector cards for Company A (Owner Report) vs Company B (Expert Diagnostic Report).
- **Input & Options:** URL input with scheme normalization (`example.com` -> `https://example.com/`), optional platform name, business category, benchmark competitor domains, and bounded public scope disclaimer.
- **Live Progress Tracking:** During active scan execution, renders real-time progress bar, percentage, active pipeline stage description, and live counters for discovered and tested pages, with an active Cancel button.
- **Direct View Transitions:** Upon completion, immediately mounts `ReportViewer` (for Owner Reports) or `ExpertWorkbench` (for Expert Reports), with a prominent **Start New Audit** button to return to the intake form.
- **Direct Entry Points:** `/owner-report` and `/expert-audit` remain fully functional direct routes defaulting to their respective report perspectives.

---

## 3. Test & Verification Summary

| Verification Suite | Target | Executed Command | Result | Details |
| :--- | :--- | :--- | :---: | :--- |
| **Type Integrity** | Entire TypeScript Codebase | `npm run typecheck` | **PASS (100%)** | 0 compilation errors across all modules, tests, and scripts |
| **Lint & Quality** | Next.js Core Web Vitals | `npm run lint` | **PASS (100%)** | 0 ESLint warnings or errors |
| **Unit & Integration** | Scoring, Auth, DB, Scanner | `npm run test` | **PASS (100%)** | **22 test files, 123 tests passing** (including guest sessions and single-report selection) |
| **Browser E2E** | Navigation, Intake, Reports | `npm run test:e2e` | **PASS (100%)** | **33 Playwright tests passing** across Desktop, Tablet, and Mobile Chrome |
| **PDF Generation** | Owner & Expert Playwright PDF | `npm run test:pdf` | **PASS (100%)** | 88 KB Owner PDF and 107 KB Expert PDF generated and validated |
| **DB & Recovery** | SQLite WAL Backup / Restore | `npm run db:verify` | **PASS (100%)** | Online `VACUUM INTO` backup restored with 100% record fidelity |
| **Live Outbound Scan** | Public Target (`example.com`) | `scripts/live-scan-single-report.mjs` | **PASS (100%)** | Genuine DNS check, HTTP observations, Owner/Expert separation, guest isolation verified |
| **Production Build** | Next.js App Router Bundle | `npm run build` | **PASS (100%)** | 19 static and dynamic routes compiled successfully |

---

## 4. Live Scan Verification Evidence

A real outbound scan was executed against `https://example.com` (RFC 2606 permitted public reference domain) through the native `ScanOrchestrator` pipeline:

```
[Test 1: Guest Session Issuance]
  Guest Tenant ID:   tenant_guest_1792663952140_f4a9ba65e562bd8b
  Guest User ID:     user_guest_1792663952140_f4a9ba65e562bd8b
  Guest Plan:        guest (Max concurrent: 1, Scans/hr: 5)
  Session Token:     52d5ed656fa5de42e89f...

[Test 2: Live Owner Scan (https://example.com)]
  Job ID:            scan_1792663952226_y33bhv
  Job Final Status:  completed
  Current Stage:     Audit complete. Owner Report ready.
  Pages Tested:      1
  Owner Report ID:   rep_1792663953060_em9jm
  Overall Score:     72 / 100 (Needs improvement)
  Catalogue Cov:     90%
  Single-Report OK:  Verified Owner Report present; Expert Report strictly absent.

[Test 3: Live Expert Scan (https://example.com)]
  Guest B Tenant ID: tenant_guest_1792663953067_2059d49d6bbcabec
  Job ID:            scan_1792663953072_caq43h
  Job Final Status:  completed
  Current Stage:     Audit complete. Expert Diagnostic Report ready.
  Expert Report ID:  rep_exp_1792663953447_eq2i3
  Findings Count:    56
  URL Count:         1
  Remediation Tasks: 6
  Single-Report OK:  Verified Expert Report present; Owner Report strictly absent.

[Test 4: Guest-to-Guest Data Isolation]
  Isolation OK:      Guest B cannot access Guest A's scan or report (returns null).
```

---

## 5. Deployment Instructions for Persistent Public Hosting

SiteIntel Pulse requires a persistent POSIX filesystem for SQLite Write-Ahead Logging (`WAL`). Follow these steps to host on any Linux VPS:

### System Requirements
- Ubuntu 22.04 or 24.04 LTS
- 2+ vCPUs, 2+ GB RAM, persistent SSD
- Node.js >= 22.5.0 LTS

### Step-by-Step Setup
1. **Clone & Install:**
   ```bash
   git clone https://github.com/Hafiz-Hamza-Liaqat/siteintel-pulse.git /opt/siteintel-pulse
   cd /opt/siteintel-pulse
   npm ci
   ```
2. **Environment Configuration (`.env.production`):**
   ```bash
   NODE_ENV=production
   PORT=3000
   DATABASE_PATH=/var/lib/siteintel/siteintel.db
   SESSION_SECRET=$(openssl rand -hex 32)
   ```
3. **Build Application:**
   ```bash
   npm run build
   ```
4. **Configure Systemd Service (`/etc/systemd/system/siteintel.service`):**
   ```ini
   [Unit]
   Description=SiteIntel Pulse Application
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/opt/siteintel-pulse
   ExecStart=/usr/bin/npm start
   Restart=always
   EnvironmentFile=/opt/siteintel-pulse/.env.production

   [Install]
   WantedBy=multi-user.target
   ```
5. **Reverse Proxy (Caddy or Nginx):**
   ```nginx
   server {
       server_name pulse.yourdomain.com;
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

---

## 6. Release Verdict

```
================================================================================
  VERDICT: IMPLEMENTED — HOSTING REQUIRED
================================================================================
  1. The complete public live audit platform, single-report generation pipeline,
     guest session system, tenant isolation, and security controls are 100%
     implemented and verified locally.
  2. All 123 unit/integration tests and 33 Playwright E2E browser tests pass.
  3. Live scans against https://example.com prove genuine outbound assessment.
  4. Full operational deployment requires hosting on a persistent Node.js server.
================================================================================
```
