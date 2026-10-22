# SiteIntel Pulse — Milestone 4: Controlled Staging Release Candidate

**Project:** SiteIntel Pulse — Website Intelligence & Growth Audit Platform  
**Repository:** `Hafiz-Hamza-Liaqat/siteintel-pulse`  
**Milestone:** 4 — Controlled Staging Release Candidate & Operational Readiness  
**Date:** October 22, 2026  
**Status:** `STAGING RELEASE CANDIDATE PREPARED`

---

## 1. Executive Summary

Milestone 4 establishes the release readiness, containerization, operational runbooks, durability verification, and staging deployment package for SiteIntel Pulse.

The platform integrates:
1. **Milestone 1:** Company A Website Owner Report ([`/owner-report`](file:///d:/Projects/SiteIntel-Pulse/src/app/owner-report/page.tsx)), 56-rule scoring catalogue across 11 categories totaling 100 points, SSRF DNS/IP guardrails, crawler budgets, and executive PDF generation.
2. **Milestone 2:** Company B Expert Diagnostic Workbench ([`/expert-audit`](file:///d:/Projects/SiteIntel-Pulse/src/app/expert-audit/page.tsx)), 19 diagnostic sections, 11-category remediation plans with interactive role assignments and status persistence, engineering CSV exports, and 8-page diagnostic PDF generation.
3. **Milestone 3:** Durable SQLite persistence (`DatabaseSync` in Node 22), multi-tenant data isolation, OWASP 220,000-iteration PBKDF2 password security, durable login abuse rate limiting, and production demonstration seed lockout.
4. **Milestone 4:** Health/readiness probe ([`/api/health`](file:///d:/Projects/SiteIntel-Pulse/src/app/api/health/route.ts)), multi-stage production Docker container, atomic hot backup and restore tooling (`scripts/backup-database.mjs`, `scripts/restore-database.mjs`), comprehensive deployment runbook, and rigorous verification test pass.

---

## 2. Infrastructure & Hosting Target Compatibility

SiteIntel Pulse relies on Node.js v22's native `node:sqlite` engine running in Write-Ahead Logging (`WAL`) mode with POSIX advisory file locks. To ensure zero data loss, the staging and production deployment targets must adhere to the following infrastructure requirements:

### 2.1 Compatible Deployment Targets
- **Single-Node Linux VPS / Dedicated Server:** Ubuntu 22.04/24.04 LTS or Debian 12 running systemd and Node.js >=22.5.0 or Docker.
- **Containerized PaaS with Persistent Volumes:** Fly.io (with mounted NVMe volume), Render (with persistent disk), Railway (with volume), or AWS ECS on EC2 with EBS persistent volume mount (`ReadWriteOnce`).
- **Self-Hosted Container Orchestrators:** Docker Compose, Dokku, Coolify, or Portainer with local directory bind-mounts or named volumes.

### 2.2 Incompatible Hosting Architectures (Documented Honestly)
- **Stateless Serverless Functions (e.g., standard Vercel Serverless, AWS Lambda, Cloudflare Workers):**
  - **Reason:** SQLite WAL mode requires a persistent, POSIX-compliant read-write filesystem. Stateless lambdas spin down or reset filesystems across cold starts, which would wipe SQLite databases, break concurrent read/write locks, or result in `SQLITE_BUSY` or `SQLITE_CORRUPT` failures.
  - **Alternative Path:** If serverless hosting is ever required, external PostgreSQL/Supabase persistence must be provisioned via `DATABASE_URL` (interfaces reserved in `.env.example`).

---

## 3. Staging Release Candidate Assets

### 3.1 Multi-Stage Containerization (`Dockerfile`)
- **Base Image:** `node:22-bookworm-slim`
- **System Dependencies:** Chromium OS shared libraries (`libnss3`, `libnspr4`, `libatk1.0-0`, `libcups2`, `libdrm2`, `libxkbcommon0`, `libgbm1`, `libasound2`, `libpango-1.0-0`, `libcairo2`, `ca-certificates`, `curl`) to ensure Playwright Chromium launches reliably for PDF generation in headless Linux environments.
- **Security:** Runs under unprivileged non-root user `nextjs:nodejs` (UID/GID 1001).
- **Persistent Mounts:** `VOLUME ["/app/data", "/app/backups"]`
- **Integrated Health Check:** Queries local probe `/api/health` every 30 seconds with 5-second timeout and 3 retries.

### 3.2 Health & Readiness Probe (`/api/health`)
- **Route:** `GET /api/health`
- **Operational Verifications:**
  - Node.js process uptime (`process.uptime()`)
  - Live SQLite database connectivity via `scanDb.ping()` (`SELECT 1;`)
- **Response Status:** HTTP 200 (`healthy`) or HTTP 503 (`unhealthy`)
- **Headers:** `Cache-Control: no-store, no-cache, must-revalidate`
- **Security Invariant:** Zero leakage of filesystem paths, secret tokens, user IDs, or connection parameters.

### 3.3 Database Backup & Recovery Tooling
- **Online Backup (`scripts/backup-database.mjs`):**
  - Executes non-blocking SQLite `VACUUM INTO '<destination>'` snapshot while database is active in WAL mode.
  - Performs `PRAGMA quick_check;` validation on generated backup artifact.
  - Tested and verified: bit-accurate snapshots created without locking active readers.
- **Safe Recovery (`scripts/restore-database.mjs`):**
  - Validates backup integrity and table schema prior to replacement.
  - Atomically clears stale target `-wal` and `-shm` artifacts to prevent WAL divergence.
  - Copies snapshot and re-verifies schema health on startup.
- **Automated Validation (`scripts/verify-backup-recovery.mjs`):**
  - Simulates active database insertions, runs online backup, wipes live database, restores from snapshot, and verifies 100% record match for tenants, users, scan jobs, and owner reports.

---

## 4. Security & Quality Guardrails Summary

1. **Authentication:** OWASP 220,000-iteration PBKDF2-HMAC-SHA-512 with transparent upgrade of legacy hashes and session ID rotation.
2. **Abuse Protection:** Dual-scoped IP (10/5m) and IP+account (5/5m) rate limiting stored in SQLite; zero DoS account lockout.
3. **Staging Guardrails:** `NODE_ENV=production` unconditionally suppresses demonstration seed accounts.
4. **Tenant Isolation:** Rigorously enforced across all 15 API route handlers.
5. **Scanning Boundaries:** DNS SSRF resolution checks, private IPv4/IPv6 blocking, 2MB decompression limit, 50MB scan budget, concurrency controls.
6. **Provenance Integrity:** Explicit separation of earned points, applicable evaluated tests, coverage percentages, and provisional statuses. Zero synthetic metric fabrication for unconfigured external providers.
