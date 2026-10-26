import { describe, it, expect, vi, afterEach } from "vitest";
import { checkPublicExposure, hasEnvFileSignature } from "./exposure-checker";
import * as pinnedTransport from "./pinned-transport";

describe("Public Exposure Checker — Bounded & Evidence Integrity", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("reads only the small stream prefix and cancels the stream for large bodies", async () => {
    let cancelCalled = false;

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

    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "text/plain" }),
      body: stream,
    });

    const result = await checkPublicExposure("https://example.com", { fetchFn: mockFetch });

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

    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "text/plain" }),
      body: hangingStream,
    });

    const result = await checkPublicExposure("https://example.com", {
      fetchFn: mockFetch,
      timeoutMs: 50,
    });

    expect(result.hasExposure).toBe(false);
    expect(result.isInconclusive).toBe(true);
    expect(result.inconclusiveReason).toContain("inconclusive");
  });

  it("aborts probe execution immediately when parent AbortSignal is triggered", async () => {
    const controller = new AbortController();
    controller.abort();

    const fetchSpy = vi.fn();

    const result = await checkPublicExposure("https://example.com", {
      fetchFn: fetchSpy,
      abortSignal: controller.signal,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.isInconclusive).toBe(true);
  });

  it("classifies HTTP redirects (301, 302) as inconclusive", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 302,
      headers: new Headers({ location: "https://example.com/login" }),
      body: null,
    });

    const result = await checkPublicExposure("https://example.com", { fetchFn: mockFetch });

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

    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      body: htmlStream,
    });

    const result = await checkPublicExposure("https://example.com", { fetchFn: mockFetch });

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

    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: jsonStream,
    });

    const result = await checkPublicExposure("https://example.com", { fetchFn: mockFetch });

    expect(result.hasExposure).toBe(false);
    expect(result.isInconclusive).toBe(true);
  });

  it("classifies HTTP 403 and 404 responses as safe and reports PASS when both probes are safe", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes(".env")) {
        return Promise.resolve({ status: 404, headers: new Headers(), body: null });
      }
      if (u.includes(".git")) {
        return Promise.resolve({ status: 403, headers: new Headers(), body: null });
      }
      return Promise.resolve({ status: 404, headers: new Headers(), body: null });
    });

    const result = await checkPublicExposure("https://example.com", { fetchFn: mockFetch });

    expect(result.hasExposure).toBe(false);
    expect(result.isInconclusive).toBe(false);
    expect(result.executed).toBe(true);
    expect(result.safeSummaries[0]).toContain("No public config leaks detected");
  });

  it("classifies HTTP 500 and 503 server errors as inconclusive", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 500,
      headers: new Headers(),
      body: null,
    });

    const result = await checkPublicExposure("https://example.com", { fetchFn: mockFetch });

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

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes(".env")) {
        return Promise.resolve({
          status: 200,
          headers: new Headers({ "content-type": "text/plain" }),
          body: envStream,
        });
      }
      return Promise.resolve({ status: 404, headers: new Headers(), body: null });
    });

    const result = await checkPublicExposure("https://example.com", { fetchFn: mockFetch });

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

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes(".git/HEAD")) {
        return Promise.resolve({
          status: 200,
          headers: new Headers({ "content-type": "text/plain" }),
          body: gitStream,
        });
      }
      return Promise.resolve({ status: 404, headers: new Headers(), body: null });
    });

    const result = await checkPublicExposure("https://example.com", { fetchFn: mockFetch });

    expect(result.hasExposure).toBe(true);
    expect(result.exposedPaths).toContain("/.git/HEAD");
  });

  it("unconditionally uses pinnedFetch in production even if globalThis.fetch is monkeypatched", async () => {
    const attackerFetch = vi.fn().mockImplementation(() => {
      throw new Error("ATTACKER_GLOBAL_FETCH_SHOULD_NEVER_BE_CALLED");
    });
    globalThis.fetch = attackerFetch as any;

    const pinnedFetchSpy = vi.spyOn(pinnedTransport, "pinnedFetch").mockResolvedValue(
      new Response("Not Found", { status: 404 })
    );

    const result = await checkPublicExposure("https://example.com");

    expect(pinnedFetchSpy).toHaveBeenCalled();
    expect(attackerFetch).not.toHaveBeenCalled();
    expect(result.executed).toBe(true);
  });

  describe("hasEnvFileSignature & Plausible Assignment Validation", () => {
    it("recognizes valid env file assignments", () => {
      expect(hasEnvFileSignature("DB_HOST=127.0.0.1\nDB_USER=root")).toBe(true);
      expect(hasEnvFileSignature("APP_KEY=base64:xyz123")).toBe(true);
      expect(hasEnvFileSignature("SECRET_KEY=my_super_secret")).toBe(true);
      expect(hasEnvFileSignature("NODE_ENV=production")).toBe(true);
      expect(hasEnvFileSignature("# Comment\nPORT=3000")).toBe(true);
    });

    it("does not flag arbitrary prose, math, or lowercase variables with =", () => {
      expect(hasEnvFileSignature("const x = 5;")).toBe(false);
      expect(hasEnvFileSignature("The result is 2 + 2 = 4.")).toBe(false);
      expect(hasEnvFileSignature("hello = world")).toBe(false);
      expect(hasEnvFileSignature("query = search")).toBe(false);
      expect(hasEnvFileSignature("# Just comments\n# with = signs")).toBe(false);
    });

    it("treats responses with arbitrary = characters as inconclusive instead of exposed", async () => {
      const arbitraryStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode("var width = 100; var height = 200; return width * height;")
          );
          controller.close();
        },
      });

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (String(url).includes(".env")) {
          return Promise.resolve({
            status: 200,
            headers: new Headers({ "content-type": "text/plain" }),
            body: arbitraryStream,
          });
        }
        return Promise.resolve({ status: 404, headers: new Headers(), body: null });
      });

      const result = await checkPublicExposure("https://example.com", { fetchFn: mockFetch });

      expect(result.hasExposure).toBe(false);
      expect(result.isInconclusive).toBe(true);
      expect(result.inconclusiveReason).toContain("inconclusive");
    });
  });
});
