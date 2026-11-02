import { z } from "zod";

/**
 * Reusable bounded record helper for Zod v3.
 * Enforces key and value constraints with a strict PRE-VALIDATION bound on total key count
 * before inner values are recursively parsed, preventing CPU and memory exhaustion (GHSA-mrhx-c7xc-m3w5).
 */
export function boundedRecord<V extends z.ZodTypeAny>(
  valueSchema: V,
  maxKeys?: number
): z.ZodPipeline<z.ZodEffects<z.ZodUnknown, unknown, unknown>, z.ZodRecord<z.ZodString, V>>;
export function boundedRecord<K extends z.ZodTypeAny, V extends z.ZodTypeAny>(
  keySchema: K,
  valueSchema: V,
  maxKeys?: number
): z.ZodPipeline<z.ZodEffects<z.ZodUnknown, unknown, unknown>, z.ZodRecord<K, V>>;
export function boundedRecord(...args: any[]) {
  let keySchema: z.ZodTypeAny = z.string().max(255);
  let valueSchema: z.ZodTypeAny;
  let maxKeys = 100;

  if (args.length === 1) {
    valueSchema = args[0];
  } else if (args.length === 2) {
    if (typeof args[1] === "number") {
      valueSchema = args[0];
      maxKeys = args[1];
    } else {
      keySchema = args[0];
      valueSchema = args[1];
    }
  } else {
    keySchema = args[0];
    valueSchema = args[1];
    maxKeys = args[2] ?? 100;
  }

  const recordSchema = z.record(keySchema as any, valueSchema);

  return z
    .unknown()
    .superRefine((val, ctx) => {
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        let keyCount = 0;
        for (const key in val) {
          if (Object.prototype.hasOwnProperty.call(val, key)) {
            keyCount++;
            if (keyCount > maxKeys) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Record exceeds maximum allowed keys (${maxKeys})`,
                params: { max: maxKeys },
                fatal: true,
              });
              return z.NEVER;
            }
          }
        }
      }
    })
    .pipe(recordSchema);
}

// Result Status Enum
export const ResultStatusSchema = z.enum([
  "PASS",
  "WARNING",
  "FAIL",
  "NOT_DETECTED",
  "NOT_APPLICABLE",
  "UNKNOWN",
  "NOT_TESTED",
  "BLOCKED",
]);
export type ResultStatus = z.infer<typeof ResultStatusSchema>;

// Severity Enum
export const SeveritySchema = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFORMATIONAL",
]);
export type Severity = z.infer<typeof SeveritySchema>;

// Confidence Enum
export const ConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

// Scan Job Status Enum
export const JobStatusSchema = z.enum([
  "queued",
  "validating",
  "discovering",
  "collecting_evidence",
  "assessing",
  "scoring",
  "generating_report",
  "completed",
  "failed",
  "canceled",
  "partially_completed",
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

// Business Category Enum
export const BusinessCategorySchema = z.enum([
  "ecommerce",
  "saas",
  "marketplace",
  "job_board",
  "jobs_marketplace",
  "publisher",
  "local_service",
  "portfolio",
  "nonprofit",
  "other",
]);
export type BusinessCategory = z.infer<typeof BusinessCategorySchema>;

// Business Category Decision Source
export const CategoryDecisionSourceSchema = z.enum([
  "AUTO_DETECTED",
  "MANUALLY_OVERRIDDEN",
  "UNRESOLVED",
]);
export type CategoryDecisionSource = z.infer<typeof CategoryDecisionSourceSchema>;

// Evidence-based Automatic Business Category Detection Schema
export const BusinessCategoryDetectionSchema = z.object({
  primaryCategory: BusinessCategorySchema,
  categoryLabel: z.string().max(100),
  confidence: ConfidenceSchema,
  confidenceScore: z.number().min(0).max(1),
  evidenceSignals: z.array(z.string().max(1000)).max(100),
  alternativeCandidates: z.array(
    z.object({
      category: BusinessCategorySchema,
      label: z.string().max(100),
      score: z.number().min(0).max(1),
    })
  ).max(50).default([]),
  secondaryFacets: z.array(z.string().max(200)).max(50).default([]),
  decisionSource: CategoryDecisionSourceSchema,
  effectiveCategory: BusinessCategorySchema,
  detectorVersion: z.string().max(50).default("1.0.0"),
  detectedAt: z.string().max(100),
  uncertaintyReason: z.string().max(1000).optional(),
});
export type BusinessCategoryDetection = z.infer<typeof BusinessCategoryDetectionSchema>;

// Assessment Category Enum (11 categories)
export const AssessmentCategorySchema = z.enum([
  "technical_health",
  "seo",
  "performance",
  "responsive_accessibility",
  "public_security",
  "authentication_posture",
  "content_quality",
  "geo_aeo_ai",
  "analytics_tracking",
  "conversion_marketing",
  "competitor_comparison",
]);
export type AssessmentCategory = z.infer<typeof AssessmentCategorySchema>;

export const ReportTypeSchema = z.enum(["owner", "expert"]);
export type ReportType = z.infer<typeof ReportTypeSchema>;

// 1. ScanRequest Schema
export const ScanRequestSchema = z.object({
  targetUrl: z.string().min(1, "Website URL or domain is required").max(2048),
  reportType: ReportTypeSchema,
  platformName: z.string().max(200).optional(),
  businessCategory: z.union([BusinessCategorySchema, z.literal("auto")]).default("auto"),
  manualCategoryOverride: BusinessCategorySchema.optional(),
  targetMarket: z.string().max(50).default("US"),
  preferredLanguage: z.string().max(50).default("en"),
  businessGoal: z.string().max(5000).optional(),
  targetAudience: z.string().max(5000).optional(),
  competitors: z.array(z.string().max(500)).max(3).default([]),
  maxPages: z.number().int().min(1).max(100).default(50),
  maxDepth: z.number().int().min(1).max(5).default(3),
  // Commercial & Financial Opportunity Inputs for Cost of Inaction Calculator
  monthlySessions: z.number().nonnegative().optional(),
  averageOrderValue: z.number().nonnegative().optional(),
  leadConversionRatePct: z.number().min(0).max(100).optional(),
  leadToCustomerRatePct: z.number().min(0).max(100).optional(),
  customerValue: z.number().nonnegative().optional(),
  subscriptionRevenue: z.number().nonnegative().optional(),
  grossMarginPct: z.number().min(0).max(100).optional(),
  currency: z.string().max(10).default("USD").optional(),
  // Milestone 2 expert audit parameters
  enableAuthorizedAudit: z.boolean().optional(),
  authTestAccount: z.string().max(255).optional(),
  authCredentialsRedacted: z.string().max(1000).optional(),
  assignedSpecialists: z.array(z.string().max(100)).max(50).optional(),
  auditScopeNotes: z.string().max(10000).optional(),
});
export type ScanRequest = z.infer<typeof ScanRequestSchema>;

// 2. ScanCoverage Schema
export const ScanCoverageSchema = z.object({
  discoveredPages: z.number().int().nonnegative(),
  htmlEligiblePages: z.number().int().nonnegative().optional(),
  testedPages: z.number().int().nonnegative(),
  skippedPages: z.number().int().nonnegative(),
  failedPages: z.number().int().nonnegative(),
  inaccessiblePages: z.number().int().nonnegative(),
  excludedDocumentTypesCount: z.number().int().nonnegative().default(0).optional(),
  totalBytesFetched: z.number().int().nonnegative(),
  totalPagesBudget: z.number().int().positive(),
  crawlDepthReached: z.number().int().nonnegative(),
  externalLinksTested: z.number().int().nonnegative(),
  resourcesTested: z.number().int().nonnegative(),
  isExhaustive: z.boolean().default(false),
  truncationReason: z.string().optional(),
  weightedPointsEvaluated: z.number().nonnegative(),
  totalWeightedPoints: z.number().default(100),
  coveragePercentage: z.number().min(0).max(100),
  discoveredUrls: z.number().int().nonnegative().optional(),
  attemptedUrls: z.number().int().nonnegative().optional(),
  successfullyTestedHtmlPages: z.number().int().nonnegative().optional(),
  nonHtmlResources: z.number().int().nonnegative().optional(),
  skippedUrls: z.number().int().nonnegative().optional(),
  blockedChecks: z.number().int().nonnegative().optional(),
  failedRequests: z.number().int().nonnegative().optional(),
});
export type ScanCoverage = z.infer<typeof ScanCoverageSchema>;

// 2b. AssessmentAndIssuesSummary Schema
export const AssessmentAndIssuesSummarySchema = z.object({
  ruleCounts: z.object({
    pass: z.number().int().nonnegative(),
    warn: z.number().int().nonnegative(),
    fail: z.number().int().nonnegative(),
    notTested: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative(),
    notApplicable: z.number().int().nonnegative(),
    totalAccounted: z.number().int().default(56),
  }),
  severityCounts: z.object({
    critical: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
    informational: z.number().int().nonnegative(),
    totalUniqueFindings: z.number().int().nonnegative(),
  }),
  technicalErrorCounts: z.object({
    failedHttpRequests: z.number().int().nonnegative(),
    http4xx5xxResponses: z.number().int().nonnegative(),
    brokenInternalLinks: z.number().int().nonnegative(),
    browserJsExceptions: z.number().int().nonnegative(),
    browserConsoleErrors: z.number().int().nonnegative(),
    failedBrowserNetworkRequests: z.number().int().nonnegative(),
    confirmedReproducibleDefects: z.union([z.number().int().nonnegative(), z.literal("NOT_TESTED")]),
  }),
  crawlScopeSummary: z.object({
    discoveredUrls: z.number().int().nonnegative(),
    attemptedUrls: z.number().int().nonnegative(),
    testedHtmlPages: z.number().int().nonnegative(),
    nonHtmlResourcesExcluded: z.number().int().nonnegative(),
    skippedUrls: z.number().int().nonnegative(),
    testedViewportsCount: z.number().int().nonnegative(),
    testedViewports: z.array(z.number()).max(20),
  }),
});
export type AssessmentAndIssuesSummary = z.infer<typeof AssessmentAndIssuesSummarySchema>;

// 3. ResourceObservation Schema
export const ResourceObservationSchema = z.object({
  id: z.string().max(128),
  url: z.string().max(4096),
  type: z.enum(["script", "stylesheet", "image", "font", "document", "other"]),
  statusCode: z.number().optional(),
  sizeBytes: z.number().optional(),
  isRenderBlocking: z.boolean().default(false).optional(),
  isThirdParty: z.boolean().default(false).optional(),
  isFailed: z.boolean().default(false).optional(),
  errorMessage: z.string().max(2000).optional(),
});
export type ResourceObservation = z.infer<typeof ResourceObservationSchema>;

// 4. LinkObservation Schema
export const LinkObservationSchema = z.object({
  id: z.string().max(128),
  sourceUrl: z.string().max(4096),
  targetUrl: z.string().max(4096),
  isInternal: z.boolean(),
  anchorText: z.string().max(2000),
  rel: z.string().max(500).optional(),
  statusCode: z.number().optional(),
  isBroken: z.boolean().default(false),
  isRedirect: z.boolean().default(false),
  redirectTarget: z.string().max(4096).optional(),
});
export type LinkObservation = z.infer<typeof LinkObservationSchema>;

// 5. PageObservation Schema
export const PageObservationSchema = z.object({
  id: z.string().max(128),
  requestedUrl: z.string().max(4096),
  normalizedUrl: z.string().max(4096),
  finalUrl: z.string().max(4096),
  statusCode: z.number(),
  responseTimeMs: z.number(),
  contentType: z.string().max(255),
  redirectHistory: z.array(z.string().max(4096)).max(100).default([]),
  title: z.string().max(1000).optional(),
  metaDescription: z.string().max(5000).optional(),
  canonicalCandidate: z.string().max(4096).optional(),
  robotsDirectives: z.array(z.string().max(500)).max(100).default([]),
  headings: z.object({
    h1: z.array(z.string().max(2000)).max(200).default([]),
    h2: z.array(z.string().max(2000)).max(500).default([]),
    h3: z.array(z.string().max(2000)).max(1000).default([]),
    h4: z.array(z.string().max(2000)).max(1000).default([]),
    h5: z.array(z.string().max(2000)).max(1000).default([]),
    h6: z.array(z.string().max(2000)).max(1000).default([]),
  }),
  visibleTextSample: z.string().max(100000).optional(),
  visibleWordCount: z.number().int().default(0),
  language: z.string().max(50).optional(),
  doctype: z.string().max(100).optional(),
  encoding: z.string().max(50).optional(),
  links: z.array(LinkObservationSchema).max(10000).default([]),
  resources: z.array(ResourceObservationSchema).max(5000).default([]),
  structuredData: z.array(boundedRecord(z.string().max(100), z.any(), 100)).max(200).default([]),
  openGraph: boundedRecord(z.string().max(100), z.string().max(2000), 100).default({}),
  favicon: z.string().max(4096).optional(),
  headers: boundedRecord(z.string().max(100), z.string().max(4096), 100).default({}),
  cookieAttributes: z.array(
    z.object({
      name: z.string().max(500),
      secure: z.boolean(),
      httpOnly: z.boolean(),
      sameSite: z.string().max(50).optional(),
    })
  ).max(500).default([]),
  pageTemplateGuess: z.string().max(100).optional(),
  templateConfidence: ConfidenceSchema.default("LOW"),
  discoveredAtDepth: z.number().int().default(0),
  discoverySource: z.enum(["entry", "sitemap", "internal_link"]).default("entry"),
  consoleErrors: z.array(z.string().max(2000)).max(500).default([]),
  isXmlSitemap: z.boolean().default(false).optional(),
  documentType: z.enum([
    "html",
    "xml_sitemap",
    "robots_txt",
    "xml",
    "image",
    "document",
    "script",
    "api_json",
    "inaccessible",
    "other",
  ]).default("html").optional(),
  metaViewport: z.string().max(500).optional(),
  forms: z.array(
    z.object({
      id: z.string().max(255).optional(),
      action: z.string().max(4096).default(""),
      method: z.string().max(20).default("GET"),
      isSecureAction: z.boolean().default(true),
      hasPasswordInput: z.boolean().default(false),
      inputsCount: z.number().int().default(0),
      hasLabels: z.boolean().default(true),
      isAuthForm: z.boolean().default(false),
    })
  ).max(200).default([]).optional(),
  themeClues: z.object({
    themeColor: z.string().max(100).optional(),
    hasDarkModeClass: z.boolean().default(false),
    colorScheme: z.string().max(100).optional(),
  }).optional(),
  isTruncated: z.boolean().default(false).optional(),
  truncationReason: z.string().max(1000).optional(),
});
export type PageObservation = z.infer<typeof PageObservationSchema>;

// 6. EvidenceRecord Schema
export const EvidenceRecordSchema = z.object({
  id: z.string(),
  testId: z.string(),
  url: z.string().optional(),
  timestamp: z.string(),
  observationType: z.string(),
  measuredValue: z.any(),
  domSelector: z.string().optional(),
  viewport: z.string().optional(),
  provenance: z.object({
    source: z.string(),
    method: z.enum(["crawler_http", "html_parser", "playwright_browser", "pagespeed_api", "mock_fixture"]),
    timestamp: z.string(),
  }),
  redactedForOwner: z.boolean().default(false),
  rawPayload: z.any().optional(),
});
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

// 7. AssessmentRule Schema
export const AssessmentRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string().default("1.0.0"),
  category: AssessmentCategorySchema,
  categoryName: z.string(),
  maxPoints: z.number().positive(),
  description: z.string(),
  businessImpactSummary: z.string(),
  remediationAdvice: z.string(),
  isContextDependent: z.boolean().default(false),
  isProviderDependent: z.boolean().default(false),
});
export type AssessmentRule = z.infer<typeof AssessmentRuleSchema>;

// 8. AssessmentResult Schema
export const AssessmentResultSchema = z.object({
  testId: z.string(),
  testVersion: z.string().default("1.0.0"),
  testName: z.string(),
  category: AssessmentCategorySchema,
  status: ResultStatusSchema,
  severity: SeveritySchema,
  maxPoints: z.number(),
  earnedPoints: z.number(),
  title: z.string(),
  summary: z.string(),
  evidenceReferences: z.array(z.string().max(500)).max(100).default([]).optional(),
  timestamp: z.string(),
  confidence: ConfidenceSchema,
  limitations: z.string().optional(),
  remediationTheme: z.string().optional(),
  affectedUrlsCount: z.number().int().default(0).optional(),
  sampleEvidence: z.array(z.string().max(2000)).max(100).default([]).optional(),
  ruleId: z.string().optional(),
  description: z.string().optional(),
  executionStatus: z.enum(["EXECUTED", "SKIPPED", "NOT_TESTED", "BLOCKED", "NOT_APPLICABLE"]).optional(),
  allocatedPoints: z.number().optional(),
  evaluatedPoints: z.number().optional(),
  scoringWeight: z.number().optional(),
  scoreContribution: z.number().optional(),
  evidenceSource: z.string().optional(),
  affectedUrls: z.array(z.string().max(4096)).max(5000).default([]).optional(),
  observedValue: z.string().optional(),
  expectedThreshold: z.string().optional(),
  remediation: z.string().optional(),
  validationProcedure: z.string().optional(),
  verificationSteps: z.string().optional(),
});
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;

// 8b. RuleAssessmentOutcome Schema (Single Source of Truth for 56 Catalogue Rules)
export const RuleAssessmentOutcomeSchema = z.object({
  ruleId: z.string(),
  testId: z.string(),
  testVersion: z.string().default("1.0.0"),
  testName: z.string(),
  category: AssessmentCategorySchema,
  categoryName: z.string(),
  description: z.string().default(""),
  status: ResultStatusSchema,
  severity: SeveritySchema,
  executionStatus: z.enum(["EXECUTED", "SKIPPED", "NOT_TESTED", "BLOCKED", "NOT_APPLICABLE"]).default("EXECUTED"),
  allocatedPoints: z.number().default(0),
  evaluatedPoints: z.number().default(0),
  maxPoints: z.number().default(0),
  earnedPoints: z.number().default(0),
  scoringWeight: z.number().default(0),
  scoreContribution: z.number().default(0),
  evidenceSource: z.string().default(""),
  affectedUrls: z.array(z.string().max(4096)).max(5000).default([]),
  observedValue: z.string().default(""),
  expectedThreshold: z.string().default(""),
  timestamp: z.string(),
  confidence: ConfidenceSchema,
  limitations: z.string().optional(),
  remediation: z.string().default(""),
  validationProcedure: z.string().default(""),
  verificationSteps: z.string().default(""),
  title: z.string().default(""),
  summary: z.string().default(""),
  sampleEvidence: z.array(z.string().max(2000)).max(100).default([]),
  affectedUrlsCount: z.number().int().default(0),
});
export type RuleAssessmentOutcome = z.infer<typeof RuleAssessmentOutcomeSchema>;

// 9. CategoryScore Schema
export const CategoryScoreSchema = z.object({
  category: AssessmentCategorySchema,
  categoryName: z.string(),
  allocatedWeight: z.number().positive(), // Catalogue max points for category (e.g. 12, 18, 10...)
  testedPoints: z.number().nonnegative(),
  earnedPoints: z.number().nonnegative(),
  scorePercentage: z.number().min(0).max(100), // 100 * earned / tested (score among evaluated tests)
  weightedScore: z.number().nonnegative(), // Points earned towards overall composite (earnedPoints)
  testCounts: z.object({
    total: z.number().int(),
    pass: z.number().int(),
    warning: z.number().int(),
    fail: z.number().int(),
    unknown: z.number().int(),
    notApplicable: z.number().int(),
    notTested: z.number().int(),
    blocked: z.number().int(),
  }),
  isEligibleForOverall: z.boolean().default(true),
  coveragePercentage: z.number().min(0).max(100).default(100), // (testedPoints / allocatedWeight) * 100
  earnedAllocationPercentage: z.number().min(0).max(100).default(0), // (earnedPoints / allocatedWeight) * 100
  allocatedPoints: z.number().default(0).optional(),
  pointsEvaluated: z.number().default(0).optional(),
  pointsEarned: z.number().default(0).optional(),
  normalizedScore: z.number().default(0).optional(),
  isProvisional: z.boolean().default(false).optional(),
  statusLabel: z.string().optional(),
  scoreLabel: z.string().optional(),
});
export type CategoryScore = z.infer<typeof CategoryScoreSchema>;

// 10. OverallScore Schema
export const OverallScoreSchema = z.object({
  score: z.number().min(0).max(100),
  ratingBand: z.enum([
    "Strong observed baseline",
    "Generally healthy; opportunities remain",
    "Needs improvement",
    "Weak areas need attention",
    "Significant improvement required",
  ]),
  isProvisional: z.boolean().default(false),
  assessmentStatus: z.enum(["FULLY_ASSESSED", "PROVISIONAL", "INSUFFICIENT_EVIDENCE"]).default("FULLY_ASSESSED"),
  evaluationNote: z.string(),
  totalPossibleCataloguePoints: z.literal(100),
  evaluatedWeightedPoints: z.number(),
  criticalIssuesCount: z.number().int().default(0),
  coveragePercentage: z.number().min(0).max(100).optional(),
  totalEarnedCataloguePoints: z.number().optional(),
  ineligibleCategories: z.array(z.string().max(100)).max(50).default([]).optional(),
  // Explicit semantic scoring breakdown
  totalPointsAllocated: z.number().default(100).optional(),
  pointsActuallyEvaluated: z.number().default(0).optional(),
  pointsEarned: z.number().default(0).optional(),
  catalogueCoveragePercentage: z.number().default(0).optional(),
  normalizedScore: z.number().default(0).optional(),
  scoringFormula: z.string().default("normalizedScore = Math.round((pointsEarned / pointsActuallyEvaluated) * 100)").optional(),
});
export type OverallScore = z.infer<typeof OverallScoreSchema>;

// 11. CompetitorAssessment Schema
export const CompetitorAssessmentSchema = z.object({
  domain: z.string().max(255),
  normalizedUrl: z.string().max(4096),
  status: z.enum(["AVAILABLE", "NOT_ASSESSED"]).default("NOT_ASSESSED").optional(),
  overallScore: z.number().min(0).max(100).nullable().optional(),
  ratingBand: z.string().max(100).optional(),
  coverage: ScanCoverageSchema.optional(),
  keyMetrics: z.object({
    technicalHealthScore: z.number().nullable().optional(),
    seoScore: z.number().nullable().optional(),
    performanceScore: z.number().nullable().optional(),
    httpsActive: z.boolean().nullable().optional(),
    mobileFriendly: z.boolean().nullable().optional(),
  }),
  dataProvenance: z.object({
    source: z.string().max(255),
    measuredAt: z.string().max(100),
    isEstimated: z.boolean().default(false),
  }),
  disclaimer: z.string().max(2000),
});
export type CompetitorAssessment = z.infer<typeof CompetitorAssessmentSchema>;

// 12. ProviderConnectionStatus Schema
export const ProviderConnectionStatusSchema = z.object({
  provider: z.enum(["pagespeed", "google_analytics_4", "search_console", "backlinks", "serp"]),
  isConnected: z.boolean().default(false),
  statusMessage: z.string().max(1000),
  lastSyncedAt: z.string().max(100).optional(),
  hasCredentialsConfigured: z.boolean().default(false),
});
export type ProviderConnectionStatus = z.infer<typeof ProviderConnectionStatusSchema>;

// 13. OpportunityTheme Schema (Business-level plan)
export const OpportunityThemeSchema = z.object({
  id: z.string().max(128),
  rank: z.number().int(),
  title: z.string().max(255),
  businessImpact: z.string().max(2000),
  potentialServiceCategory: z.string().max(255),
  urgency: SeveritySchema,
  relatedTestIds: z.array(z.string().max(100)).max(100),
  recommendedAction: z.string().max(2000),
});
export type OpportunityTheme = z.infer<typeof OpportunityThemeSchema>;

// 13b. Diagnostic Dimension Scorecard Schema (9 Non-Additive Diagnostic Views)
export const DiagnosticDimensionIdSchema = z.enum([
  "design_ux",
  "development_health",
  "responsive_accessibility",
  "performance_speed",
  "seo",
  "geo",
  "aeo",
  "content_trust",
  "marketing_monetization",
]);
export type DiagnosticDimensionId = z.infer<typeof DiagnosticDimensionIdSchema>;

export const DimensionScorecardSchema = z.object({
  id: DiagnosticDimensionIdSchema,
  name: z.string().max(255),
  description: z.string().max(2000),
  score: z.number().min(0).max(100),
  ratingBand: z.string().max(100),
  coveragePercentage: z.number().min(0).max(100),
  confidence: ConfidenceSchema,
  evaluatedTestsCount: z.number().int(),
  totalTestsCount: z.number().int(),
  urlsAssessedCount: z.number().int(),
  missingEvidenceNotes: z.string().max(2000).optional(),
  isNonAdditiveView: z.literal(true).default(true),
  statusCounts: boundedRecord(z.string().max(50), z.number().int().nonnegative(), 20).optional(),
  nonEvaluableRules: z.array(z.string().max(100)).max(100).optional(),
});
export type DimensionScorecard = z.infer<typeof DimensionScorecardSchema>;

// 13c. Cost of Inaction Calculator v1 Schema
export const BusinessModelTypeSchema = z.enum([
  "ecommerce",
  "lead_gen",
  "saas_subscription",
  "other",
]);
export type BusinessModelType = z.infer<typeof BusinessModelTypeSchema>;

export const ScenarioEstimateSchema = z.object({
  scenario: z.enum(["conservative", "base", "upside"]),
  monthlyOpportunity: z.number(),
  annualOpportunity: z.number(),
  conversionRateDeltaPct: z.number(),
  paybackMonths: z.number().nullable().optional(),
  monthlyRevenueOpportunity: z.number().optional(),
  annualRevenueOpportunity: z.number().optional(),
  monthlyGrossProfitOpportunity: z.number().optional(),
  annualGrossProfitOpportunity: z.number().optional(),
  baselineConversionRatePct: z.number().optional(),
  modeledConversionRatePct: z.number().optional(),
});
export type ScenarioEstimate = z.infer<typeof ScenarioEstimateSchema>;

export const CostOfInactionResultSchema = z.object({
  status: z.enum(["ESTIMATED", "INSUFFICIENT_INPUTS", "NOT_CONFIGURED"]),
  businessModel: BusinessModelTypeSchema,
  inputsProvided: boundedRecord(z.string().max(100), z.any(), 50).default({}),
  scenarios: z
    .object({
      conservative: ScenarioEstimateSchema,
      base: ScenarioEstimateSchema,
      upside: ScenarioEstimateSchema,
    })
    .optional(),
  currency: z.string().max(10).default("USD"),
  remediationCostEstimate: z.number().optional(),
  grossMarginPct: z.number().nullable().optional(),
  formula: z.string().max(2000).optional(),
  assumptions: z.array(z.string().max(2000)).max(100).default([]),
  disclaimers: z.array(z.string().max(2000)).max(100).default([]),
  inputSource: z.string().max(255).default("Manual / Heuristic Baseline"),
  calculatedAt: z.string().max(100),
  confidence: ConfidenceSchema.default("MEDIUM"),
  methodologyNotes: z.string().max(5000),
});
export type CostOfInactionResult = z.infer<typeof CostOfInactionResultSchema>;

// 14. OwnerReport Schema (13 sections + Dimension Scorecards & Cost of Inaction)
export const OwnerReportSchema = z.object({
  reportId: z.string().max(128),
  reportVersion: z.string().max(50).default("1.0.0"),
  scanId: z.string().max(128),
  tenantId: z.string().max(128).optional(),
  generatedAt: z.string().max(100),
  companyIdentity: z.object({
    name: z.string().max(255),
    domain: z.string().max(255),
    targetUrl: z.string().max(4096),
    logoUrl: z.string().max(4096).optional(),
    businessCategory: BusinessCategorySchema,
    businessCategoryDetection: BusinessCategoryDetectionSchema.optional(),
    targetMarket: z.string().max(50),
    preferredLanguage: z.string().max(50),
  }),
  executiveSnapshot: z.object({
    overallScore: OverallScoreSchema,
    categoryScores: z.array(CategoryScoreSchema).max(50),
    coverage: ScanCoverageSchema,
    topOpportunities: z.array(OpportunityThemeSchema).max(50),
    testedPageCount: z.number().int(),
  }),
  platformProfile: z.object({
    detectedTechnologies: z.array(z.string().max(200)).max(200),
    totalPagesDiscovered: z.number().int(),
    httpsStatus: z.string().max(100),
    preferredHost: z.string().max(255),
    primaryLanguage: z.string().max(50),
  }),
  scoreDetails: z.array(CategoryScoreSchema).max(50),
  issueDistribution: z.object({
    critical: z.number().int(),
    high: z.number().int(),
    medium: z.number().int(),
    low: z.number().int(),
    informational: z.number().int().default(0).optional(),
    totalIssues: z.number().int(),
    affectedPagesCount: z.number().int(),
  }),
  technicalHealthAndSeoSummary: z.object({
    titlesHealthy: z.number().int(),
    descriptionsHealthy: z.number().int(),
    canonicalsConsistent: z.boolean(),
    brokenLinksCount: z.number().int(),
    sitemapAccessible: z.boolean(),
    structuredDataPresent: z.boolean(),
    totalEligibleHtmlPages: z.number().int().optional(),
    titlesSuboptimal: z.number().int().optional(),
    titlesMissing: z.number().int().optional(),
    descriptionsSuboptimal: z.number().int().optional(),
    descriptionsMissing: z.number().int().optional(),
    nonHtmlResourcesExcluded: z.number().int().optional(),
    canonicalsMissingCount: z.number().int().optional(),
  }),
  performanceAndResponsiveSummary: z.object({
    mobileLabScore: z.number().nullable(),
    desktopLabScore: z.number().nullable(),
    coreWebVitalsStatus: z.string().max(100),
    testedViewports: z.array(z.number()).max(20),
    horizontalOverflowFound: z.boolean().nullable(),
    responsiveStatus: z.enum(["TESTED", "NOT_TESTED", "PARTIAL"]).default("NOT_TESTED").optional(),
    labMetrics: z.object({
      speedIndexMs: z.number().nullable().optional(),
      fcpMs: z.number().nullable().optional(),
      lcpMs: z.number().nullable().optional(),
      tbtMs: z.number().nullable().optional(),
      ttfbMs: z.number().nullable().optional(),
      cls: z.number().nullable().optional(),
      strategy: z.string().max(50).optional(),
      providerName: z.string().max(100).optional(),
      measuredAt: z.string().max(100).optional(),
    }).optional(),
    fieldMetrics: z.object({
      lcpMs: z.number().nullable().optional(),
      inpMs: z.number().nullable().optional(),
      cls: z.number().nullable().optional(),
      category: z.string().max(50).optional(),
      source: z.string().max(100).optional(),
      measuredAt: z.string().max(100).optional(),
    }).optional(),
    providerStatus: z.string().max(100).optional(),
  }),
  securityAndAuthSummary: z.object({
    httpsEnforced: z.boolean(),
    securityHeadersConfigured: z.number().int(),
    totalSecurityHeadersChecked: z.number().int(),
    authSurfacesFound: z.number().int(),
    publicCookieIssues: z.number().int().nullable(),
    cookieAssessmentStatus: z.enum(["OBSERVED_CLEAN", "ISSUES_OBSERVED", "NO_COOKIES_OBSERVED", "UNKNOWN", "NOT_TESTED"]).default("UNKNOWN").optional(),
    limitationsNote: z.string().max(2000),
  }),
  contentTrustAiSummary: z.object({
    blogOrResourcePresent: z.boolean(),
    aiCrawlerPolicy: z.string().max(255),
    entitySchemaPresent: z.boolean(),
    contactOrTrustSignalsPresent: z.boolean(),
  }),
  analyticsAndTrackingSummary: z.object({
    ga4Detected: z.boolean(),
    gtmDetected: z.boolean(),
    advertisingPixelsCount: z.number().int(),
    consentUiDetected: z.boolean(),
    measurementAccountConnected: z.boolean(),
  }),
  competitorSnapshot: z.array(CompetitorAssessmentSchema).max(20),
  priorityOpportunities: z.array(OpportunityThemeSchema).max(50),
  methodologyAndLimitations: z.object({
    scanScope: z.string().max(5000),
    dataSources: z.array(z.string().max(500)).max(50),
    scoreDefinitions: z.string().max(5000),
    disclaimers: z.array(z.string().max(2000)).max(100),
    expertEngagementCta: z.string().max(2000),
  }),
  dimensionScorecards: z.array(DimensionScorecardSchema).max(50).default([]).optional(),
  costOfInaction: CostOfInactionResultSchema.optional(),
  results: z.array(AssessmentResultSchema).max(500),
  ruleLedger: z.array(RuleAssessmentOutcomeSchema).max(200).default([]).optional(),
  assessmentAndIssuesSummary: AssessmentAndIssuesSummarySchema.optional(),
});
export type OwnerReport = z.infer<typeof OwnerReportSchema>;

// 15. ReportArtifact Schema
export const ReportArtifactSchema = z.object({
  id: z.string().max(128),
  reportId: z.string().max(128),
  scanId: z.string().max(128),
  artifactType: z.enum(["pdf", "json", "html"]),
  fileUrl: z.string().max(4096),
  storagePath: z.string().max(4096),
  fileSizeBytes: z.number().int(),
  createdAt: z.string().max(100),
  expiresAt: z.string().max(100).optional(),
  isShared: z.boolean().default(false),
  shareToken: z.string().max(128).optional(),
});
export type ReportArtifact = z.infer<typeof ReportArtifactSchema>;

// 16. ScanJob Schema
export const ScanJobSchema = z.object({
  id: z.string().max(128),
  tenantId: z.string().max(128).optional(),
  userId: z.string().max(128).optional(),
  request: ScanRequestSchema,
  status: JobStatusSchema,
  currentStage: z.string().max(100),
  progressPercentage: z.number().min(0).max(100),
  discoveredCount: z.number().int().default(0),
  testedCount: z.number().int().default(0),
  errorCount: z.number().int().default(0),
  coverage: ScanCoverageSchema.optional(),
  results: z.array(AssessmentResultSchema).max(500).default([]),
  report: OwnerReportSchema.optional(),
  expertReport: z.any().optional(),
  expertReportId: z.string().max(128).optional(),
  ownerReportId: z.string().max(128).optional(),
  errorMessage: z.string().max(5000).optional(),
  createdAt: z.string().max(100),
  updatedAt: z.string().max(100),
  completedAt: z.string().max(100).optional(),
});
export type ScanJob = z.infer<typeof ScanJobSchema>;
