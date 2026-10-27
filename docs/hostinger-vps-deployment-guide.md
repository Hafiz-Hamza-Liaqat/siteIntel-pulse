# SiteIntel Pulse — Hostinger VPS Staging & Production Deployment Guide

**Target Environment:** Hostinger KVM VPS (KVM 2 or KVM 4 recommended)  
**Operating System:** Ubuntu 24.04 LTS (Noble Numbat)  
**Runtime:** Node.js 22 LTS (Latest supported patch release: `v22.23.4`)  
**Reverse Proxy:** Nginx with Let's Encrypt HTTPS (HTTP/2)  
**Process Supervisor:** Systemd (`siteintel-pulse.service`)  
**Persistence:** Native SQLite (`node:sqlite` / `DatabaseSync`) in WAL mode  
**PDF Rendering Engine:** Playwright Headless Chromium  

---

## 1. Architecture & Sizing Overview

SiteIntel Pulse is architected for single-node POSIX file-locking persistence and native Linux process management. Ephemeral serverless platforms (e.g. standard Vercel serverless functions, AWS Lambda) are incompatible because they cannot guarantee persistent Write-Ahead Logging (`WAL`) file locks or support long-running headless Chromium page evaluations.

### Recommended Hostinger VPS Plans:
- **Staging / Evaluation:** **Hostinger KVM 2** (2 vCPU, 8 GB RAM, 100 GB NVMe SSD, 8 TB Bandwidth).
- **Production:** **Hostinger KVM 4** (4 vCPU, 16 GB RAM, 200 GB NVMe SSD, 16 TB Bandwidth) for high-concurrency audits and multi-page crawling.

---

## 2. Linux System Dependencies & Ubuntu 24.04 Preparation

Connect to your Hostinger VPS via SSH as `root`:

```bash
ssh root@<YOUR_HOSTINGER_VPS_IP>
```

### 2.1 Update System Packages
```bash
apt-get update && apt-get upgrade -y
```

### 2.2 Install Base Utilities & Playwright Chromium Dependencies
Ubuntu 24.04 LTS requires the following shared libraries for Playwright headless Chromium PDF rasterization and rendering:

```bash
apt-get install -y --no-install-recommends \
  curl \
  wget \
  git \
  nginx \
  certbot \
  python3-certbot-nginx \
  ufw \
  build-essential \
  ca-certificates \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2t64 \
  libpango-1.0-0 \
  libcairo2
```

### 2.3 Configure Host Firewall (UFW)
Allow SSH, HTTP, and HTTPS:
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
ufw status verbose
```

---

## 3. Node.js 22 LTS Runtime Installation

Install the supported Node.js 22 LTS patch release (`v22.23.4`) via the official NodeSource repository:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Verify versions
node --version # Expected: >= v22.5.0 (e.g. v22.23.4)
npm --version  # Expected: >= 10.0.0
```

---

## 4. Dedicated Non-Root Service User & Directories

To enforce least privilege, create a dedicated system service user `siteintel`:

```bash
# 1. Create system user with home directory at /opt/siteintel-pulse
useradd -r -s /bin/false -d /opt/siteintel-pulse siteintel

# 2. Create application and persistent storage paths
mkdir -p /opt/siteintel-pulse
mkdir -p /var/lib/siteintel-pulse/data
mkdir -p /var/lib/siteintel-pulse/backups
mkdir -p /var/log/siteintel-pulse

# 3. Assign ownership to the service user
chown -R siteintel:siteintel /opt/siteintel-pulse
chown -R siteintel:siteintel /var/lib/siteintel-pulse
chown -R siteintel:siteintel /var/log/siteintel-pulse
chmod 750 /var/lib/siteintel-pulse/data
chmod 750 /var/lib/siteintel-pulse/backups
```

---

## 5. Repository Checkout & Application Build

Clone the merged repository into `/opt/siteintel-pulse` as the `siteintel` user:

```bash
cd /opt/siteintel-pulse
sudo -u siteintel git clone https://github.com/Hafiz-Hamza-Liaqat/siteIntel-pulse.git .
sudo -u siteintel git checkout main

# Clean reproducible installation of exact production lockfile dependencies
sudo -u siteintel npm ci

# Install Playwright Chromium browser binary
sudo -u siteintel npx playwright install chromium

# Install system dependencies if any are missing
sudo -u siteintel npx playwright install-deps chromium
```

---

## 6. Production Secrets & Environment Configuration

Create the private environment file at `/etc/siteintel-pulse.env`. Keep permissions locked down to `chmod 600`:

```bash
touch /etc/siteintel-pulse.env
chmod 600 /etc/siteintel-pulse.env
chown siteintel:siteintel /etc/siteintel-pulse.env
```

Generate high-entropy 32-byte (64-hex character) secrets on the server:
```bash
SESSION_KEY=$(openssl rand -hex 32)
TOKEN_KEY=$(openssl rand -hex 32)
```

Populate `/etc/siteintel-pulse.env`:

```ini
# Core Runtime
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
NEXT_PUBLIC_APP_URL=https://audit.yourdomain.com

# Persistence (Durable SQLite on persistent local disk with POSIX locks)
DATABASE_PATH=/var/lib/siteintel-pulse/data/siteintel.db

# Mandatory Production Security Secrets
SESSION_SECRET=<INSERT_GENERATED_SESSION_KEY_HERE>
PROVIDER_ENCRYPTION_KEY=<INSERT_GENERATED_TOKEN_KEY_HERE>

# Demonstration Account Guard (MUST be false in production)
ALLOW_STAGING_SEEDS=false

# Ingress Header Trust Contract
TRUSTED_IP_HEADER=x-real-ip

# Scanner Budgets & Guardrails
CRAWLER_DEFAULT_PAGE_BUDGET=50
CRAWLER_HARD_PAGE_BUDGET=100
CRAWLER_DEPTH_BUDGET=3
CRAWLER_CONCURRENCY=3
CRAWLER_REQUEST_TIMEOUT_MS=10000
CRAWLER_MAX_DECOMPRESSED_PAGE_BYTES=2097152
CRAWLER_MAX_TOTAL_SCAN_BYTES=52428800
CRAWLER_USER_AGENT=SiteIntelPulse-Bot/1.0 (+https://audit.yourdomain.com/bot-policy)

# Rate Limiting Controls
RATE_LIMIT_ENABLED=true
MAX_CONCURRENT_SCANS_PER_TENANT=2
MAX_HOURLY_SCANS_PER_TENANT=20

# Provider API Integrations (Populate once client keys are provisioned)
GA4_CLIENT_ID=
GA4_CLIENT_SECRET=
GSC_CLIENT_ID=
GSC_CLIENT_SECRET=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_API_VERSION=v26
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_API_VERSION=2026-10
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
SERP_API_KEY=
PAGESPEED_API_KEY=
```

---

## 7. Preflight Verification & Production Compilation

### 7.1 Environment Loading Precedence & Fail-Closed Guarantee
- **Deterministic Loading:** Both `scripts/hostinger-preflight.mjs` and `next.config.mjs` natively evaluate `process.env.ENV_FILE`.
- **Fail-Closed Contract:** If `ENV_FILE` is specified but missing, inaccessible, or a directory, preflight and Next.js production compilation fail immediately with an explicit fatal error (secret values are never leaked in error outputs).
- **Variable Precedence:** Variables exported by the shell or systemd take precedence over variables defined in `ENV_FILE` (`override: false`). Unset variables are deterministically populated from `ENV_FILE`.

### 7.2 Execute Preflight & Build
Run the preflight validator to verify all runtime checks before building:

```bash
cd /opt/siteintel-pulse
sudo -u siteintel ENV_FILE=/etc/siteintel-pulse.env npm run preflight:hostinger
```

If preflight reports **PREFLIGHT RESULT: ALL CHECKS PASSED**, compile the Next.js production bundle:

```bash
sudo -u siteintel ENV_FILE=/etc/siteintel-pulse.env npm run build
```

---

## 8. Process Supervision with Systemd

Create the systemd service file at `/etc/systemd/system/siteintel-pulse.service`:

```ini
[Unit]
Description=SiteIntel Pulse — Website Intelligence & Growth Audit Platform
After=network.target

[Service]
Type=simple
User=siteintel
Group=siteintel
WorkingDirectory=/opt/siteintel-pulse
EnvironmentFile=/etc/siteintel-pulse.env
ExecStart=/usr/bin/node /opt/siteintel-pulse/node_modules/.bin/next start -p 3000 -H 127.0.0.1
Restart=always
RestartSec=5
LimitNOFILE=65535
StandardOutput=append:/var/log/siteintel-pulse/app.log
StandardError=append:/var/log/siteintel-pulse/error.log
SyslogIdentifier=siteintel-pulse

# Security Sandbox
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
systemctl daemon-reload
systemctl enable siteintel-pulse
systemctl start siteintel-pulse
systemctl status siteintel-pulse
```

Verify the local health probe:
```bash
curl -i http://127.0.0.1:3000/api/health
```

Expected response:
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: no-store, no-cache, must-revalidate

{"status":"healthy","uptimeSeconds":15,"version":"1.0.0","checks":{"database":"connected"}}
```

---

## 9. Nginx Reverse Proxy with HTTPS & Trusted Client IP Forwarding

Create `/etc/nginx/sites-available/siteintel-pulse.conf`:

```nginx
# Rate Limiting Zone: 10 requests/second per IP address
limit_req_zone $binary_remote_addr zone=siteintel_limit:10m rate=10r/s;

server {
    listen 80;
    listen [::]:80;
    server_name audit.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name audit.yourdomain.com;

    # SSL Configuration (Populated by Certbot)
    ssl_certificate /etc/letsencrypt/live/audit.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/audit.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Client Request Body Limits (Audit payload safety)
    client_max_body_size 10M;

    # Reverse Proxy to Local Loopback
    location / {
        limit_req zone=siteintel_limit burst=20 nodelay;

        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;

        # Strict Trusted IP Forwarding (Overwrites client headers with TCP connection IP)
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
    }

    # Static Next.js Cache Optimization
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

Enable the site and obtain a Let's Encrypt certificate:

```bash
ln -s /etc/nginx/sites-available/siteintel-pulse.conf /etc/nginx/sites-enabled/
nginx -t
certbot --nginx -d audit.yourdomain.com
systemctl reload nginx
```

---

## 10. Automated Non-Blocking Backups (`VACUUM INTO`)

Create `/etc/cron.d/siteintel-backup`:

```bash
# Run daily hot backup at 03:00 UTC using SQLite VACUUM INTO
0 3 * * * siteintel cd /opt/siteintel-pulse && BACKUP_PATH=/var/lib/siteintel-pulse/backups/siteintel-$(date +\%Y\%m\%d).db npm run db:backup >> /var/log/siteintel-pulse/backup.log 2>&1
```

Set permissions:
```bash
chmod 644 /etc/cron.d/siteintel-backup
```

---

## 11. Disaster Recovery & Database Restoration

If data recovery is required:

```bash
# 1. Stop the application service
systemctl stop siteintel-pulse

# 2. Restore verified snapshot using the validated restore script
sudo -u siteintel node /opt/siteintel-pulse/scripts/restore-database.mjs \
  /var/lib/siteintel-pulse/backups/siteintel-20261027.db \
  /var/lib/siteintel-pulse/data/siteintel.db

# 3. Start the application
systemctl start siteintel-pulse

# 4. Verify database health
curl -f http://127.0.0.1:3000/api/health
```

---

## 12. Zero-Downtime Updates & Rollback Instructions

### 12.1 Deploying an Update
```bash
cd /opt/siteintel-pulse
sudo -u siteintel git fetch origin
sudo -u siteintel git checkout <NEW_TAG_OR_COMMIT>
sudo -u siteintel npm ci
sudo -u siteintel ENV_FILE=/etc/siteintel-pulse.env npm run build
systemctl restart siteintel-pulse
curl -f http://127.0.0.1:3000/api/health
```

### 12.2 Rollback Instructions
If a new deployment fails preflight or health checks:
```bash
# 1. Rollback code to last known good commit
cd /opt/siteintel-pulse
sudo -u siteintel git checkout <PREVIOUS_STABLE_COMMIT>
sudo -u siteintel npm ci
sudo -u siteintel ENV_FILE=/etc/siteintel-pulse.env npm run build

# 2. If database schema was affected, restore pre-deployment backup
systemctl stop siteintel-pulse
sudo -u siteintel node scripts/restore-database.mjs \
  /var/lib/siteintel-pulse/backups/pre-deployment.db \
  /var/lib/siteintel-pulse/data/siteintel.db

# 3. Restart and verify
systemctl start siteintel-pulse
curl -f http://127.0.0.1:3000/api/health
```

---

## 13. Hostinger Staging Acceptance Checklist

Execute this checklist sequentially on the real Hostinger VPS:

- [ ] **Infrastructure & Runtime:**
  - [ ] Hostinger KVM VPS running Ubuntu 24.04 LTS.
  - [ ] Node.js version is `>= 22.5.0` (target `v22.23.4`).
  - [ ] Non-root `siteintel` user owns `/opt/siteintel-pulse` and `/var/lib/siteintel-pulse`.
  - [ ] `SESSION_SECRET` (>= 32 chars) and `PROVIDER_ENCRYPTION_KEY` (64-hex chars) populated in `/etc/siteintel-pulse.env`.
  - [ ] `npm run preflight:hostinger` outputs all checks passed.

- [ ] **Health & Connectivity:**
  - [ ] `systemctl is-active siteintel-pulse` reports `active`.
  - [ ] Local probe: `curl -f http://127.0.0.1:3000/api/health` returns `healthy` with `database: connected`.
  - [ ] Public probe: `curl -f https://audit.yourdomain.com/api/health` returns HTTP 200 with HTTPS.
  - [ ] Security headers confirmed (HSTS, nosniff, DENY, strict-origin-when-cross-origin).

- [ ] **Ingress & Trusted Proxy Header Validation:**
  - [ ] Direct access to port 3000 from public internet is blocked by UFW / loopback binding.
  - [ ] Requests without `X-Real-IP` received in production fail with `HTTP 400` (`UNTRUSTED_CLIENT_IP`).
  - [ ] Client cannot spoof IP via arbitrary `X-Forwarded-For` header.

- [ ] **Audit Scan Execution & Invariants:**
  - [ ] Public Owner Report scan starts and completes.
  - [ ] Exactly one report is persisted per scan (mutual exclusivity enforced).
  - [ ] Company B Expert Diagnostic Workbench renders 19 diagnostic sections.
  - [ ] Finding Explorer, URL Inventory, and CSV export function correctly.

- [ ] **PDF Generation & Rasterization:**
  - [ ] Owner Report PDF downloads with exact A4 dimensions, no overflow, and valid `%PDF-` header.
  - [ ] Expert Diagnostic PDF downloads with cryptographic SHA-256 signature and 13 diagnostic sections.

- [ ] **Persistence & Recovery Durability:**
  - [ ] Execute `systemctl restart siteintel-pulse`; verify previously generated scans and reports remain accessible.
  - [ ] Execute `npm run db:backup`; verify snapshot created in `/var/lib/siteintel-pulse/backups`.
  - [ ] Test `npm run db:restore` into a test target; verify record count matches live database.

- [ ] **Business Data Provider Integrations:**
  - [ ] Unconfigured providers return truthful `isAvailable: false` without fabricating metrics.
  - [ ] When staging credentials are configured: verify OAuth connect, callback, property/customer selection, metrics fetch, and token refresh.
