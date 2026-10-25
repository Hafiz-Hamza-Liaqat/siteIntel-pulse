import {
  PageObservation,
  LinkObservation,
  AssessmentCategory,
  AssessmentResult,
  BusinessCategory,
} from "@/types";
import { PageSpeedResult } from "../providers/types";

export interface RuleEvaluationContext {
  targetUrl: string;
  domain: string;
  businessCategory: BusinessCategory;
  pages: PageObservation[];
  robotsTxt?: string;
  sitemapUrls: string[];
  externalLinksTested: LinkObservation[];
  pageSpeedMobile?: PageSpeedResult;
  pageSpeedDesktop?: PageSpeedResult;
  competitors?: string[];
  browserResponsiveResults?: import("@/types").ResponsiveDiagnostic[];
  browserVisualResults?: import("@/types").VisualDesignDiagnostic;
  exposureResults?: import("../scanner/exposure-checker").ExposureCheckResult;
}

export interface RuleDefinition {
  id: string;
  name: string;
  version: string;
  category: AssessmentCategory;
  categoryName: string;
  maxPoints: number;
  description: string;
  businessImpactSummary: string;
  remediationAdvice: string;
  isContextDependent?: boolean;
  isProviderDependent?: boolean;
  evaluate: (ctx: RuleEvaluationContext) => AssessmentResult;
}
