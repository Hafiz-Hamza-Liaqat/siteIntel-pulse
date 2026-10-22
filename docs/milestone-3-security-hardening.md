# SiteIntel Pulse — Milestone 3 Security Hardening & Staging Gate Report

**Project:** SiteIntel Pulse — Website Intelligence & Growth Audit Platform  
**Repository:** `Hafiz-Hamza-Liaqat/siteintel-pulse`  
**Milestone:** 3 — Security Hardening & Staging Gate Final Verification  
**Date:** October 22, 2026  
**Final Verdict:** `READY FOR CONTROLLED STAGING`

---

## 1. Executive Summary

Following a rigorous security audit and hardening pass, SiteIntel Pulse has achieved full hardening across password cryptography, brute-force login abuse protection, staging seed isolation, universal server-side tenant isolation, and durable persistence.

All foundational capabilities from Milestone 1 (Company A Owner Report, 56-rule scoring, crawler safeguards) and Milestone 2 (Company B Expert Diagnostic Workbench, 11-category remediation plans, engineering exports, PDF generators) remain 100% operational with zero regressions.

### Major Hardening Deliverables:
1. **OWASP 220,000 Iteration Work Factor:** Upgraded default PBKDF2 parameters to **220,000 iterations** of HMAC-SHA-512 with 32-byte salts, aligning with current OWASP guidance. Implemented backward-compatible verification for legacy 210,000 and 100,000 iteration hashes with seamless, transparent database rehashing upon user login.
2. **Durable Login Abuse & DoS Protection:** Implemented shared durable rate limiting (`LoginRateLimiter`) in the login handler (`/api/auth/login`). Limits repeated password guessing scoped to client IP and `(clientIp, targetEmail)` pairs using the SQLite `rate_limits` table. Trivial global account lockout is strictly avoided so attackers cannot deny service to legitimate users from different networks. Exceeding quota returns HTTP 429 `TOO_MANY_REQUESTS` with standard `Retry-After` headers.
3. **Strict Production Staging Seed Protection:** Default demonstration accounts (`admin@companya.test`, `lead@companyb.test`) can NEVER be seeded when `NODE_ENV=production`. The system unconditionally blocks seeding in production mode even if `ALLOW_STAGING_SEED=true` or any staging variable is accidentally enabled. Legitimate staging setup is restricted to non-production environments or explicit out-of-band operational execution via `npm run seed:staging`.
4. **Complete Elimination of Credential Exposure:** The `/login` page completely omits quick-fill controls and staging credentials in production mode. The demonstration endpoint (`/api/scan/expert-demo`) enforces authentication in production and no longer issues administrative session cookies.
5. **Universal Server-Side Tenant Isolation:** Verified across all 12 API route handlers. Tenant B is strictly denied (HTTP 401/403/404) from reading, cancelling, exporting, or modifying any resource belonging to Tenant A. Error responses omit sensitive target URLs and platform metadata.
6. **Durable Shared Rate Limiting & Disk Persistence:** Verified that hourly scan quotas, login rate limits, and active concurrency limits are stored in the SQLite database file on disk with `PRAGMA busy_timeout = 5000;` and WAL mode, surviving process restarts and adapter re-initialization.

---

## 2. Password Cryptography & Authentication Security

### 2.1 OWASP PBKDF2 Iteration Upgrade & Backward Compatibility
- **Algorithm:** PBKDF2 (Password-Based Key Derivation Function 2) using HMAC-SHA-512.
- **Iteration Count:** **220,000 iterations** (current OWASP Password Storage Cheat Sheet standard).
- **Salt:** 32 cryptographically secure random bytes generated via `crypto.randomBytes(32)` (64 hex characters).
- **Modern Hash Format:** Tagged modular format `pbkdf2$sha512$220000$<salt>$<hash>` (128 hex characters for 64-byte key length).
- **Legacy Backward Compatibility & Transparent Migration:**
  - `verifyPassword` supports modern formatted hashes (`pbkdf2$sha512$<iterations>$...`) by dynamically extracting the iteration count from the hash string, supporting 220,000, 210,000, or any positive integer count.
  - For unformatted legacy hex hashes, `verifyPassword` checks 220,000, then 210,000, then 100,000 iterations using timing-safe buffer comparison.
  - When an existing user logs in with a legacy hash, `needsPasswordRehash` flags the record and `authenticateUser` automatically re-hashes the password to 220,000 iterations inside SQLite.
  - Safe error handling: Malformed, truncated, non-hex, or corrupted hashes safely return `false` without throwing unhandled exceptions.

### 2.2 Verification Latency Benchmark
Under automated test execution on host hardware:
- **Average Verification Latency:** 364.28 ms – 447.51 ms per hash.
- **Security Assessment:** Meets OWASP defense-in-depth requirements: computationally expensive enough to resist GPU-accelerated offline cracking while remaining responsive for interactive user logins.

### 2.3 Session Secret Entropy & Fail-Safe Configuration (`src/lib/auth/config.ts`)
- `SESSION_SECRET` is retrieved via `getSessionSecret()`.
- **Production Fail-Safe Guard:** If `NODE_ENV === "production"`, the system verifies:
  1. `process.env.SESSION_SECRET` is present.
  2. Length is at least 32 characters (256 bits of entropy).
  3. The secret does not match any known placeholder (e.g., `"siteintel_staging_session_secret_change_in_production_32bytes_min"`).
  4. Any violation throws a fatal startup error: `FATAL CONFIGURATION ERROR: SESSION_SECRET must be set to a high-entropy secret (>= 32 chars) in production.`
- **Cookie Tamper Protection:** Cookies contain HMAC-SHA256 signatures (`${token}.${signature}`). Any tampering with the cookie payload or signature is caught in `verifySignedSessionToken` via `crypto.timingSafeEqual` before database querying.

### 2.4 Session Lifecycle & Cookie Security
- **Session-ID Rotation:** When a user authenticates at `/api/auth/login`, any pre-existing session token supplied by the browser is revoked in SQLite before issuing a fresh session ID and token.
- **Logout Invalidation:** `/api/auth/logout` deletes the session token record from the `sessions` table and sets the cookie `maxAge: 0`.
- **Cookie Security Flags:**
  - `httpOnly: true` (prevents JavaScript access via XSS).
  - `secure: process.env.NODE_ENV === "production"` (enforces HTTPS transport in production).
  - `sameSite: "lax"` (mitigates Cross-Site Request Forgery).
  - `path: "/"` with `maxAge: 14 * 24 * 60 * 60` (14 days).

---

## 3. Login Abuse Protection & Denial-of-Service Defense

### 3.1 Architecture of `LoginRateLimiter` (`src/lib/security/login-rate-limiter.ts`)
To defend against automated credential stuffing and brute-force password guessing without exposing legitimate users to denial-of-service lockout:
1. **Client IP Extraction:** `extractClientIp` normalizes client IP from `x-forwarded-for` (first hop), `x-real-ip`, or falls back to `127.0.0.1`.
2. **Durable Storage in SQLite:** Rate limits are stored in the shared `rate_limits` table with atomic `BEGIN IMMEDIATE` / `COMMIT` transactions.
3. **Dual Scoped Quotas (No Global Account Lockout):**
   - **Per-IP Global Cap:** Maximum 10 failed login attempts per 5-minute window (`ratelimit:login:ip:${clientIp}:${window}`).
   - **Per-IP + Account Targeted Cap:** Maximum 5 failed login attempts per 5-minute window for a specific `(clientIp, targetEmail)` pair (`ratelimit:login:ip_acc:${clientIp}:${emailHash}:${window}`).
   - **Denial-of-Service Prevention:** If an attacker attempts bad passwords against an account from IP `198.51.100.99`, ONLY that attacker's IP is blocked. A legitimate user attempting to log in from a different IP (e.g., corporate network or home) is NOT locked out.
4. **Standard Quota Exceeded Response:**
   - Status: HTTP 429 Too Many Requests.
   - Body: `{ "error": "...", "code": "TOO_MANY_REQUESTS", "retryAfter": <seconds> }`.
   - Headers: `Retry-After: <seconds>`, `X-RateLimit-Limit: 5`, `X-RateLimit-Remaining: 0`, `X-RateLimit-Reset: <timestamp>`.

---

## 4. Staging Demonstration Seed Guardrails

### 4.1 Strict Production Exclusion (`src/lib/auth/seed.ts`)
- `seedInitialAccounts(db: DatabaseSync)` enforces an unconditional production barrier:
  ```ts
  if (process.env.NODE_ENV === "production") {
    return {
      seeded: false,
      message: "CRITICAL SECURITY POLICY: Default demonstration accounts cannot be seeded when NODE_ENV=production.",
    };
  }
  ```
- Even if `ALLOW_STAGING_SEED=true` or any staging environment variable is accidentally present in a production configuration, the application strictly refuses to seed default demonstration accounts.
- In staging or development (`NODE_ENV !== "production"`), initial demonstration accounts are configured.
- For explicit out-of-band operator setup on staging hosts, a dedicated CLI script is provided: `npm run seed:staging` (`scripts/seed-staging.mjs`), which seeds Company A and Company B with modern OWASP 220,000-iteration hashes and logs all actions.

### 4.2 Login Interface Hardening (`src/app/login/page.tsx`)
- Quick-fill controls are wrapped in:
  ```tsx
  const showStagingPresets =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_ENABLE_STAGING_PRESETS === "true";
  ```
- In production builds, quick-fill buttons and demo account selectors are completely excluded from the DOM.

### 4.3 Demo Route Security (`src/app/api/scan/expert-demo/route.ts`)
- In production mode, unauthenticated requests to `/api/scan/expert-demo` return HTTP 401 `UNAUTHENTICATED`.
- In non-production environments, demo reports are generated without emitting administrative session cookies, preventing unauthenticated elevation to Company B Owner status.

---

## 5. Universal Server-Side Tenant Isolation Audit

All 12 API route handlers were verified using direct handler invocation tests in `src/lib/auth/endpoint-tenant-isolation.test.ts` across independent tenants (Tenant A: `tenant_comp_a`, Tenant B: `tenant_comp_b`):

| API Endpoint | Method | Auth Required | Tenant Verification | Cross-Tenant Result | Information Disclosure Check |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/scan` | `POST` | Bearer / Cookie | `auth.tenant.id` | Scans scoped to authenticated tenant | Quota headers isolated per tenant |
| `/api/scan` | `GET` | Bearer / Cookie | `verifyTenantOwnership` | **403 Forbidden** | Error omits target URL and platform name |
| `/api/scan/cancel` | `POST` | Bearer / Cookie | `verifyTenantOwnership` | **403 Forbidden** | Foreign scan cancellation blocked |
| `/api/scan/report` | `GET` | Bearer / Cookie | `verifyTenantOwnership` | **403 Forbidden** | Company A report hidden from Tenant B |
| `/api/scan/expert-report` | `GET` | Bearer / Cookie | `verifyTenantOwnership` | **403 Forbidden** | Expert diagnostics hidden from Tenant B |
| `/api/scan/expert-export` | `GET` | Bearer / Cookie | `verifyTenantOwnership` | **403 Forbidden** | CSV/JSON data download blocked |
| `/api/scan/pdf` | `GET` | Bearer / Cookie | `verifyTenantOwnership` | **403 Forbidden** | Owner PDF stream blocked |
| `/api/scan/expert-pdf` | `GET` | Bearer / Cookie | `verifyTenantOwnership` | **403 Forbidden** | Expert PDF stream blocked |
| `/api/scan/remediation` | `POST`| Bearer / Cookie | Relational `tenant_id` | **404 Not Found** | Cannot update foreign remediation tasks |
| `/api/scan/remediation` | `GET` | Bearer / Cookie | Relational `tenant_id` | **Empty List** | Foreign tasks invisible |
| `/api/scan/expert-demo` | `POST`| Bearer / Cookie | `auth.tenant.id` | **401 Unauthenticated** (Prod)| No auto-session elevation |
| `/api/auth/me` | `GET` | Bearer / Cookie | Session validation | **401 Unauthenticated** | Expired sessions deleted immediately |

---

## 6. Rate Limiting, Durability & Deployment Architecture

### 6.1 Shared & Durable Rate Limiting
- Rate limits are stored in the SQLite `rate_limits` table (`key`, `count`, `reset_at`) rather than in an in-memory process Map.
- Atomic updates execute via `BEGIN IMMEDIATE;` and `COMMIT;` in `incrementRateLimit()`.
- **Restart Verification:** Tests confirm that hourly scan counts and login rate limits survive database connection termination and adapter re-initialization.

### 6.2 Active Concurrency Caps
- Enforced dynamically via `SELECT COUNT(*) FROM scan_jobs WHERE tenant_id = ? AND status IN (...)`.
- Reaching the plan cap (default: 2 active concurrent scans) rejects new scans with HTTP 429 `QUOTA_EXCEEDED`.
- Cancelling an active scan (`jobManager.cancelScan()`) transitions its status to `canceled`, instantly freeing the slot.

### 6.3 Deployment Constraints & Single-Instance Architecture
- **Engine Pinning:** `"engines": { "node": ">=22.5.0", "npm": ">=10.0.0" }`. Verified running on Node.js `v22.21.1`.
- **Runtime Pragmas:**
  - `PRAGMA busy_timeout = 5000;` (prevents lock exceptions during concurrent read/write operations).
  - `PRAGMA foreign_keys = ON;` (relational integrity).
  - `PRAGMA journal_mode = WAL;` (concurrent readers during background writes).
  - `PRAGMA synchronous = NORMAL;` (optimal durability for WAL).
- **Deployment Topology:**
  - **Staging / Single-Node Production:** Supported via single container or VM with a local writable disk volume (e.g., Docker named volume, Kubernetes `PersistentVolumeClaim` with `ReadWriteOnce`).
  - **Multi-Instance / Cluster Notice:** SQLite WAL requires POSIX advisory file locking. Network filesystems (NFS, SMB) without reliable POSIX lock support may experience lock contention. For horizontal clustering across multiple stateless nodes, transition to the PostgreSQL persistence adapter.
  - **Client-Side SPA Boundary:** Fast HTTP streaming crawler audits server-rendered DOM. Heavy client-side React/Vue/Angular applications without SSR honestly report initial DOM and flag client-rendered items as `INSUFFICIENT_EVIDENCE` or `NOT_TESTED` pending Milestone 4 headless browser rendering.

---

## 7. Verification Suite Outcomes & Exit Codes

All verification suites executed successfully against the hardened codebase:

| Verification Suite | Command | Total Tests | Passed | Failed | Exit Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Unit & Integration Suite** | `npm run test` | 112 tests (19 test files) | **112** | 0 | **0** |
| **TypeScript Strict Compilation** | `npm run typecheck` | Strict typecheck | Clean | 0 | **0** |
| **ESLint Static Analysis** | `npm run lint` | Next.js Core Web Vitals | Clean | 0 | **0** |
| **Playwright E2E Suite** | `npm run test:e2e` | 33 browser tests (3 viewports) | **33** | 0 | **0** |
| **PDF Generation Test** | `npm run test:pdf` | Owner (88KB) & Expert (107KB) | **2** | 0 | **0** |
| **Production Build** | `npm run build` | 19 routes (Static + Dynamic) | **19** | 0 | **0** |

### Execution Details:
- **`npm run test` (19 test files, 112 tests):**
  - `src/lib/security/login-abuse.test.ts` (7 tests passed: IP extraction, rate-limiting, DoS account lockout prevention).
  - `src/lib/auth/password-security.test.ts` (15 tests passed: OWASP 220,000 iterations, 210,000 & 100,000 backward compatibility, benchmark latency, session rotation, fail-safe secret).
  - `src/lib/auth/endpoint-tenant-isolation.test.ts` (14 tests passed: all route handlers, staging seed production lockout).
  - `src/lib/security/rate-limiter-durability.test.ts` (3 tests passed: disk-backed process restart survival).
  - `src/lib/auth/auth-tenant.test.ts` (7 tests passed).
  - `src/lib/persistence/durable-sqlite.test.ts` (2 tests passed).
  - All 13 scoring, crawler, DNS safety, budget, and export test suites passed.
- **`npm run test:e2e` (33 tests):**
  - 33 passed in 1.3m across Desktop Chrome, Tablet Chrome, and Mobile Chrome.

---

## 8. Git & Repository Provenance

- **Branch:** `main`
- **Remote:** `https://github.com/Hafiz-Hamza-Liaqat/siteintel-pulse.git`
- **Commit/Push Invariants:** Zero commits, zero pushes, zero remote tags, zero GitHub Actions created.
- **Working Tree:** All changes retained locally in the workspace.

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

## 9. Final Verdict

All security corrections and staging gate controls have been implemented, verified, and backed by automated regression tests.

Because horizontal clustering, high-volume queue workers, and automated TLS certificate rotation are planned for future production release phases, the application is strictly certified for controlled staging environments.

**FINAL AUDIT VERDICT:**  
# `READY FOR CONTROLLED STAGING`
