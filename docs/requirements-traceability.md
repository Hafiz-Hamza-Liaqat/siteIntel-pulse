# SiteIntel Pulse — Requirements Traceability Matrix (Milestone 1)

This matrix maps every functional requirement, safety constraint, and architectural boundary from the source product specification (`Website_Intelligence_Growth_Audit_Platform_Spec_v1.0.docx`) and prompt to its implementation phase, test suite, and operational boundary.

| Req ID | Requirement Summary | Milestone 1 Scope | Implementation Module | Automated Test / Verification | Status |
|---|---|---|---|---|---|
| **R-INT-01** | Public URL & domain intake (e.g. `naffeez.com` or `https://naffeez.com`) | Complete | `src/lib/scanner/url-validator.ts` | `src/lib/scanner/url-validator.test.ts` | Implemented |
| **R-INT-02** | Business category, target market, language, competitor intake | Complete | `src/types/schema.ts`, `src/components/intake-form.tsx` | `src/types/schema.test.ts` | Implemented |
| **R-SEC-01** | SSRF prevention: IPv4 & IPv6 resolution & validation against RFC 1918, link-local, loopback | Complete | `src/lib/scanner/dns-safety.ts` | `src/lib/scanner/dns-safety.test.ts` | Implemented |
| **R-SEC-02** | Cloud metadata destination blocking (169.254.169.254, AWS/GCP/Azure) | Complete | `src/lib/scanner/dns-safety.ts` | `src/lib/scanner/dns-safety.test.ts` | Implemented |
| **R-SEC-03** | DNS rebinding defense & redirect re-validation | Complete | `src/lib/scanner/dns-safety.ts`, `src/lib/scanner/crawler.ts` | `src/lib/scanner/dns-safety.test.ts` | Implemented |
| **R-SEC-04** | Streaming decompressed body limits (2 MiB/page, 50 MiB/scan) | Complete | `src/lib/scanner/budget.ts`, `src/lib/scanner/crawler.ts` | `src/lib/scanner/budget.test.ts` | Implemented |
| **R-SEC-05** | Per-host rate limits & timeouts (10s default per request) | Complete | `src/lib/scanner/budget.ts` | `src/lib/scanner/budget.test.ts` | Implemented |
| **R-SEC-06** | No arbitrary code/script execution of target site in Node.js | Complete | `src/lib/scanner/html-parser.ts` | `src/lib/scanner/html-parser.test.ts` | Implemented |
| **R-CRW-01** | Entry page fetch, robots.txt, and XML sitemap parsing | Complete | `src/lib/scanner/crawler.ts` | `src/lib/scanner/crawler.test.ts` | Implemented |
| **R-CRW-02** | Internal link extraction, canonical deduplication, depth tracking | Complete | `src/lib/scanner/html-parser.ts`, `src/lib/scanner/crawler.ts` | `src/lib/scanner/crawler.test.ts` | Implemented |
| **R-CRW-03** | Separate external link verification budget | Complete | `src/lib/scanner/crawler.ts` | `src/lib/scanner/crawler.test.ts` | Implemented |
| **R-JOB-01** | State machine: queued -> validating -> discovering -> collecting -> assessing -> scoring -> report -> completed | Complete | `src/lib/scanner/job-manager.ts` | `src/lib/scanner/job-manager.test.ts` | Implemented |
| **R-JOB-02** | Scan cancellation, real progress without fake animated percentages | Complete | `src/lib/scanner/job-manager.ts` | `src/lib/scanner/job-manager.test.ts` | Implemented |
| **R-CAT-01** | Technical health & crawlability catalogue (12 pts, TCH-01..06) | Complete | `src/lib/catalogue/rules/technical-health.ts` | `src/lib/catalogue/rules/technical-health.test.ts` | Implemented |
| **R-CAT-02** | SEO technical & on-page catalogue (18 pts, SEO-01..09) | Complete | `src/lib/catalogue/rules/seo.ts` | `src/lib/catalogue/rules/seo.test.ts` | Implemented |
| **R-CAT-03** | Performance catalogue (10 pts, PERF-01..05) with lab/field clarity | Complete | `src/lib/catalogue/rules/performance.ts` | `src/lib/catalogue/rules/performance.test.ts` | Implemented |
| **R-CAT-04** | Responsive & accessibility (10 pts, RSP-01..05) with 7-viewport matrix | Complete | `src/lib/catalogue/rules/responsive.ts` | `src/lib/catalogue/rules/responsive.test.ts` | Implemented |
| **R-CAT-05** | Public security configuration (12 pts, SEC-01..06) non-invasive | Complete | `src/lib/catalogue/rules/security.ts` | `src/lib/catalogue/rules/security.test.ts` | Implemented |
| **R-CAT-06** | Observable authentication posture (8 pts, AUTH-01..04) honest limits | Complete | `src/lib/catalogue/rules/auth.ts` | `src/lib/catalogue/rules/auth.test.ts` | Implemented |
| **R-CAT-07** | Content quality & trust (10 pts, CNT-01..05) context-aware | Complete | `src/lib/catalogue/rules/content.ts` | `src/lib/catalogue/rules/content.test.ts` | Implemented |
| **R-CAT-08** | GEO/AEO & AI-search readiness (8 pts, AI-01..04) no ranking promises | Complete | `src/lib/catalogue/rules/ai.ts` | `src/lib/catalogue/rules/ai.test.ts` | Implemented |
| **R-CAT-09** | Analytics & tracking indicators (5 pts, ANA-01..05) | Complete | `src/lib/catalogue/rules/analytics.ts` | `src/lib/catalogue/rules/analytics.test.ts` | Implemented |
| **R-CAT-10** | Conversion & marketing experience (4 pts, CRO-01..04) | Complete | `src/lib/catalogue/rules/conversion.ts` | `src/lib/catalogue/rules/conversion.test.ts` | Implemented |
| **R-CAT-11** | Competitive comparison readiness (3 pts, CMP-01..03) | Complete | `src/lib/catalogue/rules/competitor.ts` | `src/lib/catalogue/rules/competitor.test.ts` | Implemented |
| **R-SCR-01** | Catalogue point allocation sums to exactly 100 points | Complete | `src/lib/catalogue/registry.ts` | `src/lib/scoring/scoring-invariants.test.ts` | Implemented |
| **R-SCR-02** | Pure TypeScript deterministic scoring engine & score ledger | Complete | `src/lib/scoring/engine.ts` | `src/lib/scoring/engine.test.ts` | Implemented |
| **R-SCR-03** | Coverage thresholds (70% catalogue, 60% category) for provisional label | Complete | `src/lib/scoring/coverage.ts` | `src/lib/scoring/coverage.test.ts` | Implemented |
| **R-REP-01** | 13-section Company A Owner Report projection | Complete | `src/lib/reports/owner-projection.ts` | `src/lib/reports/owner-projection.test.ts` | Implemented |
| **R-REP-02** | Web UI with dark dashboard theme (`#0B1220`, `#0F9D91`) and status icons | Complete | `src/app/owner-report/page.tsx`, `src/components/report/*` | `e2e/owner-report.spec.ts` | Implemented |
| **R-REP-03** | PDF generation with light print CSS, page breaks, no fabricated data | Complete | `src/lib/reports/pdf-generator.ts`, `scripts/verify-pdf.mjs` | `src/lib/reports/pdf.test.ts` | Implemented |
| **R-BND-01** | Strict separation: Milestone 2 Expert Audit preview route (`/expert-audit`) | Complete | `src/app/expert-audit/page.tsx` | `e2e/navigation.spec.ts` | Implemented |

## Milestone 2: Company B Expert Diagnostic & Growth Intelligence Report

| Req ID | Requirement Summary | Milestone 2 Scope | Implementation Module | Automated Test / Verification | Status |
|---|---|---|---|---|---|
| **R-M2-01** | Complete 19-section Expert Diagnostic Report Zod schemas | Complete | `src/types/expert-schema.ts` | `src/lib/reports/expert-projection.test.ts` | Implemented |
| **R-M2-02** | Expert projection engine preserving 56-rule scoring invariants | Complete | `src/lib/reports/expert-projection.ts` | `src/lib/reports/expert-projection.test.ts` | Implemented |
| **R-M2-03** | Redaction of authorized testing credentials, tokens, and secrets | Complete | `src/lib/reports/expert-projection.ts` | `src/lib/reports/expert-projection.test.ts` | Implemented |
| **R-M2-04** | Page inventory & URL diagnostics table with search and filters | Complete | `src/components/expert/sections/url-inventory-view.tsx` | `e2e/expert-audit.spec.ts` | Implemented |
| **R-M2-05** | Finding explorer with multi-facet filters (Category, Severity, Status, Workstream) | Complete | `src/components/expert/sections/finding-explorer-view.tsx` | `e2e/expert-audit.spec.ts` | Implemented |
| **R-M2-06** | Specialist remediation action plan with priority (P0-P3), effort & validation | Complete | `src/components/expert/sections/remediation-planner-view.tsx` | `src/lib/reports/expert-export.test.ts` | Implemented |
| **R-M2-07** | Responsive multi-viewport matrix across 7 resolutions with overflow detection | Complete | `src/components/expert/sections/responsive-matrix-view.tsx` | `e2e/expert-audit.spec.ts` | Implemented |
| **R-M2-08** | Authentication posture (passive surfaces vs authorized dynamic flows) | Complete | `src/components/expert/sections/auth-assessment-view.tsx` | `src/lib/reports/expert-projection.test.ts` | Implemented |
| **R-M2-09** | Multi-format data exporters (CSV findings, CSV inventory, CSV tasks, JSON bundle) | Complete | `src/lib/reports/expert-export.ts`, `/api/scan/expert-export` | `src/lib/reports/expert-export.test.ts` | Implemented |
| **R-M2-10** | High-fidelity A4 Expert Diagnostic PDF generator | Complete | `src/lib/reports/expert-pdf-generator.ts`, `/api/scan/expert-pdf` | `scripts/verify-expert-pdf.mjs` | Implemented |
| **R-M2-11** | Interactive Company B Diagnostic Workbench page (`/expert-audit`) | Complete | `src/app/expert-audit/page.tsx`, `src/components/expert/*` | `e2e/expert-audit.spec.ts` | Implemented |
| **R-M2-12** | Cryptographic manifest with SHA-256 integrity checksum & sign-off | Complete | `src/lib/reports/expert-export.ts`, `export-manifest-view.tsx` | `src/lib/reports/expert-export.test.ts` | Implemented |
