import { describe, it, expect, vi } from "vitest";
import { JobManager } from "./job-manager";
import * as dnsSafety from "./dns-safety";

describe("JobManager", () => {
  it("rejects scan request for invalid or unsafe URL", async () => {
    const manager = new JobManager();
    const result = await manager.submitScan({
      targetUrl: "http://127.0.0.1:8080",
      reportType: "owner",
      businessCategory: "ecommerce",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 50,
      maxDepth: 3,
    });

    expect(result.job).toBeUndefined();
    expect(result.error).toBeDefined();
  });

  it("creates a scan job for a valid target URL", async () => {
    // Mock validateUrlSafety to be safe for this test
    vi.spyOn(dnsSafety, "validateUrlSafety").mockResolvedValueOnce({
      isSafe: true,
      resolvedIps: ["93.184.216.34"],
    });

    const manager = new JobManager();
    const result = await manager.submitScan({
      targetUrl: "https://example.com",
      reportType: "owner",
      platformName: "Example Store",
      businessCategory: "ecommerce",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 50,
      maxDepth: 3,
    });

    expect(result.error).toBeUndefined();
    expect(result.job).toBeDefined();
    expect(result.job?.status).toBe("queued");
    expect(result.job?.request.targetUrl).toBe("https://example.com/");
  });

  it("cancels an active scan job properly", async () => {
    vi.spyOn(dnsSafety, "validateUrlSafety").mockResolvedValueOnce({
      isSafe: true,
      resolvedIps: ["93.184.216.34"],
    });

    const manager = new JobManager();
    const sub = await manager.submitScan({
      targetUrl: "https://example.com/cancel-test",
      reportType: "owner",
      businessCategory: "ecommerce",
      targetMarket: "US",
      preferredLanguage: "en",
      competitors: [],
      maxPages: 50,
      maxDepth: 3,
    });

    const jobId = sub.job!.id;
    const cancelRes = await manager.cancelScan(jobId);
    expect(cancelRes.success).toBe(true);

    const updated = await manager.getJob(jobId);
    expect(updated?.status).toBe("canceled");
    expect(updated?.currentStage).toContain("canceled by user");

    // Second cancellation attempt should fail gracefully
    const secondCancel = await manager.cancelScan(jobId);
    expect(secondCancel.success).toBe(false);
    expect(secondCancel.message).toContain("Cannot cancel job in 'canceled' state");
  });
});
