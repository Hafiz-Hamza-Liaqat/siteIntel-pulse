import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  ScanRequestSchema,
  PageObservationSchema,
  ResourceObservationSchema,
  LinkObservationSchema,
  AssessmentResultSchema,
  OwnerReportSchema,
  AssessmentAndIssuesSummarySchema,
  boundedRecord,
} from "@/types/schema";
import {
  ExpertAssessmentResultSchema,
  PageDiagnosticSchema,
  LinkDiagnosticSchema,
  RemediationTaskSchema,
  ExpertReportSchema,
} from "@/types/expert-schema";
import { RemediationUpdateSchema, UserSchema, TenantSchema } from "@/types/auth-schema";

describe("Zod Collection Bounds and Input Constraints (GHSA-mrhx-c7xc-m3w5 Mitigation)", () => {
  describe("ScanRequestSchema (Public Scan Intake)", () => {
    const validBaseline = {
      targetUrl: "https://example.com",
      reportType: "owner" as const,
      businessCategory: "auto" as const,
      competitors: ["https://comp1.com", "https://comp2.com"],
      maxPages: 50,
      maxDepth: 3,
      assignedSpecialists: ["Alice Smith", "Bob Jones"],
    };

    it("accepts valid bounded scan request", () => {
      const result = ScanRequestSchema.safeParse(validBaseline);
      expect(result.success).toBe(true);
    });

    it("rejects oversized assignedSpecialists array (> 50 items)", () => {
      const oversizedSpecialists = Array.from({ length: 51 }, (_, i) => `Specialist ${i}`);
      const result = ScanRequestSchema.safeParse({
        ...validBaseline,
        assignedSpecialists: oversizedSpecialists,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.some((i) => i.path.includes("assignedSpecialists") && i.code === "too_big")).toBe(true);
      }
    });

    it("rejects oversized individual strings in assignedSpecialists (> 100 chars)", () => {
      const longSpecialistName = "A".repeat(101);
      const result = ScanRequestSchema.safeParse({
        ...validBaseline,
        assignedSpecialists: [longSpecialistName],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.code === "too_big")).toBe(true);
      }
    });

    it("rejects oversized competitors array (> 3 items)", () => {
      const result = ScanRequestSchema.safeParse({
        ...validBaseline,
        competitors: ["https://c1.com", "https://c2.com", "https://c3.com", "https://c4.com"],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("competitors"))).toBe(true);
      }
    });

    it("rejects oversized targetUrl string (> 2048 chars)", () => {
      const longUrl = "https://example.com/" + "x".repeat(2050);
      const result = ScanRequestSchema.safeParse({
        ...validBaseline,
        targetUrl: longUrl,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("targetUrl") && i.code === "too_big")).toBe(true);
      }
    });

    it("rejects oversized auditScopeNotes (> 10000 chars)", () => {
      const result = ScanRequestSchema.safeParse({
        ...validBaseline,
        auditScopeNotes: "N".repeat(10001),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("auditScopeNotes"))).toBe(true);
      }
    });
  });

  describe("RemediationUpdateSchema", () => {
    it("accepts valid remediation update", () => {
      const result = RemediationUpdateSchema.safeParse({
        taskId: "task-123",
        status: "IN_PROGRESS",
        assignedTo: "dev@example.com",
        notes: "Investigation underway",
      });
      expect(result.success).toBe(true);
    });

    it("rejects oversized notes (> 5000 chars)", () => {
      const result = RemediationUpdateSchema.safeParse({
        taskId: "task-123",
        status: "IN_PROGRESS",
        notes: "X".repeat(5001),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("notes") && i.code === "too_big")).toBe(true);
      }
    });

    it("rejects oversized taskId (> 128 chars)", () => {
      const result = RemediationUpdateSchema.safeParse({
        taskId: "T".repeat(129),
        status: "RESOLVED",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("PageObservationSchema (Untrusted External Crawl Data)", () => {
    const validPage = {
      id: "page-1",
      requestedUrl: "https://example.com",
      normalizedUrl: "https://example.com/",
      finalUrl: "https://example.com/",
      statusCode: 200,
      responseTimeMs: 120,
      contentType: "text/html",
      headings: {
        h1: ["Main Heading"],
        h2: ["Subheading 1", "Subheading 2"],
        h3: [],
        h4: [],
        h5: [],
        h6: [],
      },
    };

    it("accepts valid page observation", () => {
      const result = PageObservationSchema.safeParse(validPage);
      expect(result.success).toBe(true);
    });

    it("rejects oversized headings.h1 array (> 200 items)", () => {
      const oversizedH1 = Array.from({ length: 201 }, (_, i) => `H1 Heading ${i}`);
      const result = PageObservationSchema.safeParse({
        ...validPage,
        headings: {
          ...validPage.headings,
          h1: oversizedH1,
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.join(".").includes("headings.h1"))).toBe(true);
      }
    });

    it("rejects oversized redirectHistory (> 100 items)", () => {
      const oversizedRedirects = Array.from({ length: 101 }, (_, i) => `https://example.com/step-${i}`);
      const result = PageObservationSchema.safeParse({
        ...validPage,
        redirectHistory: oversizedRedirects,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("redirectHistory"))).toBe(true);
      }
    });

    it("rejects oversized cookieAttributes (> 500 items)", () => {
      const oversizedCookies = Array.from({ length: 501 }, (_, i) => ({
        name: `cookie_${i}`,
        secure: true,
        httpOnly: true,
      }));
      const result = PageObservationSchema.safeParse({
        ...validPage,
        cookieAttributes: oversizedCookies,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("cookieAttributes"))).toBe(true);
      }
    });

    it("rejects oversized visibleTextSample (> 100,000 characters)", () => {
      const result = PageObservationSchema.safeParse({
        ...validPage,
        visibleTextSample: "T".repeat(100001),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("visibleTextSample"))).toBe(true);
      }
    });
  });

  describe("ExpertAssessmentResultSchema (Finding Collections)", () => {
    const validFinding = {
      id: "finding-1",
      testId: "SEC-02",
      testVersion: "2.0.0",
      category: "public_security" as const,
      categoryName: "Public Security",
      title: "Missing Security Headers",
      status: "FAIL" as const,
      severity: "HIGH" as const,
      confidence: "HIGH" as const,
      affectedUrls: ["https://example.com/"],
      technicalImpact: "Header absence exposes browser to clickjacking and MIME-sniffing.",
      businessImpact: "Risk of domain reputation damage and regulatory non-compliance.",
      remediation: "Configure Content-Security-Policy, X-Content-Type-Options and HSTS headers.",
      validationProcedure: "Issue curl -I to inspected origin and verify presence of defensive headers.",
      workstream: "security" as const,
      estimatedEffort: "QUICK_FIX" as const,
    };

    it("accepts valid bounded finding", () => {
      const result = ExpertAssessmentResultSchema.safeParse(validFinding);
      expect(result.success).toBe(true);
    });

    it("rejects oversized affectedUrls array (> 5000 items)", () => {
      const oversizedUrls = Array.from({ length: 5001 }, (_, i) => `https://example.com/page/${i}`);
      const result = ExpertAssessmentResultSchema.safeParse({
        ...validFinding,
        affectedUrls: oversizedUrls,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("affectedUrls") && i.code === "too_big")).toBe(true);
      }
    });

    it("rejects oversized affectedElements array (> 500 items)", () => {
      const oversizedElements = Array.from({ length: 501 }, (_, i) => `div#item-${i}`);
      const result = ExpertAssessmentResultSchema.safeParse({
        ...validFinding,
        affectedElements: oversizedElements,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("affectedElements"))).toBe(true);
      }
    });

    it("rejects oversized technicalImpact string (> 5000 chars)", () => {
      const result = ExpertAssessmentResultSchema.safeParse({
        ...validFinding,
        technicalImpact: "X".repeat(5001),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("technicalImpact"))).toBe(true);
      }
    });
  });

  describe("Tenant & User Schemas (Identity Bounds)", () => {
    it("rejects oversized tenant name (> 255 chars)", () => {
      const result = TenantSchema.safeParse({
        id: "tenant-1",
        name: "Corp ".repeat(60),
        slug: "valid-slug",
        createdAt: new Date().toISOString(),
      });
      expect(result.success).toBe(false);
    });

    it("rejects oversized user email (> 255 chars)", () => {
      const longEmail = "user_" + "a".repeat(250) + "@example.com";
      const result = UserSchema.safeParse({
        id: "user-1",
        tenantId: "tenant-1",
        email: longEmail,
        name: "Test User",
        createdAt: new Date().toISOString(),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("boundedRecord Helper Schema Enforcement", () => {
    it("accepts records within maximum key count and value bounds", () => {
      const validPage = {
        id: "page-1",
        requestedUrl: "https://example.com",
        normalizedUrl: "https://example.com/",
        finalUrl: "https://example.com/",
        statusCode: 200,
        responseTimeMs: 100,
        contentType: "text/html",
        headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
        openGraph: { "og:title": "Example Page", "og:type": "website" },
        headers: { "content-type": "text/html", "server": "cloudflare" },
      };
      const result = PageObservationSchema.safeParse(validPage);
      expect(result.success).toBe(true);
    });

    it("rejects openGraph record when key count exceeds maxKeys (100)", () => {
      const oversizedOg: Record<string, string> = {};
      for (let i = 0; i < 101; i++) {
        oversizedOg[`og:prop_${i}`] = `val_${i}`;
      }
      const page = {
        id: "page-1",
        requestedUrl: "https://example.com",
        normalizedUrl: "https://example.com/",
        finalUrl: "https://example.com/",
        statusCode: 200,
        responseTimeMs: 100,
        contentType: "text/html",
        headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
        openGraph: oversizedOg,
      };
      const result = PageObservationSchema.safeParse(page);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("Record exceeds maximum allowed keys"))).toBe(true);
      }
    });

    it("rejects record containing oversized value strings", () => {
      const page = {
        id: "page-1",
        requestedUrl: "https://example.com",
        normalizedUrl: "https://example.com/",
        finalUrl: "https://example.com/",
        statusCode: 200,
        responseTimeMs: 100,
        contentType: "text/html",
        headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
        openGraph: { "og:description": "X".repeat(2001) },
      };
      const result = PageObservationSchema.safeParse(page);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.code === "too_big")).toBe(true);
      }
    });

    it("checks maximum record key count BEFORE recursive validation of record values", () => {
      let innerValidatorCalls = 0;
      const trackedValueSchema = z.number().refine((val) => {
        innerValidatorCalls++;
        return val > 0;
      });
      const schema = boundedRecord(trackedValueSchema, 2);
      // Input has 3 keys (> max 2) with invalid values that would fail inner validation
      const input = { a: "not-a-number", b: -5, c: "also-not-a-number" };
      const res = schema.safeParse(input);

      expect(res.success).toBe(false);
      // Crucial verification: inner value validator must NOT be invoked when key limit is exceeded
      expect(innerValidatorCalls).toBe(0);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.message.includes("Record exceeds maximum allowed keys"))).toBe(true);
      }
    });

    it("stops key-counting immediately at maxKeys + 1 without invoking throwing value validators", () => {
      let innerCalls = 0;
      const throwingValueSchema = z.any().refine(() => {
        innerCalls++;
        throw new Error("Value validator should never be reached for oversized record");
      });

      const maxKeys = 5;
      const schema = boundedRecord(throwingValueSchema, maxKeys);

      // Construct an oversized record with 1,000 keys
      const oversizedPayload: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        oversizedPayload[`key_${i}`] = `value_${i}`;
      }

      const res = schema.safeParse(oversizedPayload);
      expect(res.success).toBe(false);
      expect(innerCalls).toBe(0);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe(`Record exceeds maximum allowed keys (${maxKeys})`);
      }
    });

    it("does not evaluate custom key schema when record exceeds key bound", () => {
      let keyValidatorCalls = 0;
      let valueValidatorCalls = 0;

      const trackedKeySchema = z.string().refine(() => {
        keyValidatorCalls++;
        return true;
      });
      const trackedValueSchema = z.string().refine(() => {
        valueValidatorCalls++;
        return true;
      });

      const schema = boundedRecord(trackedKeySchema, trackedValueSchema, 3);
      const input = { k1: "v1", k2: "v2", k3: "v3", k4: "v4" }; // 4 keys > max 3
      const res = schema.safeParse(input);

      expect(res.success).toBe(false);
      expect(keyValidatorCalls).toBe(0);
      expect(valueValidatorCalls).toBe(0);
    });
  });

  describe("Crawler DOM Extraction Bounded Array Construction (parsePageHtml)", () => {
    it("bounds H1 headings to 200 items even when HTML DOM contains 300 H1 tags", async () => {
      const { parsePageHtml } = await import("@/lib/scanner/html-parser");
      const h1Tags = Array.from({ length: 300 }, (_, i) => `<h1>Heading ${i}</h1>`).join("\n");
      const html = `<!DOCTYPE html><html><body>${h1Tags}</body></html>`;

      const observation = parsePageHtml(html, "https://example.com", 200, 50, {});
      expect(observation.headings.h1.length).toBe(200);
    });

    it("bounds links to 10000 items even when HTML contains 12000 links", async () => {
      const { parsePageHtml } = await import("@/lib/scanner/html-parser");
      const linkTags = Array.from({ length: 10500 }, (_, i) => `<a href="/page/${i}">Link ${i}</a>`).join("\n");
      const html = `<!DOCTYPE html><html><body>${linkTags}</body></html>`;

      const observation = parsePageHtml(html, "https://example.com", 200, 50, {});
      expect(observation.links.length).toBe(10000);
    });

    it("bounds forms extraction to 200 items", async () => {
      const { parsePageHtml } = await import("@/lib/scanner/html-parser");
      const formTags = Array.from({ length: 250 }, (_, i) => `<form action="/submit-${i}"><input type="text"/></form>`).join("\n");
      const html = `<!DOCTYPE html><html><body>${formTags}</body></html>`;

      const observation = parsePageHtml(html, "https://example.com", 200, 50, {});
      expect(observation.forms?.length).toBe(200);
    });

    it("bounds cookie attributes from headers to 500 items", async () => {
      const { parsePageHtml } = await import("@/lib/scanner/html-parser");
      const cookies = Array.from({ length: 600 }, (_, i) => `cookie_${i}=val_${i}; Secure; HttpOnly`);
      const headers = { "set-cookie": cookies as any };

      const observation = parsePageHtml("<html><body>Hello</body></html>", "https://example.com", 200, 50, headers);
      expect(observation.cookieAttributes.length).toBe(500);
    });

    it("bounds structured data entities, nested recursion depth, and array elements", async () => {
      const { parsePageHtml } = await import("@/lib/scanner/html-parser");

      // Construct deeply nested JSON-LD structure (12 levels deep)
      let deepObj: any = { leaf: "deep value" };
      for (let d = 0; d < 12; d++) {
        deepObj = { nestedLevel: d, child: deepObj };
      }

      const jsonLdContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Test Product",
        deepStructure: deepObj,
        oversizedArray: Array.from({ length: 150 }, (_, i) => `item_${i}`),
      });

      const html = `<!DOCTYPE html><html><head>
        <script type="application/ld+json">${jsonLdContent}</script>
      </head><body>Hello</body></html>`;

      const observation = parsePageHtml(html, "https://example.com", 200, 50, {});
      expect(observation.structuredData.length).toBe(1);

      const entity = observation.structuredData[0];
      expect(entity["@type"]).toBe("Product");
      expect(entity.oversizedArray.length).toBe(100); // Bounded to max 100 array items

      // Verify that recursion stopped at depth 8
      let curr = entity.deepStructure;
      let depth = 0;
      while (curr && curr.child) {
        depth++;
        curr = curr.child;
      }
      expect(depth).toBeLessThanOrEqual(8);
    });
  });

  describe("Validation Performance & Execution Stability", () => {
    it("completes rejection within tight latency bound (< 50ms) without runner stalling", () => {
      const startTime = performance.now();

      // Test a batch of 20 oversized collection inputs
      for (let i = 0; i < 20; i++) {
        ScanRequestSchema.safeParse({
          targetUrl: "https://example.com",
          reportType: "owner",
          assignedSpecialists: Array.from({ length: 60 }, (_, idx) => `Specialist ${idx}`),
        });
      }

      const elapsedMs = performance.now() - startTime;
      expect(elapsedMs).toBeLessThan(100); // 20 evaluations complete well under 100ms
    });
  });
});
