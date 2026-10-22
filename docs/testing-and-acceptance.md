# SiteIntel Pulse — Test Strategy & Milestone 1 Acceptance Criteria

## 1. Multi-Layer Testing Architecture

SiteIntel Pulse uses a comprehensive test suite across five testing layers:

```
+-------------------------------------------------------------------+
| 5. Report Fidelity & Invariant Tests (Ledger, Weights, PDF match)  |
+-------------------------------------------------------------------+
| 4. Browser End-to-End Tests (Playwright: Desktop, Tablet, Mobile) |
+-------------------------------------------------------------------+
| 3. Subsystem Integration Tests (Crawler, Storage, Provider Mocks)  |
+-------------------------------------------------------------------+
| 2. Property & Boundary Security Tests (SSRF, Rebinding, Decompress)|
+-------------------------------------------------------------------+
| 1. Unit Tests (Pure Functions: Rules, Scoring, HTML Parsers)      |
+-------------------------------------------------------------------+
```

### 1.1 Unit Tests (`src/**/*.test.ts`)
- **URL Validation & Normalization:** Checks port restrictions, credential stripping, domain normalization.
- **HTML & Metadata Extraction:** Title, meta description, canonicals, H1-H6 outlines, Open Graph, schema.
- **58 Assessment Rules:** Every rule has dedicated tests covering `PASS`, `WARNING`, `FAIL`, `NOT_APPLICABLE`, and `UNKNOWN` cases.
- **Deterministic Scoring Engine:** Mathematical validation that test ledger points sum accurately to category and overall scores.

### 1.2 Boundary & Security Tests
- **SSRF Suite:** Rejection of RFC 1918 IPv4s, loopback IPv4/IPv6, IPv4-mapped IPv6, and link-local metadata addresses (`169.254.169.254`).
- **Redirect Revalidation:** Redirect chains pointing to internal IPs or cloud metadata endpoints are blocked.
- **Resource Limits:** Decompressed HTML bodies exceeding 2 MiB and scans exceeding 50 MiB trigger streaming truncation.
- **XSS Escaping:** Untrusted page titles containing `<script>` or event handlers render safely.

### 1.3 Integration Tests
- **Mocked External Providers:** Deterministic PageSpeed Insights and Search Console mock fixtures ensuring tests execute without paid API keys.
- **Scan Job Workflow:** Complete run from `queued` -> `discovering` -> `collecting` -> `assessing` -> `scoring` -> `report` -> `completed`.
- **Cancellation:** In-flight scan jobs transition safely to `canceled` with partial evidence preserved.

### 1.4 Browser End-to-End Tests (`e2e/*.spec.ts`)
- **Responsive Layouts:** Desktop (1440px), Tablet (768px), Mobile (390px).
- **Navigation & Routes:** Landing page `/`, Owner Report `/owner-report`, Expert Audit preview `/expert-audit`.
- **Intake Flow:** Form input validation, scan progress visualization, filter toggling, and score breakdown expansion.

### 1.5 Report Fidelity & PDF Tests
- Score points on web UI match immutable score ledger records exactly.
- Category maximum weights sum to exactly 100 points.
- Printable PDF generation preserves all scores, warnings, and limitations without clipping or missing sections.

## 2. Milestone 1 Definition of Done (Acceptance Gate)
A build is accepted for Milestone 1 if and only if:
1. `npm run typecheck` passes with zero errors under strict TypeScript.
2. `npm run lint` passes without fatal errors.
3. `npm run test` executes all unit and integration test suites with 100% pass rate.
4. `npm run test:e2e` verifies core user journeys across Desktop, Tablet, and Mobile viewports.
5. `npm run test:pdf` verifies that PDF export succeeds and reproduces web report scores accurately.
6. `npm run build` completes production Next.js compilation successfully.
7. No critical SSRF, evidence fabrication, secret leakage, or reporting integrity defects remain.
