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

# Authentication & Session Security (MANDATORY: Generate unique secret via `openssl rand -hex 32`)
# Generate on your server using: openssl rand -hex 32
# Set the generated 64-character hex string below. Keep this file private and OUT of Git.
# Application startup will abort if this variable is missing, shorter than 32 chars, or uses a placeholder.
SESSION_SECRET=

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
   EnvironmentFile=/etc/siteintel.env
   ExecStart=/usr/bin/node /opt/siteintel-pulse/node_modules/.bin/next start -p 3000 -H 127.0.0.1
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

### Method C: Network Exposure & Nginx Reverse Proxy Architecture

For both Docker Compose and Native Linux deployments, the application backend is designed to run behind a trusted reverse proxy with HTTPS termination.

#### 1. Loopback Port Binding Security
- In `docker-compose.staging.yml`, the published port is strictly `127.0.0.1:3000:3000`.
- The application inside the container listens on `0.0.0.0:3000` to support container networking, while the host Docker daemon binds only to `127.0.0.1`.
- **Under no circumstances should port 3000 be exposed to `0.0.0.0:3000` on the host.** Direct public access to the Node.js backend without TLS termination and proxy filtering is prohibited.

#### 2. Nginx Reverse Proxy & TLS Configuration (`/etc/nginx/sites-available/siteintel-staging`)
```nginx
server {
    listen 80;
    server_name staging.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/staging.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;

        # Trusted Reverse Proxy Headers:
        # Overwrite client-supplied forwarding headers with authentic TCP connection info
        # to prevent X-Forwarded-For spoofing and rate-limit evasion.
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

#### 3. Topology-Specific Considerations
- **Same-Host Proxy (Default Staging Topology):** Nginx and Docker/Node.js run on the same VM/host. Loopback binding (`127.0.0.1:3000`) guarantees all external traffic arrives through Nginx.
- **Container PaaS / Ingress Overlay (e.g. Fly.io, Render, AWS ECS + ALB):**
  If the container runs within an isolated container network where the cloud edge router or ALB connects directly to the container's private IP, port publishing is handled by the platform's ingress. In this scenario, set `TRUSTED_IP_HEADER` to match the platform's authentic edge header (e.g., `fly-client-ip` or `cf-connecting-ip`). In production mode, the application requires the trusted header and rejects unmetered spoofed traffic.

---

## 4. Production-Mode Account Provisioning & Isolation Acceptance

### 4.1 Strict Production Demonstration Seed Guard
In `NODE_ENV=production`, staging demonstration accounts are unconditionally blocked from seeding by the production security guard (`seedInitialAccounts()` in `src/lib/auth/seed.ts` and `scripts/seed-staging.mjs`). Even if `ALLOW_STAGING_SEEDS=true` is set, the application refuses to seed demo accounts.

> [!CAUTION]
> **Do not run `npm run seed:staging` or `docker exec ... npm run seed:staging` against a staging or production deployment.** The script exits immediately with a fatal security error in production mode (`NODE_ENV=production`).

### 4.2 Supported Account Creation: Public Guest Session Flow
SiteIntel Pulse provides automated, on-demand tenant provisioning for public scan intake:
- Submitting an audit request via `POST /api/scan` without an active session automatically invokes `createGuestSession()`.
- The engine generates an unpredictable, isolated tenant identifier (`tenant_guest_<timestamp>_<entropy>`) and viewer user (`user_guest_<timestamp>_<entropy>`).
- The client receives an HMAC-signed HttpOnly session cookie (`siteintel_session`).
- Complete multi-tenant data isolation is enforced at the database level (`WHERE tenant_id = ?`).

### 4.3 Multi-Tenant Isolation Verification Protocol
To verify multi-tenant isolation on the live staging host without demo accounts:
1. **Tenant A (Client Session 1):** In Browser 1, initiate a scan for a test domain. This creates Tenant A. Copy the resulting scan job ID and report ID.
2. **Tenant B (Client Session 2):** In Browser 2 (or a private/incognito window), initiate a scan for a test domain. This creates Tenant B with a separate session cookie.
3. **Cross-Tenant Authorization Check:** Using Client Session 2, attempt to query Tenant A's scan status, Owner Report (`/api/scan/report`), Expert Report (`/api/scan/expert-report`), PDF downloads (`/api/scan/pdf`, `/api/scan/expert-pdf`), or CSV exports (`/api/scan/expert-export`).
4. **Expected Outcome:** Every cross-tenant request is rejected with HTTP 403 Forbidden.

### 4.4 Named Tenant-Owner Account Provisioning (Production CLI)
While demo seeds are strictly locked out in production, SiteIntel Pulse provides a secure, server-side administrative CLI tool for provisioning named multi-tenant owner accounts for production and staging environments:

```bash
# Docker Compose:
docker exec -it siteintel-pulse-staging npm run admin:provision-tenant

# Native Systemd Linux VPS (run as service user siteintel to preserve SQLite file ownership):
sudo -u siteintel ENV_FILE=/etc/siteintel.env npm run admin:provision-tenant
```

#### Security Controls & Safeguards:
1. **Interactive TTY Enforcement:** The CLI strictly requires both `process.stdin.isTTY` and `process.stdout.isTTY`. It rejects non-interactive execution, piped inputs, CI automation, redirected outputs, and headless subshells before prompting for any password.
2. **Terminal Echo Suppression:** Passwords are typed securely with echo disabled (`terminal: true`); credentials are never leaked to process lists, shell histories (`.bash_history`), or terminal displays.
3. **Password Policy Enforcement:** Passwords must be $\ge 12$ characters and satisfy complexity rules (uppercase, lowercase, number, symbol, no whitespace) with confirmation.
4. **Secret Validation & Insecure Fixture Rejection:** Rejects missing secrets, default placeholders, and known public test fixtures. Enforces strict 64-hexadecimal format matching `openssl rand -hex 32`.
5. **Database File Ownership Preservation:** Executing as `sudo -u siteintel` ensures `/var/lib/siteintel/data/siteintel.db` and WAL files maintain `siteintel:siteintel` permissions, preventing service downtime from root-owned file locks.
6. **PBKDF2-HMAC-SHA512 Cryptography:** Passwords are salted with 32 random bytes and hashed with 220,000 iterations of PBKDF2-HMAC-SHA512, ensuring 100% compatibility with `AuthService.authenticateUser` and `verifyPassword`.
7. **Atomic Isolation & Rollback:** Tenant creation, slug generation, user mapping, and owner role assignment occur within an atomic SQLite transaction. If any constraint fails (e.g., duplicate email or tenant slug), the transaction rolls back cleanly.
8. **No Pre-Generated API Keys:** Tenant owners are created without API keys or elevated cross-tenant permissions, maintaining strict data isolation.

#### Staging Two-Tenant Provisioning Procedure:
To provision the verified two-tenant staging accounts:
1. **Provision Tenant 1 (Company A):**
   - Tenant Name: `Company A`
   - Tenant Slug: `company-a`
   - Owner Name: `Company A Owner`
   - Owner Email: `owner@company-a.com`
   - Password: Enter high-entropy staging password (confirmed without echo).
2. **Provision Tenant 2 (Company B):**
   - Tenant Name: `Company B`
   - Tenant Slug: `company-b`
   - Owner Name: `Company B Specialist`
   - Owner Email: `specialist@company-b.com`
   - Password: Enter high-entropy staging password (confirmed without echo).

Both accounts can immediately authenticate at `/login` with full tenant boundary isolation.

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

## 6. Staging Acceptance Verification Checklist (Post-Deployment Execution)

> [!NOTE]
> This checklist is to be executed by platform administrators immediately following deployment to the live staging environment. Automated preflight tests have been validated in CI/local suites, but live host acceptance must be performed once the staging host and domain are live.

| Step | Operation | Expected Outcome | Live Staging Status |
| :--- | :--- | :--- | :--- |
| **1** | `GET /api/health` | Returns HTTP 200, `"status":"healthy"`, `"database":"connected"` | [ ] Pending live deployment |
| **2** | Provision Named Tenants CLI | Run `npm run admin:provision-tenant` for Company A (`owner@company-a.com`) and Company B (`specialist@company-b.com`) | [ ] Pending live deployment |
| **3** | Authenticate Provisioned Tenant 1 | Log in at `/login` as `owner@company-a.com`, receive signed session cookie and access tenant dashboard | [ ] Pending live deployment |
| **4** | Submit Target URL (Client Session 1 / Guest) | Initiates scan, provisions Tenant A guest session, sets secure session cookie | [ ] Pending live deployment |
| **5** | Execute Owner Audit (Tenant A) | Discovers pages within budgets, respects robots and SSRF guardrails | [ ] Pending live deployment |
| **6** | Generate Owner Report (Tenant A) | Computes 56 rules, displays honest provenance scores, renders 13 cards | [ ] Pending live deployment |
| **7** | Download Owner PDF (Tenant A) | Headless Playwright Chromium streams verified binary PDF (`application/pdf`) | [ ] Pending live deployment |
| **8** | Submit Target URL (Client Session 2 / Guest) | Initiates scan in incognito/separate browser, provisions isolated Tenant B | [ ] Pending live deployment |
| **9** | Generate Expert Report (Tenant B) | Navigates to `/expert-audit`, opens Diagnostic Workbench with 19 sections | [ ] Pending live deployment |
| **10** | Export Expert CSV (Tenant B) | Downloads 56-finding remediation plan spreadsheet | [ ] Pending live deployment |
| **11** | Download Expert PDF (Tenant B) | Streams 8-page diagnostic PDF with executive triage and audit ledger | [ ] Pending live deployment |
| **12** | Authenticate Provisioned Tenant 2 & Cross-Tenant Audit | Log in at `/login` as `specialist@company-b.com`; verify Company B and Client Session 2 requests to Tenant 1 / Tenant A resources return HTTP 403 Forbidden | [ ] Pending live deployment |
| **13** | Backup & Restore Run | Executes `npm run db:verify`, confirming 100% data fidelity on recovery | [ ] Pending live deployment |
