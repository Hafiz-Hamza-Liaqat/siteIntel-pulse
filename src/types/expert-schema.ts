import { z } from "zod";
import {
  AssessmentCategorySchema,
  ResultStatusSchema,
  SeveritySchema,
  ConfidenceSchema,
  BusinessCategorySchema,
  OverallScoreSchema,
  CategoryScoreSchema,
  ResourceObservationSchema,
} from "./schema";

// 1. EvidenceSource Schema
export const EvidenceSourceSchema = z.object({
  id: z.string(),
  type: z.enum([
    "crawler_http",
    "html_parser",
    "playwright_browser",
    "pagespeed_api",
    "authorized_auth",
    "external_provider",
    "mock_fixture",
  ]),
  timestamp: z.string(),
  location: z.string(),
  selector: z.string().optional(),
  attribute: z.string().optional(),
  rawSnippet: z.string().optional(),
  headers: z.record(z.string()).optional(),
  viewport: z
    .object({
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  confidence: ConfidenceSchema,
});
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

// 2. TechnicalEvidence Schema
export const TechnicalEvidenceSchema = z.object({
  evidenceId: z.string(),
  findingId: z.string(),
  source: EvidenceSourceSchema,
  observedValue: z.any(),
  expectedCondition: z.string(),
  discrepancy: z.string(),
  reproductionSteps: z.array(z.string()).default([]),
  validationAssertion: z.string(),
});
export type TechnicalEvidence = z.infer<typeof TechnicalEvidenceSchema>;

// 3. ExpertAssessmentResult Schema
export const ExpertAssessmentResultSchema = z.object({
  id: z.string(),
  testId: z.string(),
  testVersion: z.string().default("2.0.0"),
  category: AssessmentCategorySchema,
  categoryName: z.string(),
  title: z.string(),
  status: ResultStatusSchema,
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  affectedUrls: z.array(z.string()).default([]),
  totalAffectedPages: z.number().int().default(0).optional(),
  scope: z.enum(["site_wide", "page_specific", "unspecified"]).default("unspecified").optional(),
  affectedElements: z.array(z.string()).default([]),
  technicalImpact: z.string(),
  businessImpact: z.string(),
  remediation: z.string(),
  validationProcedure: z.string(),
  workstream: z.enum([
    "seo",
    "performance",
    "security",
    "accessibility",
    "analytics",
    "content",
    "ai_automation",
    "engineering",
  ]),
  estimatedEffort: z.enum(["QUICK_FIX", "MODERATE", "COMPLEX", "STRATEGIC"]),
  evidence: z.array(TechnicalEvidenceSchema).default([]),
  dependencies: z.array(z.string()).default([]),
});
export type ExpertAssessmentResult = z.infer<typeof ExpertAssessmentResultSchema>;

// 4. PageDiagnostic Schema
export const PageDiagnosticSchema = z.object({
  url: z.string(),
  normalizedUrl: z.string(),
  statusCode: z.number(),
  responseTimeMs: z.number(),
  contentType: z.string(),
  discoverySource: z.enum(["internal_link", "sitemap", "robots_txt", "seed_url"]),
  crawlDepth: z.number().int(),
  indexabilityStatus: z.enum([
    "INDEXABLE",
    "NOINDEX",
    "BLOCKED_ROBOTS",
    "ERROR",
    "REDIRECT",
  ]),
  canonicalCandidate: z.string().optional(),
  canonicalStatus: z.enum(["SELF", "CROSS_PAGE", "MISSING", "INVALID"]),
  title: z.string().optional(),
  titleLength: z.number().int().default(0),
  metaDescription: z.string().optional(),
  metaDescriptionLength: z.number().int().default(0),
  headingsOutline: z.object({
    h1: z.array(z.string()).default([]),
    h2: z.array(z.string()).default([]),
    h3: z.array(z.string()).default([]),
  }),
  wordCount: z.number().int().default(0),
  internalLinksCount: z.number().int().default(0),
  outboundLinksCount: z.number().int().default(0),
  resourcesCount: z.number().int().default(0),
  structuredDataTypes: z.array(z.string()).default([]),
  findingsCount: z.object({
    critical: z.number().int().default(0),
    high: z.number().int().default(0),
    medium: z.number().int().default(0),
    low: z.number().int().default(0),
  }),
  testStatus: z.enum([
    "FULLY_TESTED",
    "PARTIALLY_TESTED",
    "SKIPPED",
    "BLOCKED",
    "FAILED",
  ]),
  exclusionReason: z.string().optional(),
});
export type PageDiagnostic = z.infer<typeof PageDiagnosticSchema>;

// 5. LinkDiagnostic Schema
export const LinkDiagnosticSchema = z.object({
  id: z.string(),
  sourceUrl: z.string(),
  targetUrl: z.string(),
  anchorText: z.string(),
  isInternal: z.boolean(),
  statusCode: z.number().optional(),
  isBroken: z.boolean().default(false),
  isRedirect: z.boolean().default(false),
  redirectChain: z.array(z.string()).default([]),
  relAttributes: z.array(z.string()).default([]),
  linkLocation: z.enum(["navigation", "footer", "content", "sidebar", "unknown"]),
  issueDescription: z.string().optional(),
});
export type LinkDiagnostic = z.infer<typeof LinkDiagnosticSchema>;

// 6. TagDiagnostic Schema
export const TagDiagnosticSchema = z.object({
  id: z.string(),
  tagName: z.string(),
  attributes: z.record(z.string()).default({}),
  pageUrl: z.string(),
  domLocation: z.string().optional(),
  status: z.enum(["VALID", "WARNING", "MALFORMED", "MISSING"]),
  notes: z.string().optional(),
});
export type TagDiagnostic = z.infer<typeof TagDiagnosticSchema>;

// 7. IntegrationDiagnostic Schema
export const IntegrationDiagnosticSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum([
    "analytics",
    "marketing",
    "chat",
    "security",
    "cms",
    "ai_assistant",
  ]),
  state: z.enum([
    "NOT_DETECTED",
    "DETECTED",
    "LOAD_OBSERVED",
    "BEHAVIOR_VERIFIED",
    "FAILED",
    "CONSENT_DEPENDENT",
    "UNKNOWN",
    "NOT_TESTED",
  ]),
  detectedClues: z.array(z.string()).default([]),
  scriptUrls: z.array(z.string()).default([]),
  notes: z.string().default(""),
});
export type IntegrationDiagnostic = z.infer<typeof IntegrationDiagnosticSchema>;

// 8. ResponsiveDiagnostic Schema
export const ResponsiveDiagnosticSchema = z.object({
  viewport: z.number().int(),
  pageUrl: z.string(),
  status: z.enum(["TESTED", "NOT_TESTED", "SKIPPED"]).default("TESTED").optional(),
  horizontalOverflow: z.boolean().default(false),
  overflowElements: z.array(z.string()).default([]),
  touchTargetIssues: z.number().int().default(0),
  touchTargetSelectors: z.array(z.string()).default([]),
  clippingIssues: z.number().int().default(0),
  accessibleNameIssues: z.number().int().default(0),
  screenshotAvailable: z.boolean().default(false),
  screenshotPath: z.string().optional(),
  severity: SeveritySchema,
  notes: z.string().optional(),
});
export type ResponsiveDiagnostic = z.infer<typeof ResponsiveDiagnosticSchema>;

// 9. SecurityDiagnostic Schema
export const SecurityDiagnosticSchema = z.object({
  id: z.string(),
  title: z.string(),
  scope: z.enum(["public_passive", "authorized_active"]),
  testedEndpoint: z.string(),
  headerName: z.string().optional(),
  observedValue: z.string().optional(),
  expectedValue: z.string().optional(),
  severity: SeveritySchema,
  exploitabilityNote: z.string(),
  remediation: z.string(),
});
export type SecurityDiagnostic = z.infer<typeof SecurityDiagnosticSchema>;

// 10. AuthenticationDiagnostic Schema
export const AuthenticationDiagnosticSchema = z.object({
  isAuthorized: z.boolean().default(false),
  testAccountUsed: z.string().optional(),
  publicLoginSurfaces: z.array(
    z.object({
      url: z.string(),
      isHttps: z.boolean(),
      hasCsrfClue: z.boolean(),
      hasAutocompleteProtection: z.boolean(),
    })
  ).default([]),
  testedFlows: z.array(
    z.object({
      flowName: z.string(),
      status: z.enum(["PASS", "WARNING", "FAIL", "NOT_TESTED"]),
      details: z.string(),
    })
  ).default([]),
  sessionSecurity: z.object({
    cookieSecure: z.boolean().nullable().optional(),
    cookieHttpOnly: z.boolean().nullable().optional(),
    cookieSameSite: z.string().nullable().optional(),
    expiryObserved: z.string().nullable().optional(),
    cookiesObserved: z.number().int().default(0).optional(),
    status: z.enum(["OBSERVED", "NO_COOKIES_OBSERVED", "UNKNOWN"]).default("UNKNOWN").optional(),
  }),
  mfaIndicators: z.object({
    observed: z.boolean(),
    method: z.string(),
    note: z.string(),
  }),
  untestedControls: z.array(z.string()).default([]),
});
export type AuthenticationDiagnostic = z.infer<typeof AuthenticationDiagnosticSchema>;

// 11. CompetitorComparison Schema
export const CompetitorComparisonSchema = z.object({
  domain: z.string(),
  status: z.enum(["AVAILABLE", "NOT_ASSESSED"]).default("NOT_ASSESSED").optional(),
  overallScore: z.number().min(0).max(100).nullable().optional(),
  categoryScores: z.record(z.string(), z.number()).optional(),
  detectedTechnologies: z.array(z.string()).default([]),
  keyStrengths: z.array(z.string()).default([]),
  keyWeaknesses: z.array(z.string()).default([]),
  dataProvenance: z.string(),
  isEstimated: z.boolean().default(false),
});
export type CompetitorComparison = z.infer<typeof CompetitorComparisonSchema>;

// 12. ExternalMetric Schema
export const ExternalMetricSchema = z.object({
  metricName: z.string(),
  value: z.union([z.number(), z.string()]).nullable(),
  formattedValue: z.string(),
  source: z.string(),
  status: z.enum([
    "CONNECTED",
    "NOT_CONNECTED",
    "UNAVAILABLE",
    "ESTIMATED",
    "UNKNOWN",
    "NOT_TESTED",
  ]),
  period: z.string().optional(),
  retrievedAt: z.string().optional(),
  provenanceNote: z.string(),
});
export type ExternalMetric = z.infer<typeof ExternalMetricSchema>;

// 13. RemediationTask Schema
export const RemediationTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  workstream: z.enum([
    "seo",
    "performance",
    "security",
    "accessibility",
    "analytics",
    "content",
    "ai_automation",
    "engineering",
  ]),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  status: z.enum(["PLANNED", "IN_PROGRESS", "RESOLVED", "ACCEPTED_RISK", "BLOCKED"]).default("PLANNED"),
  findingIds: z.array(z.string()),
  affectedUrls: z.array(z.string()).default([]),
  estimatedEffort: z.enum(["QUICK_FIX", "MODERATE", "COMPLEX", "STRATEGIC"]),
  estimatedHours: z.number().optional(),
  actionSteps: z.array(z.string()),
  validationProcedure: z.string(),
  dependencies: z.array(z.string()).default([]),
});
export type RemediationTask = z.infer<typeof RemediationTaskSchema>;

// 14. WorkstreamEstimate Schema
export const WorkstreamEstimateSchema = z.object({
  workstream: z.enum([
    "seo",
    "performance",
    "security",
    "accessibility",
    "analytics",
    "content",
    "ai_automation",
    "engineering",
  ]),
  title: z.string(),
  taskCount: z.number().int().default(0),
  criticalCount: z.number().int().default(0),
  estimatedEffortSummary: z.string(),
  recommendedSpecialist: z.string(),
});
export type WorkstreamEstimate = z.infer<typeof WorkstreamEstimateSchema>;

// 15. ReportCoverage Schema
export const ReportCoverageSchema = z.object({
  discoveredPages: z.number().int().nonnegative(),
  testedPages: z.number().int().nonnegative(),
  skippedPages: z.number().int().nonnegative(),
  failedPages: z.number().int().nonnegative(),
  totalBytesFetched: z.number().int().nonnegative(),
  totalPagesBudget: z.number().int().positive(),
  crawlDepthReached: z.number().int().nonnegative(),
  isExhaustive: z.boolean().default(false),
  weightedPointsEvaluated: z.number().nonnegative(),
  coveragePercentage: z.number().min(0).max(100),
  ineligibleCategories: z.array(z.string()).default([]),
});
export type ReportCoverage = z.infer<typeof ReportCoverageSchema>;

// 16. ExpertReportMetadata Schema
export const ExpertReportMetadataSchema = z.object({
  reportId: z.string(),
  scanId: z.string(),
  tenantId: z.string().optional(),
  reportVersion: z.string().default("2.0.0"),
  generatedAt: z.string(),
  companyA: z.object({
    name: z.string(),
    domain: z.string(),
    targetUrl: z.string(),
    businessCategory: BusinessCategorySchema,
    targetMarket: z.string(),
    preferredLanguage: z.string(),
    businessGoal: z.string().optional(),
    targetAudience: z.string().optional(),
  }),
  companyB: z.object({
    name: z.string().default("Company B Technical Advisory"),
    auditorRole: z.string().default("Technical Solutions & SEO Team"),
    contact: z.string().optional(),
  }),
  authorization: z.object({
    isAuthorizedForAuthScan: z.boolean().default(false),
    repositoryUrl: z.string().optional(),
    repositoryAuthorized: z.boolean().default(false),
    connectedIntegrations: z.array(z.string()).default([]),
  }),
  scopeAndBoundaries: z.string(),
});
export type ExpertReportMetadata = z.infer<typeof ExpertReportMetadataSchema>;

// 17. ExpertPlatformProfile Schema
export const ExpertPlatformProfileSchema = z.object({
  cmsCategory: z.string(),
  frameworkHints: z.array(z.string()).default([]),
  serverCdnClues: z.array(z.string()).default([]),
  clientTechnologies: z.array(z.string()).default([]),
  aiIntegrationClues: z.array(z.string()).default([]),
  confidence: ConfidenceSchema,
  repositoryClues: z.string().optional(),
});
export type ExpertPlatformProfile = z.infer<typeof ExpertPlatformProfileSchema>;

// 18. ExpertExportManifest Schema
export const ExpertExportManifestSchema = z.object({
  exportId: z.string(),
  reportId: z.string(),
  scanId: z.string(),
  version: z.string().default("2.0.0"),
  generatedAt: z.string(),
  digestScope: z.string().default("Canonical JSON representation of report core: metadata, executiveSummary, findings, platformProfile, and scoring").optional(),
  checksum: z.string().optional(),
  pdfSha256: z.string().nullable().optional(),
  verificationStatus: z.enum(["DIGEST_GENERATED", "VERIFIED", "TAMPERED", "NOT_VERIFIED"]).default("DIGEST_GENERATED").optional(),
  formats: z.array(z.enum(["pdf", "json", "csv"])).default(["pdf", "json", "csv"]),
  dataSourceLimitations: z.array(z.string()).default([]),
});
export type ExpertExportManifest = z.infer<typeof ExpertExportManifestSchema>;

// 19. ExpertReport Composite Root Schema
export const ExpertReportSchema = z.object({
  metadata: ExpertReportMetadataSchema,
  executiveSummary: z.object({
    overallScore: OverallScoreSchema,
    categoryScores: z.array(CategoryScoreSchema),
    issueTotals: z.object({
      critical: z.number().int().default(0),
      high: z.number().int().default(0),
      medium: z.number().int().default(0),
      low: z.number().int().default(0),
      total: z.number().int().default(0),
    }),
    workstreamEstimates: z.array(WorkstreamEstimateSchema).default([]),
  }),
  platformProfile: ExpertPlatformProfileSchema,
  urlInventory: z.array(PageDiagnosticSchema).default([]),
  seoDiagnostics: z.object({
    metadataFindings: z.array(ExpertAssessmentResultSchema).default([]),
    headingHierarchy: z.record(z.string(), z.any()).default({}),
    structuredDataEntities: z.array(z.record(z.string(), z.any())).default([]),
  }),
  linkAudit: z.object({
    internalLinks: z.array(LinkDiagnosticSchema).default([]),
    outboundLinks: z.array(LinkDiagnosticSchema).default([]),
    brokenLinks: z.array(LinkDiagnosticSchema).default([]),
    orphanCandidates: z.array(z.string()).default([]),
  }),
  integrations: z.array(IntegrationDiagnosticSchema).default([]),
  performanceDiagnostics: z.object({
    labScores: z.record(z.string(), z.any()).default({}),
    coreWebVitals: z.record(z.string(), z.any()).default({}),
    blockingResources: z.array(ResourceObservationSchema).default([]),
    imageDiagnostics: z.array(z.record(z.string(), z.any())).default([]),
  }),
  responsiveDiagnostics: z.array(ResponsiveDiagnosticSchema).default([]),
  securityDiagnostics: z.array(SecurityDiagnosticSchema).default([]),
  authenticationAssessment: AuthenticationDiagnosticSchema,
  geoAeoDiagnostics: z.object({
    crawlerPolicies: z.record(z.string(), z.string()).default({}),
    directAnswerReadiness: z.record(z.string(), z.any()).default({}),
    aiAssistanceClues: z.record(z.string(), z.any()).default({}),
  }),
  analyticsAndMetrics: z.array(ExternalMetricSchema).default([]),
  competitorComparisons: z.array(CompetitorComparisonSchema).default([]),
  remediationRegister: z.array(RemediationTaskSchema).default([]),
  findings: z.array(ExpertAssessmentResultSchema).default([]),
  coverage: ReportCoverageSchema,
  exportManifest: ExpertExportManifestSchema,
});
export type ExpertReport = z.infer<typeof ExpertReportSchema>;
