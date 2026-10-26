# SiteIntel Pulse — Native Node.js Deployment Guide (No Docker Required)

**Project:** SiteIntel Pulse — Website Intelligence & Growth Audit Platform  
**Target Environment:** Bare-Metal Linux, Cloud VPS (Ubuntu 22.04/24.04, Debian 12), or Persistent Node.js PaaS  
**Runtime:** Node.js >= 22.5.0 LTS  
**Version:** 1.0.0 (Release Candidate)  

---

## 1. Overview & Purpose

This guide details the end-to-end production deployment of SiteIntel Pulse directly on native Node.js **without requiring Docker or container engines**.

SiteIntel Pulse utilizes Node.js v22's native `node:sqlite` (`DatabaseSync`) module running in Write-Ahead Logging (`WAL`) mode. This provides full disk-backed persistence, transactional ACID reliability, and relational integrity without managing an external database daemon like MySQL or PostgreSQL.

---

## 2. Infrastructure & System Requirements

### 2.1 Hardware Sizing
- **CPU:** 2 to 4 vCPUs (Recommended: 4 vCPUs for concurrent crawling and headless Chromium rendering).
- **RAM:** Minimum 2 GB (Recommended: 4 GB to ensure sufficient memory for Playwright headless Chromium instances).
- **Disk Storage:** Minimum 20 GB SSD/NVMe mounted locally with standard POSIX file locking support (`ReadWriteOnce`).

### 2.2 Operating System Dependencies (Playwright Chromium)
Headless Chromium requires several underlying shared libraries on Linux to generate binary PDF audit reports. Run the following command on Ubuntu/Debian:

```bash
sudo apt-get update && sudo apt-get install -y --no-install-recommends \
  curl \
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
  libasound2 \
  libpango-1.0-0 \
  libcairo2
```

### 2.3 Node.js Runtime
Install Node.js 22 LTS via the official NodeSource repository:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version # Must report >= v22.5.0
npm --version  # Must report >= 10.0.0
```

---

## 3. Dedicated Service User & Directories

To maintain least-privilege security, do not run the application as root.

```bash
# 1. Create a dedicated system user
sudo useradd -r -s /bin/false -d /opt/siteintel-pulse siteintel

# 2. Prepare application and persistent storage paths
sudo mkdir -p /opt/siteintel-pulse
sudo mkdir -p /var/lib/siteintel/data
sudo mkdir -p /var/lib/siteintel/backups

# 3. Assign ownership
sudo chown -R siteintel:siteintel /opt/siteintel-pulse
sudo chown -R siteintel:siteintel /var/lib/siteintel
```

---

## 4. Application Setup & Build

Clone the repository and compile the Next.js production bundle:

```bash
cd /opt/siteintel-pulse
sudo -u siteintel git clone https://github.com/Hafiz-Hamza-Liaqat/siteintel-pulse.git .

# Install dependencies strictly matching package-lock.json
sudo -u siteintel npm ci

# Install Playwright browser binary
sudo -u siteintel npx playwright install chromium

# Compile production bundle
sudo -u siteintel npm run build
```

---

## 5. Production Environment Configuration

Create the production environment file at `/etc/siteintel.env`:

```bash
sudo touch /etc/siteintel.env
sudo chmod 600 /etc/siteintel.env
sudo chown siteintel:siteintel /etc/siteintel.env
```

Populate `/etc/siteintel.env` with the following configuration:

```ini
# Core Runtime
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
NEXT_PUBLIC_APP_URL=https://audit.yourdomain.com

# Persistence (Durable SQLite on persistent local disk)
DATABASE_PATH=/var/lib/siteintel/data/siteintel.db

# Mandatory Production Security Secret (Minimum 32 random characters)
# Generate a unique high-entropy secret on your server using: openssl rand -hex 32
# Set the generated value below. Keep this file private (chmod 600) and OUT of Git.
SESSION_SECRET=

# Demonstration Seed Account Guard
# MUST remain false in production to prevent seeding demo accounts
ALLOW_STAGING_SEEDS=false

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

# Optional External API Keys (Leave blank if unconfigured)
PAGESPEED_API_KEY=
```

> [!CAUTION]
> **Production Secret Enforced:** If `SESSION_SECRET` is omitted, shorter than 32 characters, or matches a default placeholder, the application will abort startup immediately for security.

---

## 6. Process Management with Systemd

Create a systemd service unit at `/etc/systemd/system/siteintel.service`:

```ini
[Unit]
Description=SiteIntel Pulse Website Intelligence Platform
After=network.target

[Service]
Type=simple
User=siteintel
Group=siteintel
WorkingDirectory=/opt/siteintel-pulse
EnvironmentFile=/etc/siteintel.env
ExecStart=/usr/bin/node /opt/siteintel-pulse/node_modules/.bin/next start -p 3000 -H 127.0.0.1
Restart=always
RestartSec=5
LimitNOFILE=65535
StandardOutput=journal
StandardError=journal
SyslogIdentifier=siteintel-pulse

[Install]
WantedBy=multi-user.target
```

Reload systemd and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now siteintel
sudo systemctl status siteintel
```

---

## 7. Nginx Reverse Proxy & SSL (HTTPS)

Configure Nginx as a reverse proxy with TLS termination:

```nginx
server {
    listen 80;
    server_name audit.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name audit.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/audit.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/audit.yourdomain.com/privkey.pem;
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

> [!IMPORTANT]
> **Proxy-Only Backend Binding & Header Sanitization:**
> 1. Ensure the Node.js application listens strictly on `127.0.0.1:3000` (configured via `HOST=127.0.0.1`), preventing direct external access that bypasses Nginx.
> 2. `proxy_set_header X-Real-IP $remote_addr;` and `proxy_set_header X-Forwarded-For $remote_addr;` explicitly overwrite any incoming client headers with the trusted TCP remote address `$remote_addr`. This ensures clients cannot spoof IP addresses or evade guest rate limits by forging `X-Forwarded-For` headers.

### 7.2 Reverse Proxy Trust Contract & Header Security

SiteIntel Pulse enforces a strict reverse-proxy trust contract for client IP identification:

1. **Explicit Trusted Header Requirement:** The application inspects `X-Real-IP` (or the custom header defined by `TRUSTED_IP_HEADER`).
2. **Prohibited Fallback to `X-Forwarded-For`:** When the trusted header is absent, the backend **never** falls back to `X-Forwarded-For`. Arbitrary clients can forge, prepend, or rotate IP values in `X-Forwarded-For` to evade rate limits.
3. **Production Fail-Safe:** In `NODE_ENV=production`, if the trusted reverse-proxy header is missing, API route handlers fail safely by rejecting the request with `HTTP 400` (`code: "UNTRUSTED_CLIENT_IP"`). No guest sessions, scan jobs, or database records are provisioned for unverified callers.
4. **Local Development & Automated Tests:** In non-production environments (`NODE_ENV !== "production"`), missing trusted headers default safely to `127.0.0.1` while continuing to ignore untrusted `X-Forwarded-For` headers, preventing test suite disruption while guaranteeing rate-limit durability.

### 7.3 Persistent Node.js PaaS & Managed Ingress Deployments

When deploying to persistent Node.js PaaS environments (which provide persistent POSIX disk volumes for SQLite WAL storage), different edge proxies sanitize headers differently. Set the `TRUSTED_IP_HEADER` environment variable according to your platform:

| Platform / Edge Ingress | Trusted Header Setting | Provider Header Behavior & Configuration |
| :--- | :--- | :--- |
| **Linux VPS + Nginx** | *(default: `x-real-ip`)* | Nginx `proxy_set_header X-Real-IP $remote_addr;` overwrites any client-supplied header with the authentic TCP connection IP. |
| **Fly.io** | `TRUSTED_IP_HEADER=fly-client-ip` | Fly's edge proxy strips caller-supplied `Fly-Client-IP` headers and injects the authentic client IP. Configure in `fly.toml`: `[env] TRUSTED_IP_HEADER = "fly-client-ip"`. |
| **Cloudflare (Proxy / Tunnel)** | `TRUSTED_IP_HEADER=cf-connecting-ip` | Cloudflare edge overwrites `CF-Connecting-IP` with the visitor's authenticated IP. Set `TRUSTED_IP_HEADER=cf-connecting-ip`. |
| **Railway / Render** | *(default: `x-real-ip`)* | Platform edge proxy sets `X-Real-IP`. Verify in project settings that external headers matching the trusted header name are stripped at the edge. |
| **AWS ALB / ECS** | Ingress Sidecar Required | AWS ALB appends client IPs to `X-Forwarded-For` rather than sanitizing `X-Real-IP`. Deploy an Nginx reverse-proxy sidecar or Cloudflare WAF in front to ensure authenticated `X-Real-IP` injection. |


---

## 8. Backup & Maintenance Operations

### 8.1 Automated Cron Backups
Configure a daily non-blocking hot backup utilizing SQLite `VACUUM INTO`:

```bash
sudo crontab -u siteintel -e
```

Add the following daily entry (runs at 02:00 AM UTC):
```bash
0 2 * * * cd /opt/siteintel-pulse && BACKUP_PATH=/var/lib/siteintel/backups/siteintel-backup-$(date +\%Y\%m\%d).db npm run db:backup >> /var/log/siteintel-backup.log 2>&1
```

### 8.2 Disaster Recovery Procedure
If database restoration is required:
```bash
# 1. Stop service
sudo systemctl stop siteintel

# 2. Restore verified snapshot
sudo -u siteintel node /opt/siteintel-pulse/scripts/restore-database.mjs \
  /var/lib/siteintel/backups/siteintel-backup-20261022.db \
  /var/lib/siteintel/data/siteintel.db

# 3. Restart service
sudo systemctl start siteintel

# 4. Verify health probe
curl -i http://127.0.0.1:3000/api/health
```

### 8.3 Named Tenant-Owner Account Provisioning (Production CLI)
While demo seeds are strictly locked out in production, SiteIntel Pulse provides an interactive server-side CLI for provisioning named multi-tenant owner accounts:

```bash
# Execute as the dedicated siteintel service user to preserve SQLite file ownership
cd /opt/siteintel-pulse
sudo -u siteintel ENV_FILE=/etc/siteintel.env npm run admin:provision-tenant
```

> [!IMPORTANT]
> **Operational Safeguards:**
> 1. **Preserve Database File Ownership:** Always run as `sudo -u siteintel`. Running as root will alter ownership of `/var/lib/siteintel/data/siteintel.db` and its WAL/SHM companion files to `root:root`, breaking the systemd service.
> 2. **Environment Loading:** Supplying `ENV_FILE=/etc/siteintel.env` provides the validated 64-hex `SESSION_SECRET` and `DATABASE_PATH` to the raw Node.js script without passing secrets as process arguments.
> 3. **Interactive TTY Enforcement:** The CLI strictly requires both `stdin` and `stdout` to be interactive terminals; non-interactive execution, piped inputs, and redirected outputs are aborted before asking for any password. Passwords are typed without terminal echo.

---

## 9. Verification & Health Monitoring

To verify deployment health and readiness without disclosing internal details:

```bash
curl -i http://127.0.0.1:3000/api/health
```

**Expected Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: no-store, no-cache, must-revalidate

{"status":"healthy","uptimeSeconds":184,"version":"1.0.0","checks":{"database":"connected"}}
```

---

## 10. Hosting Limitations & Cost Considerations

1. **Single-Node Persistence:** Native SQLite WAL mode requires local POSIX advisory file locking. It is strictly limited to single-node deployments (`ReadWriteOnce`).
2. **Serverless Incompatibility:** Ephemeral serverless lambdas (AWS Lambda, standard Vercel functions) cannot host this configuration.
3. **Hardware Costs:**
   - 2 vCPU / 4 GB RAM VPS on Hetzner: ~€6–€8/month.
   - 2 vCPU / 4 GB RAM Linode/DigitalOcean Droplet: ~$24/month.
   - Persistent volume Fly.io: ~$10–$15/month.
