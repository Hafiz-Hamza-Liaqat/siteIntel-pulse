import { z } from "zod";
import {
  AssessmentCategorySchema,
  ResultStatusSchema,
  SeveritySchema,
  ConfidenceSchema,
  BusinessCategorySchema,
  BusinessCategoryDetectionSchema,
  OverallScoreSchema,
  CategoryScoreSchema,
  ResourceObservationSchema,
  CostOfInactionResultSchema,
  RuleAssessmentOutcomeSchema,
  DimensionScorecardSchema,
  AssessmentAndIssuesSummarySchema,
  type AssessmentAndIssuesSummary,
  boundedRecord,
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
  headers: boundedRecord(z.string().max(100), z.string().max(4096), 100).optional(),
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
  evidenceId: z.string().max(128),
  findingId: z.string().max(128),
  source: EvidenceSourceSchema,
  observedValue: z.any(),
  expectedCondition: z.string().max(2000),
  discrepancy: z.string().max(2000),
  reproductionSteps: z.array(z.string().max(2000)).max(50).default([]),
  validationAssertion: z.string().max(2000),
});
export type TechnicalEvidence = z.infer<typeof TechnicalEvidenceSchema>;

// 3. ExpertAssessmentResult Schema
export const ExpertAssessmentResultSchema = z.object({
  id: z.string().max(128),
  testId: z.string().max(128),
  testVersion: z.string().max(50).default("2.0.0"),
  category: AssessmentCategorySchema,
  categoryName: z.string().max(255),
  title: z.string().max(255),
  status: ResultStatusSchema,
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  affectedUrls: z.array(z.string().max(4096)).max(5000).default([]),
  totalAffectedPages: z.number().int().default(0).optional(),
  scope: z.enum(["site_wide", "page_specific", "unspecified"]).default("unspecified").optional(),
  affectedElements: z.array(z.string().max(1000)).max(500).default([]),
  technicalImpact: z.string().max(5000),
  businessImpact: z.string().max(5000),
  remediation: z.string().max(5000),
  validationProcedure: z.string().max(5000),
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
  evidence: z.array(TechnicalEvidenceSchema).max(100).default([]),
  dependencies: z.array(z.string().max(100)).max(50).default([]),
  allocatedPoints: z.number().default(0).optional(),
  evaluatedPoints: z.number().default(0).optional(),
  earnedPoints: z.number().default(0).optional(),
  scoringWeight: z.number().default(0).optional(),
  scoreContribution: z.number().default(0).optional(),
  observedValue: z.string().max(5000).optional(),
  expectedThreshold: z.string().max(5000).optional(),
  executionStatus: z.enum(["EXECUTED", "SKIPPED", "NOT_TESTED", "BLOCKED", "NOT_APPLICABLE"]).default("EXECUTED").optional(),
});
export type ExpertAssessmentResult = z.infer<typeof ExpertAssessmentResultSchema>;

// 4. PageDiagnostic Schema
export const PageDiagnosticSchema = z.object({
  url: z.string().max(4096),
  normalizedUrl: z.string().max(4096),
  statusCode: z.number(),
  responseTimeMs: z.number(),
  contentType: z.string().max(255),
  discoverySource: z.enum(["internal_link", "sitemap", "robots_txt", "seed_url"]),
  crawlDepth: z.number().int(),
  indexabilityStatus: z.enum([
    "INDEXABLE",
    "NOINDEX",
    "BLOCKED_ROBOTS",
    "ERROR",
    "REDIRECT",
    "NOT_APPLICABLE",
    "RESOURCE",
  ]),
  canonicalCandidate: z.string().max(4096).optional(),
  canonicalStatus: z.enum(["SELF", "CROSS_PAGE", "MISSING", "INVALID", "NOT_APPLICABLE"]),
  title: z.string().max(1000).optional(),
  titleLength: z.number().int().default(0),
  metaDescription: z.string().max(5000).optional(),
  metaDescriptionLength: z.number().int().default(0),
  headingsOutline: z.object({
    h1: z.array(z.string().max(2000)).max(200).default([]),
    h2: z.array(z.string().max(2000)).max(500).default([]),
    h3: z.array(z.string().max(2000)).max(1000).default([]),
  }),
  wordCount: z.number().int().default(0),
  internalLinksCount: z.number().int().default(0),
  outboundLinksCount: z.number().int().default(0),
  resourcesCount: z.number().int().default(0),
  structuredDataTypes: z.array(z.string().max(200)).max(100).default([]),
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
  exclusionReason: z.string().max(1000).optional(),
});
export type PageDiagnostic = z.infer<typeof PageDiagnosticSchema>;

// 5. LinkDiagnostic Schema
export const LinkDiagnosticSchema = z.object({
  id: z.string().max(128),
  sourceUrl: z.string().max(4096),
  targetUrl: z.string().max(4096),
  anchorText: z.string().max(2000),
  isInternal: z.boolean(),
  statusCode: z.number().optional(),
  isBroken: z.boolean().default(false),
  isRedirect: z.boolean().default(false),
  redirectChain: z.array(z.string().max(4096)).max(50).default([]),
  relAttributes: z.array(z.string().max(200)).max(50).default([]),
  linkLocation: z.enum(["navigation", "footer", "content", "sidebar", "unknown"]),
  issueDescription: z.string().max(2000).optional(),
});
export type LinkDiagnostic = z.infer<typeof LinkDiagnosticSchema>;

// 6. TagDiagnostic Schema
export const TagDiagnosticSchema = z.object({
  id: z.string().max(128),
  tagName: z.string().max(100),
  attributes: boundedRecord(z.string().max(100), z.string().max(4096), 100).default({}),
  pageUrl: z.string().max(4096),
  domLocation: z.string().max(1000).optional(),
  status: z.enum(["VALID", "WARNING", "MALFORMED", "MISSING"]),
  notes: z.string().max(2000).optional(),
});
export type TagDiagnostic = z.infer<typeof TagDiagnosticSchema>;

// 7. IntegrationDiagnostic Schema
export const IntegrationDiagnosticSchema = z.object({
  id: z.string().max(128),
  name: z.string().max(255),
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
  detectedClues: z.array(z.string().max(1000)).max(100).default([]),
  scriptUrls: z.array(z.string().max(4096)).max(200).default([]),
  notes: z.string().max(5000).default(""),
});
export type IntegrationDiagnostic = z.infer<typeof IntegrationDiagnosticSchema>;

// 8. ResponsiveDiagnostic Schema
export const ResponsiveDiagnosticSchema = z.object({
  viewport: z.number().int(),
  pageUrl: z.string().max(4096),
  status: z.enum(["TESTED", "NOT_TESTED", "SKIPPED"]).default("TESTED").optional(),
  horizontalOverflow: z.boolean().default(false),
  overflowElements: z.array(z.string().max(1000)).max(200).default([]),
  touchTargetIssues: z.number().int().default(0),
  touchTargetSelectors: z.array(z.string().max(1000)).max(200).default([]),
  clippingIssues: z.number().int().default(0),
  accessibleNameIssues: z.number().int().default(0),
  screenshotAvailable: z.boolean().default(false),
  screenshotPath: z.string().max(4096).optional(),
  severity: SeveritySchema,
  notes: z.string().max(5000).optional(),
});
export type ResponsiveDiagnostic = z.infer<typeof ResponsiveDiagnosticSchema>;

// Visual Design Diagnostic Schema
export const VisualDesignDiagnosticSchema = z.object({
  status: z.enum(["TESTED", "NOT_TESTED", "SKIPPED"]).default("NOT_TESTED"),
  colorContrast: z.object({
    status: z.enum(["PASS", "WARNING", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    testedElementsCount: z.number().int().default(0),
    contrastFailuresCount: z.number().int().default(0),
    sampleRatio: z.string().max(100).optional(),
    failingSelectors: z.array(z.string().max(1000)).max(200).default([]),
  }),
  typography: z.object({
    status: z.enum(["PASS", "WARNING", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    bodyFontSizeMobilePx: z.number().nullable().optional(),
    bodyFontSizeDesktopPx: z.number().nullable().optional(),
    headingHierarchyMaintained: z.boolean().default(true),
    notes: z.string().max(2000).optional(),
  }),
  layoutAndSpacing: z.object({
    status: z.enum(["PASS", "WARNING", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    unintendedOverlapCount: z.number().int().default(0),
    clippingCount: z.number().int().default(0),
    brokenImagesCount: z.number().int().default(0),
    brokenImageUrls: z.array(z.string().max(4096)).max(200).default([]),
  }),
  controlsAndConsistency: z.object({
    status: z.enum(["PASS", "WARNING", "FAIL", "NOT_TESTED"]).default("NOT_TESTED"),
    touchTargetDefectsCount: z.number().int().default(0),
    accessibleNameDefectsCount: z.number().int().default(0),
    defectiveSelectors: z.array(z.string().max(1000)).max(200).default([]),
  }),
  themeAdaptability: z.object({
    themeColorMeta: z.string().max(100).nullable().optional(),
    supportsDarkMode: z.boolean().default(false),
    prefersColorSchemeObserved: z.boolean().default(false),
    observableThemeVariant: z.string().max(100).optional(),
  }),
  testedViewportWidths: z.array(z.number().int()).max(20).default([]),
  limitations: z.string().max(2000).default("Automated visual heuristic measurement; does not replace human aesthetic design evaluation."),
});
export type VisualDesignDiagnostic = z.infer<typeof VisualDesignDiagnosticSchema>;

// 9. SecurityDiagnostic Schema
export const SecurityDiagnosticSchema = z.object({
  id: z.string().max(128),
  title: z.string().max(255),
  scope: z.enum(["public_passive", "authorized_active"]),
  testedEndpoint: z.string().max(4096),
  headerName: z.string().max(100).optional(),
  observedValue: z.string().max(5000).optional(),
  expectedValue: z.string().max(5000).optional(),
  severity: SeveritySchema,
  exploitabilityNote: z.string().max(5000),
  remediation: z.string().max(5000),
});
export type SecurityDiagnostic = z.infer<typeof SecurityDiagnosticSchema>;

// 10. AuthenticationDiagnostic Schema
export const AuthenticationDiagnosticSchema = z.object({
  isAuthorized: z.boolean().default(false),
  testAccountUsed: z.string().max(255).optional(),
  publicLoginSurfaces: z.array(
    z.object({
      url: z.string().max(4096),
      isHttps: z.boolean(),
      hasCsrfClue: z.boolean(),
      hasAutocompleteProtection: z.boolean(),
    })
  ).max(50).default([]),
  testedFlows: z.array(
    z.object({
      flowName: z.string().max(255),
      status: z.enum(["PASS", "WARNING", "FAIL", "NOT_TESTED"]),
      details: z.string().max(5000),
    })
  ).max(50).default([]),
  sessionSecurity: z.object({
    cookieSecure: z.boolean().nullable().optional(),
    cookieHttpOnly: z.boolean().nullable().optional(),
    cookieSameSite: z.string().max(50).nullable().optional(),
    expiryObserved: z.string().max(100).nullable().optional(),
    cookiesObserved: z.number().int().default(0).optional(),
    status: z.enum(["OBSERVED", "NO_COOKIES_OBSERVED", "UNKNOWN"]).default("UNKNOWN").optional(),
  }),
  mfaIndicators: z.object({
    observed: z.boolean(),
    method: z.string().max(100),
    note: z.string().max(2000),
  }),
  untestedControls: z.array(z.string().max(500)).max(100).default([]),
});
export type AuthenticationDiagnostic = z.infer<typeof AuthenticationDiagnosticSchema>;

// 11. CompetitorComparison Schema
export const CompetitorComparisonSchema = z.object({
  domain: z.string().max(255),
  status: z.enum(["AVAILABLE", "NOT_ASSESSED"]).default("NOT_ASSESSED").optional(),
  overallScore: z.number().min(0).max(100).nullable().optional(),
  categoryScores: boundedRecord(z.string().max(50), z.number(), 20).optional(),
  detectedTechnologies: z.array(z.string().max(200)).max(100).default([]),
  keyStrengths: z.array(z.string().max(1000)).max(50).default([]),
  keyWeaknesses: z.array(z.string().max(1000)).max(50).default([]),
  dataProvenance: z.string().max(1000),
  isEstimated: z.boolean().default(false),
});
export type CompetitorComparison = z.infer<typeof CompetitorComparisonSchema>;

// 12. ExternalMetric Schema
export const ExternalMetricSchema = z.object({
  metricName: z.string().max(100),
  value: z.union([z.number(), z.string().max(1000)]).nullable(),
  formattedValue: z.string().max(100),
  source: z.string().max(255),
  status: z.enum([
    "CONNECTED",
    "NOT_CONNECTED",
    "UNAVAILABLE",
    "ESTIMATED",
    "UNKNOWN",
    "NOT_TESTED",
  ]),
  period: z.string().max(100).optional(),
  retrievedAt: z.string().max(100).optional(),
  provenanceNote: z.string().max(1000),
});
export type ExternalMetric = z.infer<typeof ExternalMetricSchema>;

// 13. RemediationTask Schema
export const RemediationTaskSchema = z.object({
  id: z.string().max(128),
  title: z.string().max(255),
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
  findingIds: z.array(z.string().max(128)).max(100),
  affectedUrls: z.array(z.string().max(4096)).max(5000).default([]),
  estimatedEffort: z.enum(["QUICK_FIX", "MODERATE", "COMPLEX", "STRATEGIC"]),
  estimatedHours: z.number().optional(),
  actionSteps: z.array(z.string().max(2000)).max(50),
  validationProcedure: z.string().max(5000),
  dependencies: z.array(z.string().max(128)).max(50).default([]),
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
  title: z.string().max(255),
  taskCount: z.number().int().default(0),
  criticalCount: z.number().int().default(0),
  estimatedHours: z.number().int().optional(),
  hoursRange: z.string().max(100).optional(),
  estimatedEffortSummary: z.string().max(2000),
  recommendedSpecialist: z.string().max(255),
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
  ineligibleCategories: z.array(z.string().max(100)).max(50).default([]),
});
export type ReportCoverage = z.infer<typeof ReportCoverageSchema>;

// 16. ExpertReportMetadata Schema
export const ExpertReportMetadataSchema = z.object({
  reportId: z.string().max(128),
  scanId: z.string().max(128),
  tenantId: z.string().max(128).optional(),
  reportVersion: z.string().max(50).default("2.0.0"),
  generatedAt: z.string().max(100),
  companyA: z.object({
    name: z.string().max(255),
    domain: z.string().max(255),
    targetUrl: z.string().max(4096),
    businessCategory: BusinessCategorySchema,
    businessCategoryDetection: BusinessCategoryDetectionSchema.optional(),
    targetMarket: z.string().max(50),
    preferredLanguage: z.string().max(50),
    businessGoal: z.string().max(5000).optional(),
    targetAudience: z.string().max(5000).optional(),
  }),
  companyB: z.object({
    name: z.string().max(255).default("Company B Technical Advisory"),
    auditorRole: z.string().max(255).default("Technical Solutions & SEO Team"),
    contact: z.string().max(255).optional(),
  }),
  authorization: z.object({
    isAuthorizedForAuthScan: z.boolean().default(false),
    repositoryUrl: z.string().max(4096).optional(),
    repositoryAuthorized: z.boolean().default(false),
    connectedIntegrations: z.array(z.string().max(100)).max(50).default([]),
  }),
  scopeAndBoundaries: z.string().max(10000),
});
export type ExpertReportMetadata = z.infer<typeof ExpertReportMetadataSchema>;

// 17. ExpertPlatformProfile Schema
export const ExpertPlatformProfileSchema = z.object({
  cmsCategory: z.string().max(100),
  frameworkHints: z.array(z.string().max(200)).max(50).default([]),
  serverCdnClues: z.array(z.string().max(200)).max(50).default([]),
  clientTechnologies: z.array(z.string().max(200)).max(100).default([]),
  aiIntegrationClues: z.array(z.string().max(200)).max(50).default([]),
  confidence: ConfidenceSchema,
  repositoryClues: z.string().max(2000).optional(),
});
export type ExpertPlatformProfile = z.infer<typeof ExpertPlatformProfileSchema>;

// 18. ExpertExportManifest Schema
export const ExpertExportManifestSchema = z.object({
  exportId: z.string().max(128),
  reportId: z.string().max(128),
  scanId: z.string().max(128),
  version: z.string().max(50).default("2.0.0"),
  generatedAt: z.string().max(100),
  digestScope: z.string().max(500).default("Canonical JSON representation of report core: metadata, executiveSummary, findings, platformProfile, and scoring").optional(),
  checksum: z.string().max(255).optional(),
  pdfSha256: z.string().max(255).nullable().optional(),
  verificationStatus: z.enum(["DIGEST_GENERATED", "VERIFIED", "TAMPERED", "NOT_VERIFIED"]).default("DIGEST_GENERATED").optional(),
  formats: z.array(z.enum(["pdf", "json", "csv"])).max(10).default(["pdf", "json", "csv"]),
  dataSourceLimitations: z.array(z.string().max(1000)).max(50).default([]),
});
export type ExpertExportManifest = z.infer<typeof ExpertExportManifestSchema>;

// 19. ExpertReport Composite Root Schema
export const ExpertReportSchema = z.object({
  metadata: ExpertReportMetadataSchema,
  executiveSummary: z.object({
    overallScore: OverallScoreSchema,
    categoryScores: z.array(CategoryScoreSchema).max(50),
    issueTotals: z.object({
      critical: z.number().int().default(0),
      high: z.number().int().default(0),
      medium: z.number().int().default(0),
      low: z.number().int().default(0),
      informational: z.number().int().default(0).optional(),
      total: z.number().int().default(0),
    }),
    workstreamEstimates: z.array(WorkstreamEstimateSchema).max(50).default([]),
  }),
  platformProfile: ExpertPlatformProfileSchema,
  urlInventory: z.array(PageDiagnosticSchema).max(1000).default([]),
  seoDiagnostics: z.object({
    metadataFindings: z.array(ExpertAssessmentResultSchema).max(500).default([]),
    headingHierarchy: boundedRecord(z.string().max(50), z.any(), 20).default({}),
    structuredDataEntities: z.array(boundedRecord(z.string().max(100), z.any(), 100)).max(200).default([]),
  }),
  linkAudit: z.object({
    internalLinks: z.array(LinkDiagnosticSchema).max(10000).default([]),
    outboundLinks: z.array(LinkDiagnosticSchema).max(5000).default([]),
    brokenLinks: z.array(LinkDiagnosticSchema).max(5000).default([]),
    orphanCandidates: z.array(z.string().max(4096)).max(1000).default([]),
  }),
  integrations: z.array(IntegrationDiagnosticSchema).max(100).default([]),
  performanceDiagnostics: z.object({
    labScores: boundedRecord(z.string().max(50), z.any(), 20).default({}),
    coreWebVitals: boundedRecord(z.string().max(50), z.any(), 20).default({}),
    blockingResources: z.array(ResourceObservationSchema).max(2000).default([]),
    imageDiagnostics: z.array(boundedRecord(z.string().max(100), z.any(), 50)).max(1000).default([]),
  }),
  responsiveDiagnostics: z.array(ResponsiveDiagnosticSchema).max(100).default([]),
  visualDesign: VisualDesignDiagnosticSchema.optional(),
  securityDiagnostics: z.array(SecurityDiagnosticSchema).max(100).default([]),
  authenticationAssessment: AuthenticationDiagnosticSchema,
  geoAeoDiagnostics: z.object({
    crawlerPolicies: boundedRecord(z.string().max(100), z.string().max(1000), 50).default({}),
    directAnswerReadiness: boundedRecord(z.string().max(100), z.any(), 50).default({}),
    aiAssistanceClues: boundedRecord(z.string().max(100), z.any(), 50).default({}),
    aiContentRiskSignal: z
      .object({
        riskLevel: z.enum([
          "LOW_RISK",
          "MODERATE_PATTERN_RISK",
          "HIGH_PATTERN_RISK",
          "UNASSESSED",
        ]),
        heuristicsObserved: z.object({
          templateRepetitionRatio: z.number().optional(),
          originalitySignals: z.array(z.string().max(500)).max(50).default([]),
          substantiationFound: z.boolean().default(false),
          freshnessDateFound: z.boolean().default(false),
          authorshipContextObserved: z.boolean().default(false),
        }),
        disclaimer: z.string().max(2000),
        notes: z.string().max(5000),
      })
      .optional(),
  }),
  analyticsAndMetrics: z.array(ExternalMetricSchema).max(100).default([]),
  competitorComparisons: z.array(CompetitorComparisonSchema).max(20).default([]),
  remediationRegister: z.array(RemediationTaskSchema).max(200).default([]),
  findings: z.array(ExpertAssessmentResultSchema).max(500).default([]),
  ruleLedger: z.array(RuleAssessmentOutcomeSchema).max(200).default([]).optional(),
  dimensionScorecards: z.array(DimensionScorecardSchema).max(50).default([]).optional(),
  assessmentAndIssuesSummary: AssessmentAndIssuesSummarySchema.optional(),
  costOfInaction: CostOfInactionResultSchema.optional(),
  coverage: ReportCoverageSchema,
  exportManifest: ExpertExportManifestSchema,
});
export type ExpertReport = z.infer<typeof ExpertReportSchema>;
