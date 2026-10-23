import { z } from "zod";

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
  targetUrl: z.string().min(1, "Website URL or domain is required"),
  reportType: ReportTypeSchema,
  platformName: z.string().optional(),
  businessCategory: BusinessCategorySchema.default("ecommerce"),
  targetMarket: z.string().default("US"),
  preferredLanguage: z.string().default("en"),
  businessGoal: z.string().optional(),
  targetAudience: z.string().optional(),
  competitors: z.array(z.string()).max(3).default([]),
  maxPages: z.number().int().min(1).max(100).default(50),
  maxDepth: z.number().int().min(1).max(5).default(3),
  // Milestone 2 expert audit parameters
  enableAuthorizedAudit: z.boolean().optional(),
  authTestAccount: z.string().optional(),
  authCredentialsRedacted: z.string().optional(),
  assignedSpecialists: z.array(z.string()).optional(),
  auditScopeNotes: z.string().optional(),
});
export type ScanRequest = z.infer<typeof ScanRequestSchema>;

// 2. ScanCoverage Schema
export const ScanCoverageSchema = z.object({
  discoveredPages: z.number().int().nonnegative(),
  testedPages: z.number().int().nonnegative(),
  skippedPages: z.number().int().nonnegative(),
  failedPages: z.number().int().nonnegative(),
  inaccessiblePages: z.number().int().nonnegative(),
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
});
export type ScanCoverage = z.infer<typeof ScanCoverageSchema>;

// 3. ResourceObservation Schema
export const ResourceObservationSchema = z.object({
  id: z.string(),
  url: z.string(),
  type: z.enum(["script", "stylesheet", "image", "font", "document", "other"]),
  statusCode: z.number().optional(),
  sizeBytes: z.number().optional(),
  isRenderBlocking: z.boolean().default(false).optional(),
  isThirdParty: z.boolean().default(false).optional(),
  isFailed: z.boolean().default(false).optional(),
  errorMessage: z.string().optional(),
});
export type ResourceObservation = z.infer<typeof ResourceObservationSchema>;

// 4. LinkObservation Schema
export const LinkObservationSchema = z.object({
  id: z.string(),
  sourceUrl: z.string(),
  targetUrl: z.string(),
  isInternal: z.boolean(),
  anchorText: z.string(),
  rel: z.string().optional(),
  statusCode: z.number().optional(),
  isBroken: z.boolean().default(false),
  isRedirect: z.boolean().default(false),
  redirectTarget: z.string().optional(),
});
export type LinkObservation = z.infer<typeof LinkObservationSchema>;

// 5. PageObservation Schema
export const PageObservationSchema = z.object({
  id: z.string(),
  requestedUrl: z.string(),
  normalizedUrl: z.string(),
  finalUrl: z.string(),
  statusCode: z.number(),
  responseTimeMs: z.number(),
  contentType: z.string(),
  redirectHistory: z.array(z.string()).default([]),
  title: z.string().optional(),
  metaDescription: z.string().optional(),
  canonicalCandidate: z.string().optional(),
  robotsDirectives: z.array(z.string()).default([]),
  headings: z.object({
    h1: z.array(z.string()).default([]),
    h2: z.array(z.string()).default([]),
    h3: z.array(z.string()).default([]),
    h4: z.array(z.string()).default([]),
    h5: z.array(z.string()).default([]),
    h6: z.array(z.string()).default([]),
  }),
  visibleTextSample: z.string().optional(),
  visibleWordCount: z.number().int().default(0),
  language: z.string().optional(),
  doctype: z.string().optional(),
  encoding: z.string().optional(),
  links: z.array(LinkObservationSchema).default([]),
  resources: z.array(ResourceObservationSchema).default([]),
  structuredData: z.array(z.record(z.any())).default([]),
  openGraph: z.record(z.string()).default({}),
  favicon: z.string().optional(),
  headers: z.record(z.string()).default({}),
  cookieAttributes: z.array(
    z.object({
      name: z.string(),
      secure: z.boolean(),
      httpOnly: z.boolean(),
      sameSite: z.string().optional(),
    })
  ).default([]),
  pageTemplateGuess: z.string().optional(),
  templateConfidence: ConfidenceSchema.default("LOW"),
  discoveredAtDepth: z.number().int().default(0),
  discoverySource: z.enum(["entry", "sitemap", "internal_link"]).default("entry"),
  consoleErrors: z.array(z.string()).default([]),
  isXmlSitemap: z.boolean().default(false).optional(),
  documentType: z.enum(["html", "xml_sitemap", "xml", "other"]).default("html").optional(),
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
  evidenceReferences: z.array(z.string()).default([]).optional(),
  timestamp: z.string(),
  confidence: ConfidenceSchema,
  limitations: z.string().optional(),
  remediationTheme: z.string().optional(),
  affectedUrlsCount: z.number().int().default(0).optional(),
  sampleEvidence: z.array(z.string()).default([]).optional(),
});
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;

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
  ineligibleCategories: z.array(z.string()).default([]).optional(),
});
export type OverallScore = z.infer<typeof OverallScoreSchema>;

// 11. CompetitorAssessment Schema
export const CompetitorAssessmentSchema = z.object({
  domain: z.string(),
  normalizedUrl: z.string(),
  status: z.enum(["AVAILABLE", "NOT_ASSESSED"]).default("NOT_ASSESSED").optional(),
  overallScore: z.number().min(0).max(100).nullable().optional(),
  ratingBand: z.string().optional(),
  coverage: ScanCoverageSchema.optional(),
  keyMetrics: z.object({
    technicalHealthScore: z.number().nullable().optional(),
    seoScore: z.number().nullable().optional(),
    performanceScore: z.number().nullable().optional(),
    httpsActive: z.boolean().default(true),
    mobileFriendly: z.boolean().default(true),
  }),
  dataProvenance: z.object({
    source: z.string(),
    measuredAt: z.string(),
    isEstimated: z.boolean().default(false),
  }),
  disclaimer: z.string(),
});
export type CompetitorAssessment = z.infer<typeof CompetitorAssessmentSchema>;

// 12. ProviderConnectionStatus Schema
export const ProviderConnectionStatusSchema = z.object({
  provider: z.enum(["pagespeed", "google_analytics_4", "search_console", "backlinks", "serp"]),
  isConnected: z.boolean().default(false),
  statusMessage: z.string(),
  lastSyncedAt: z.string().optional(),
  hasCredentialsConfigured: z.boolean().default(false),
});
export type ProviderConnectionStatus = z.infer<typeof ProviderConnectionStatusSchema>;

// 13. OpportunityTheme Schema (Business-level plan)
export const OpportunityThemeSchema = z.object({
  id: z.string(),
  rank: z.number().int(),
  title: z.string(),
  businessImpact: z.string(),
  potentialServiceCategory: z.string(),
  urgency: SeveritySchema,
  relatedTestIds: z.array(z.string()),
  recommendedAction: z.string(),
});
export type OpportunityTheme = z.infer<typeof OpportunityThemeSchema>;

// 14. OwnerReport Schema (13 sections)
export const OwnerReportSchema = z.object({
  reportId: z.string(),
  reportVersion: z.string().default("1.0.0"),
  scanId: z.string(),
  tenantId: z.string().optional(),
  generatedAt: z.string(),
  companyIdentity: z.object({
    name: z.string(),
    domain: z.string(),
    targetUrl: z.string(),
    logoUrl: z.string().optional(),
    businessCategory: BusinessCategorySchema,
    targetMarket: z.string(),
    preferredLanguage: z.string(),
  }),
  executiveSnapshot: z.object({
    overallScore: OverallScoreSchema,
    categoryScores: z.array(CategoryScoreSchema),
    coverage: ScanCoverageSchema,
    topOpportunities: z.array(OpportunityThemeSchema),
    testedPageCount: z.number().int(),
  }),
  platformProfile: z.object({
    detectedTechnologies: z.array(z.string()),
    totalPagesDiscovered: z.number().int(),
    httpsStatus: z.string(),
    preferredHost: z.string(),
    primaryLanguage: z.string(),
  }),
  scoreDetails: z.array(CategoryScoreSchema),
  issueDistribution: z.object({
    critical: z.number().int(),
    high: z.number().int(),
    medium: z.number().int(),
    low: z.number().int(),
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
  }),
  performanceAndResponsiveSummary: z.object({
    mobileLabScore: z.number().nullable(),
    desktopLabScore: z.number().nullable(),
    coreWebVitalsStatus: z.string(),
    testedViewports: z.array(z.number()),
    horizontalOverflowFound: z.boolean(),
  }),
  securityAndAuthSummary: z.object({
    httpsEnforced: z.boolean(),
    securityHeadersConfigured: z.number().int(),
    totalSecurityHeadersChecked: z.number().int(),
    authSurfacesFound: z.number().int(),
    publicCookieIssues: z.number().int(),
    limitationsNote: z.string(),
  }),
  contentTrustAiSummary: z.object({
    blogOrResourcePresent: z.boolean(),
    aiCrawlerPolicy: z.string(),
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
  competitorSnapshot: z.array(CompetitorAssessmentSchema),
  priorityOpportunities: z.array(OpportunityThemeSchema),
  methodologyAndLimitations: z.object({
    scanScope: z.string(),
    dataSources: z.array(z.string()),
    scoreDefinitions: z.string(),
    disclaimers: z.array(z.string()),
    expertEngagementCta: z.string(),
  }),
  results: z.array(AssessmentResultSchema),
});
export type OwnerReport = z.infer<typeof OwnerReportSchema>;

// 15. ReportArtifact Schema
export const ReportArtifactSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  scanId: z.string(),
  artifactType: z.enum(["pdf", "json", "html"]),
  fileUrl: z.string(),
  storagePath: z.string(),
  fileSizeBytes: z.number().int(),
  createdAt: z.string(),
  expiresAt: z.string().optional(),
  isShared: z.boolean().default(false),
  shareToken: z.string().optional(),
});
export type ReportArtifact = z.infer<typeof ReportArtifactSchema>;

// 16. ScanJob Schema
export const ScanJobSchema = z.object({
  id: z.string(),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  request: ScanRequestSchema,
  status: JobStatusSchema,
  currentStage: z.string(),
  progressPercentage: z.number().min(0).max(100),
  discoveredCount: z.number().int().default(0),
  testedCount: z.number().int().default(0),
  errorCount: z.number().int().default(0),
  coverage: ScanCoverageSchema.optional(),
  results: z.array(AssessmentResultSchema).default([]),
  report: OwnerReportSchema.optional(),
  expertReport: z.any().optional(),
  expertReportId: z.string().optional(),
  ownerReportId: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
});
export type ScanJob = z.infer<typeof ScanJobSchema>;
