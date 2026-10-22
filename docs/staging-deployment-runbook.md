# SiteIntel Pulse — Staging Deployment & Operational Runbook

**Project:** SiteIntel Pulse — Website Intelligence & Growth Audit Platform  
**Target Audience:** DevOps Engineers, Platform Administrators, Staging Release Team  
**Version:** 1.0.0 (Milestone 4 Release Candidate)  
**Date:** October 22, 2026  

---

## 1. Prerequisites & System Requirements

### 1.1 Hardware Sizing
- **CPU:** Minimum 2 vCPU (Recommended: 4 vCPU for concurrent crawls and Playwright rendering).
- **RAM:** Minimum 2 GB (Recommended: 4 GB to accommodate Headless Chromium).
- **Storage:** Minimum 20 GB SSD/NVMe persistent storage mounted with read-write permissions (`ReadWriteOnce`).

### 1.2 Operating System & Software
- **Operating System:** Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, or Debian 12 Bookworm.
- **Option A (Containerized):** Docker Engine 24.0+ and Docker Compose v2.20+.
- **Option B (Native):** Node.js >=22.5.0 LTS (Node 22 is required for native `node:sqlite`), npm 10+, and Chromium dependencies.

---

## 2. Environment Configuration

Create a `.env` file in the project root based on `.env.example`.

```env
# Application Host and Port
PORT=3000
HOST=0.0.0.0
NEXT_PUBLIC_APP_URL=https://staging.yourdomain.com

# Environment Mode
NODE_ENV=production

# Persistence (Durable SQLite on persistent storage mount)
DATABASE_PATH=/app/data/siteintel.db

# Authentication & Session Security (MANDATORY: Generate with `openssl rand -hex 32`)
SESSION_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Staging Demonstration Seed Guard
# Keep false in production. Set to true only in temporary non-production demo environments.
ALLOW_STAGING_SEEDS=false

# Scanning & Crawling Limits (Durable Safety Controls)
CRAWLER_DEFAULT_PAGE_BUDGET=50
CRAWLER_HARD_PAGE_BUDGET=100
CRAWLER_DEPTH_BUDGET=3
CRAWLER_CONCURRENCY=3
CRAWLER_REQUEST_TIMEOUT_MS=10000
CRAWLER_MAX_DECOMPRESSED_PAGE_BYTES=2097152
CRAWLER_MAX_TOTAL_SCAN_BYTES=52428800
CRAWLER_USER_AGENT=SiteIntelPulse-Bot/1.0 (+https://staging.yourdomain.com/bot-policy)

# Tenant Quotas & Rate Limiting
RATE_LIMIT_ENABLED=true
MAX_CONCURRENT_SCANS_PER_TENANT=2
MAX_HOURLY_SCANS_PER_TENANT=20

# Optional External Keys
PAGESPEED_API_KEY=
```

---

## 3. Staging Deployment Procedures

### Method A: Docker Compose Deployment (Recommended)

1. **Clone Repository and Prepare Directories:**
   ```bash
   git clone https://github.com/Hafiz-Hamza-Liaqat/siteintel-pulse.git /opt/siteintel-pulse
   cd /opt/siteintel-pulse
   cp .env.example .env
   # Edit .env with your staging domain and strong SESSION_SECRET
   ```

2. **Build and Launch Container:**
   ```bash
   docker compose -f docker-compose.staging.yml up -d --build
   ```

3. **Verify Container Health:**
   ```bash
   docker ps -f name=siteintel-pulse-staging
   docker logs siteintel-pulse-staging --tail 50
   ```

4. **Verify Health Endpoint:**
   ```bash
   curl -i http://localhost:3000/api/health
   # Expected: HTTP 200 OK, {"status":"healthy","checks":{"database":"connected"}}
   ```

---

### Method B: Native Systemd Linux VPS Deployment

1. **Install Chromium System Dependencies:**
   ```bash
   sudo apt-get update && sudo apt-get install -y \
     curl libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
     libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
     libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 ca-certificates
   ```

2. **Create Service User and Persistent Directories:**
   ```bash
   sudo useradd -r -s /bin/false siteintel
   sudo mkdir -p /var/lib/siteintel/data /var/lib/siteintel/backups
   sudo chown -R siteintel:siteintel /var/lib/siteintel
   ```

3. **Install Dependencies & Build:**
   ```bash
   cd /opt/siteintel-pulse
   npm ci
   npm run build
   ```

4. **Install Systemd Unit (`/etc/systemd/system/siteintel.service`):**
   ```ini
   [Unit]
   Description=SiteIntel Pulse Website Intelligence Platform
   After=network.target

   [Service]
   Type=simple
   User=siteintel
   WorkingDirectory=/opt/siteintel-pulse
   EnvironmentFile=/opt/siteintel-pulse/.env
   ExecStart=/usr/bin/node /opt/siteintel-pulse/node_modules/.bin/next start -p 3000 -H 0.0.0.0
   Restart=always
   RestartSec=5
   LimitNOFILE=65535

   [Install]
   WantedBy=multi-user.target
   ```

5. **Start and Enable Service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now siteintel
   sudo systemctl status siteintel
   ```

---

## 4. Staging Data Seeding

In staging, initial demonstration accounts can be seeded for team verification:

```bash
# Execute within container or environment:
docker exec -it siteintel-pulse-staging npm run seed:staging
# or on native VPS:
npm run seed:staging
```

This provisions two isolated tenants:
- **Tenant 1 (Company A - Website Owner):** `owner@company-a.com` / `StagingSecurePassword2026!`
- **Tenant 2 (Company B - Agency Specialist):** `specialist@company-b.com` / `StagingSecurePassword2026!`

---

## 5. Backup & Recovery Operations

### 5.1 Automated Online Backup (Cron)
Configure a daily cron job to execute an online atomic backup via `scripts/backup-database.mjs`:

```bash
# Add to crontab (e.g. daily at 02:00 AM UTC):
0 2 * * * cd /opt/siteintel-pulse && node scripts/backup-database.mjs >> /var/log/siteintel-backup.log 2>&1
```

### 5.2 Manual Backup
```bash
# Docker:
docker exec siteintel-pulse-staging node scripts/backup-database.mjs /app/backups/manual-pre-upgrade.db

# Host/Native:
node scripts/backup-database.mjs ./backups/manual-pre-upgrade.db
```

### 5.3 Disaster Recovery / Restoration
```bash
# 1. Stop the active application process:
docker compose -f docker-compose.staging.yml stop
# or: sudo systemctl stop siteintel

# 2. Execute restore utility pointing to verified backup snapshot:
node scripts/restore-database.mjs ./backups/siteintel-backup-YYYY-MM-DD.db ./data/siteintel.db

# 3. Restart application:
docker compose -f docker-compose.staging.yml start
# or: sudo systemctl start siteintel

# 4. Verify probe:
curl -i http://localhost:3000/api/health
```

---

## 6. Staging Acceptance Verification Checklist

| Step | Operation | Expected Outcome | Status |
| :--- | :--- | :--- | :--- |
| **1** | `GET /api/health` | Returns HTTP 200, `"status":"healthy"`, `"database":"connected"` | [x] Passed |
| **2** | Login as Tenant A | Authenticates via PBKDF2 (220k iter), sets secure HttpOnly session cookie | [x] Passed |
| **3** | Submit Target URL | Discovers pages within budgets, respects robots and SSRF guardrails | [x] Passed |
| **4** | Generate Owner Report | Computes 56 rules, displays honest provenance scores, renders 13 cards | [x] Passed |
| **5** | Download Owner PDF | Headless Playwright Chromium streams verified binary PDF (`application/pdf`) | [x] Passed |
| **6** | Login as Tenant B | Navigates to `/expert-audit`, opens Company B Diagnostic Workbench | [x] Passed |
| **7** | Manage Remediation | Updates task status to `in_progress` and persists to SQLite database | [x] Passed |
| **8** | Export Expert CSV | Downloads 56-finding remediation plan spreadsheet | [x] Passed |
| **9** | Download Expert PDF | Streams 8-page diagnostic PDF with executive triage and audit ledger | [x] Passed |
| **10** | Multi-Tenant Isolation | Tenant B request to Tenant A report returns HTTP 403 Forbidden | [x] Passed |
| **11** | Backup & Restore Run | Executes `npm run db:verify`, confirming 100% data fidelity on recovery | [x] Passed |
