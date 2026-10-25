import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkPublicExposure } from "./exposure-checker";

describe("Public Exposure Checker — Bounded & Evidence Integrity", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("reads only the small stream prefix and cancels the stream for large bodies", async () => {
    let cancelCalled = false;
    let chunksRead = 0;

    // Stream that yields 100 chunks of 1KB each (100KB total)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 100; i++) {
          controller.enqueue(new TextEncoder().encode("A".repeat(1024)));
        }
        controller.close();
      },
      cancel() {
        cancelCalled = true;
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "text/plain" }),
      body: stream,
    });

    const result = await checkPublicExposure("https://example.com");

    expect(cancelCalled).toBe(true);
    // Large body without exposure indicator is treated as inconclusive
    expect(result.isInconclusive).toBe(true);
    expect(result.hasExposure).toBe(false);
  });

  it("treats aborted or stalled body streams as inconclusive within timeout", async () => {
    // Hanging stream that never yields chunks
    const hangingStream = new ReadableStream<Uint8Array>({
      start() {
        // intentionally stalled
      },
      cancel() {},
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "text/plain" }),
      body: hangingStream,
    });

    const result = await checkPublicExposure("https://example.com", { timeoutMs: 50 });

    expect(result.hasExposure).toBe(false);
    expect(result.isInconclusive).toBe(true);
    expect(result.inconclusiveReason).toContain("inconclusive");
  });

  it("aborts probe execution immediately when parent AbortSignal is triggered", async () => {
    const controller = new AbortController();
    controller.abort();

    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const result = await checkPublicExposure("https://example.com", {
      abortSignal: controller.signal,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.isInconclusive).toBe(true);
  });

  it("classifies HTTP redirects (301, 302) as inconclusive", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 302,
      headers: new Headers({ location: "https://example.com/login" }),
      body: null,
    });

    const result = await checkPublicExposure("https://example.com");

    expect(result.hasExposure).toBe(false);
    expect(result.isInconclusive).toBe(true);
    expect(result.evidence.some((e) => e.includes("302"))).toBe(true);
  });

  it("classifies generic HTML application fallbacks (SPA catch-all) as inconclusive", async () => {
    const htmlStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode("<!doctype html><html><head><title>App</title></head><body><div id='root'></div></body></html>")
        );
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      body: htmlStream,
    });

    const result = await checkPublicExposure("https://example.com");

    expect(result.hasExposure).toBe(false);
    expect(result.isInconclusive).toBe(true);
    expect(result.inconclusiveReason).toContain("generic HTML application fallback");
  });

  it("classifies unrecognized HTTP 200 bodies as inconclusive", async () => {
    const jsonStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ error: "not found", code: 404 })));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: jsonStream,
    });

    const result = await checkPublicExposure("https://example.com");

    expect(result.hasExposure).toBe(false);
    expect(result.isInconclusive).toBe(true);
  });

  it("classifies HTTP 403 and 404 responses as safe and reports PASS when both probes are safe", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes(".env")) {
        return Promise.resolve({ status: 404, headers: new Headers(), body: null });
      }
      if (u.includes(".git")) {
        return Promise.resolve({ status: 403, headers: new Headers(), body: null });
      }
      return Promise.resolve({ status: 404, headers: new Headers(), body: null });
    });

    const result = await checkPublicExposure("https://example.com");

    expect(result.hasExposure).toBe(false);
    expect(result.isInconclusive).toBe(false);
    expect(result.executed).toBe(true);
    expect(result.safeSummaries[0]).toContain("No public config leaks detected");
  });

  it("classifies HTTP 500 and 503 server errors as inconclusive", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 500,
      headers: new Headers(),
      body: null,
    });

    const result = await checkPublicExposure("https://example.com");

    expect(result.hasExposure).toBe(false);
    expect(result.isInconclusive).toBe(true);
  });

  it("detects confirmed exposure on .env and redacts sensitive response content", async () => {
    const envContent = "DB_PASSWORD=super_secret_production_password_12345\nAWS_SECRET_KEY=AKIAIOSFODNN7EXAMPLE";
    const envStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(envContent));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes(".env")) {
        return Promise.resolve({
          status: 200,
          headers: new Headers({ "content-type": "text/plain" }),
          body: envStream,
        });
      }
      return Promise.resolve({ status: 404, headers: new Headers(), body: null });
    });

    const result = await checkPublicExposure("https://example.com");

    expect(result.hasExposure).toBe(true);
    expect(result.exposedPaths).toContain("/.env");

    // Strictly ensure no raw sensitive tokens are exposed in evidence or summaries
    const combinedOutput = JSON.stringify(result);
    expect(combinedOutput).not.toContain("super_secret_production_password_12345");
    expect(combinedOutput).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(combinedOutput).toContain("redacted");
  });

  it("detects confirmed exposure on .git/HEAD", async () => {
    const gitStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("ref: refs/heads/main\n"));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes(".git/HEAD")) {
        return Promise.resolve({
          status: 200,
          headers: new Headers({ "content-type": "text/plain" }),
          body: gitStream,
        });
      }
      return Promise.resolve({ status: 404, headers: new Headers(), body: null });
    });

    const result = await checkPublicExposure("https://example.com");

    expect(result.hasExposure).toBe(true);
    expect(result.exposedPaths).toContain("/.git/HEAD");
  });
});
