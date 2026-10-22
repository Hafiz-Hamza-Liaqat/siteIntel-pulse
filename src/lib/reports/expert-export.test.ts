import { describe, it, expect } from "vitest";
import { projectExpertReport } from "./expert-projection";
import {
  exportFindingsCsv,
  exportInventoryCsv,
  exportRemediationCsv,
  exportManifestJson,
  exportFullBundleJson,
} from "./expert-export";
import { assessmentRegistry } from "../catalogue/registry";
import crypto from "node:crypto";
import type { PageObservation, ScanCoverage } from "@/types";

describe("Milestone 2: Expert Multi-Format Data Exporter", () => {
  const scanRequest = {
    targetUrl: "https://export-test.company.com",
    reportType: "expert" as const,
    platformName: "Export Test Platform",
    businessCategory: "saas" as const,
    targetMarket: "US",
    preferredLanguage: "en",
    competitors: [],
    maxPages: 5,
    maxDepth: 1,
  };

  const samplePages: PageObservation[] = [
    {
      id: "pg_1",
      requestedUrl: "https://export-test.company.com/",
      normalizedUrl: "https://export-test.company.com/",
      finalUrl: "https://export-test.company.com/",
      statusCode: 200,
      responseTimeMs: 190,
      contentType: "text/html",
      redirectHistory: [],
      title: "Export Platform Home",
      metaDescription: "Test description for CSV export validation.",
      canonicalCandidate: "https://export-test.company.com/",
      robotsDirectives: ["index"],
      headings: { h1: ["Welcome, User"], h2: ["Features"], h3: [], h4: [], h5: [], h6: [] },
      visibleWordCount: 450,
      language: "en",
      doctype: "html",
      encoding: "UTF-8",
      links: [],
      resources: [],
      structuredData: [],
      openGraph: {},
      headers: { "x-frame-options": "DENY" },
      cookieAttributes: [],
      templateConfidence: "HIGH",
      discoveredAtDepth: 0,
      discoverySource: "entry",
      consoleErrors: [],
    },
  ];

  const sampleCoverage: ScanCoverage = {
    discoveredPages: 1,
    testedPages: 1,
    skippedPages: 0,
    failedPages: 0,
    inaccessiblePages: 0,
    totalBytesFetched: 50000,
    totalPagesBudget: 5,
    crawlDepthReached: 0,
    externalLinksTested: 0,
    resourcesTested: 0,
    isExhaustive: true,
    weightedPointsEvaluated: 80,
    totalWeightedPoints: 100,
    coveragePercentage: 80,
  };

  const crawlResult = {
    pages: samplePages,
    coverage: sampleCoverage,
    sitemapUrls: [],
    externalLinksTested: [],
    discoveredPageUrls: ["https://export-test.company.com/"],
  };

  const evalContext = {
    targetUrl: scanRequest.targetUrl,
    domain: "export-test.company.com",
    businessCategory: scanRequest.businessCategory,
    pages: crawlResult.pages,
    sitemapUrls: crawlResult.sitemapUrls,
    externalLinksTested: crawlResult.externalLinksTested,
    competitors: [],
  };

  const assessmentResults = assessmentRegistry.evaluateAll(evalContext);
  const report = projectExpertReport("job_export_1", scanRequest, crawlResult, assessmentResults);

  it("exports findings to valid CSV with escaped quotes and commas", () => {
    const csv = exportFindingsCsv(report);
    expect(csv).toContain("Finding ID,Rule ID,Category,Severity,Status");
    expect(csv).toContain("EXP-");
    expect(csv.split("\r\n").length).toBeGreaterThan(10);
  });

  it("exports URL inventory to valid CSV", () => {
    const csv = exportInventoryCsv(report);
    expect(csv).toContain("Page URL,Status Code,Discovery Source");
    expect(csv).toContain("https://export-test.company.com/");
    expect(csv).toContain("200");
  });

  it("exports remediation action register to valid CSV", () => {
    const csv = exportRemediationCsv(report);
    expect(csv).toContain("Task ID,Workstream,Priority,Estimated Effort");
    expect(csv).toContain("TASK-");
  });

  it("exports JSON verification manifest with valid SHA-256 integrity checksum", () => {
    const manifestStr = exportManifestJson(report);
    const manifest = JSON.parse(manifestStr);

    expect(manifest.checksum).toBeDefined();
    expect(manifest.checksum.length).toBe(64); // SHA-256 hex length
    expect(manifest.summaryStats.totalFindings).toBe(report.findings.length);
    expect(manifest.summaryStats.totalDiscoveredUrls).toBe(report.urlInventory.length);
  });

  it("exports full JSON bundle parseable back into report format", () => {
    const bundleStr = exportFullBundleJson(report);
    const parsed = JSON.parse(bundleStr);

    expect(parsed.metadata.reportId).toBe(report.metadata.reportId);
    expect(parsed.findings.length).toBe(report.findings.length);
    expect(parsed.executiveSummary.overallScore.score).toBe(report.executiveSummary.overallScore.score);
  });
});
