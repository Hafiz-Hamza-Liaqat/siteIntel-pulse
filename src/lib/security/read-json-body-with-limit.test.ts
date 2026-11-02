import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { readJsonBodyWithLimit } from "./read-json-body-with-limit";
import { POST as scanPostHandler } from "@/app/api/scan/route";

describe("readJsonBodyWithLimit Security Utility", () => {
  it("successfully parses valid JSON below the configured byte limit", async () => {
    const payload = { targetUrl: "https://example.com", reportType: "owner" };
    const bodyStr = JSON.stringify(payload);
    const req = new NextRequest("http://localhost:3000/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyStr,
    });

    const result = await readJsonBodyWithLimit(req, 1024);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(payload);
    }
  });

  it("accurately counts actual UTF-8 multibyte bytes rather than string characters", async () => {
    // Each 🚀 is 4 UTF-8 bytes. 10 emojis = 40 bytes.
    const emojiStr = "🚀".repeat(10);
    const payload = { test: emojiStr };
    const jsonStr = JSON.stringify(payload);
    const actualBytes = Buffer.byteLength(jsonStr, "utf8");

    // Setting maxBytes exactly to actualBytes should succeed
    const reqPass = new NextRequest("http://localhost:3000/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonStr,
    });
    const passResult = await readJsonBodyWithLimit(reqPass, actualBytes);
    expect(passResult.success).toBe(true);

    // Setting maxBytes to 1 byte less than actualBytes must fail with 413
    const reqFail = new NextRequest("http://localhost:3000/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonStr,
    });
    const failResult = await readJsonBodyWithLimit(reqFail, actualBytes - 1);
    expect(failResult.success).toBe(false);
    if (!failResult.success) {
      expect(failResult.response.status).toBe(413);
      const json = await failResult.response.json();
      expect(json.code).toBe("PAYLOAD_TOO_LARGE");
    }
  });

  it("early-rejects with HTTP 413 when Content-Length header exceeds limit", async () => {
    const req = new NextRequest("http://localhost:3000/api/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "1000000",
      },
      body: JSON.stringify({ a: 1 }),
    });

    const result = await readJsonBodyWithLimit(req, 500);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(413);
      const json = await result.response.json();
      expect(json.code).toBe("PAYLOAD_TOO_LARGE");
    }
  });

  it("rejects an oversized streamed body with NO Content-Length header via active byte counting", async () => {
    // Generate chunks exceeding limit of 500 bytes
    const chunk1 = new TextEncoder().encode('{"data":"' + "A".repeat(300));
    const chunk2 = new TextEncoder().encode("B".repeat(300) + '"}');

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      },
    });

    const req = new Request("http://localhost:3000/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" }, // no Content-Length header
      body: stream,
      // @ts-expect-error duplex required in Node fetch
      duplex: "half",
    });

    const result = await readJsonBodyWithLimit(req, 500);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(413);
      const json = await result.response.json();
      expect(json.code).toBe("PAYLOAD_TOO_LARGE");
    }
  });

  it("rejects when Content-Length is falsified (smaller than actual stream size)", async () => {
    const chunk1 = new TextEncoder().encode('{"data":"' + "A".repeat(300));
    const chunk2 = new TextEncoder().encode("B".repeat(300) + '"}');

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      },
    });

    const req = new Request("http://localhost:3000/api/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "50", // Falsified low Content-Length
      },
      body: stream,
      // @ts-expect-error duplex required in Node fetch
      duplex: "half",
    });

    const result = await readJsonBodyWithLimit(req, 400);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(413);
      const json = await result.response.json();
      expect(json.code).toBe("PAYLOAD_TOO_LARGE");
    }
  });

  it("cancels the stream reader immediately upon exceeding the limit", async () => {
    let cancelCalled = false;
    let cancelReason: any = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(200));
        controller.enqueue(new Uint8Array(200));
        controller.enqueue(new Uint8Array(200));
      },
      cancel(reason) {
        cancelCalled = true;
        cancelReason = reason;
      },
    });

    const req = new Request("http://localhost:3000/api/scan", {
      method: "POST",
      body: stream,
      // @ts-expect-error duplex
      duplex: "half",
    });

    const result = await readJsonBodyWithLimit(req, 300);
    expect(result.success).toBe(false);
    expect(cancelCalled).toBe(true);
    expect(cancelReason).toBe("Payload too large");
  });

  it("returns HTTP 400 on malformed JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ unclosed_json: true",
    });

    const result = await readJsonBodyWithLimit(req, 1024);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const json = await result.response.json();
      expect(json.code).toBe("INVALID_JSON");
    }
  });

  it("returns HTTP 400 on invalid UTF-8 byte sequences", async () => {
    // 0xFF 0xFE is an invalid UTF-8 sequence
    const invalidUtf8 = new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(invalidUtf8);
        controller.close();
      },
    });

    const req = new Request("http://localhost:3000/api/scan", {
      method: "POST",
      body: stream,
      // @ts-expect-error duplex
      duplex: "half",
    });

    const result = await readJsonBodyWithLimit(req, 1024);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const json = await result.response.json();
      expect(json.code).toBe("INVALID_ENCODING");
    }
  });

  it("returns HTTP 400 on empty body", async () => {
    const req = new NextRequest("http://localhost:3000/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    });

    const result = await readJsonBodyWithLimit(req, 1024);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
    }
  });

  describe("API Route Integration: /api/scan limits (512 KiB)", () => {
    it("returns HTTP 413 before Zod validation when request exceeds 512 KiB", async () => {
      // 513 KiB payload
      const oversizedPayload = {
        targetUrl: "https://example.com",
        reportType: "owner",
        padding: "X".repeat(513 * 1024),
      };

      const req = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": "203.0.113.195",
        },
        body: JSON.stringify(oversizedPayload),
      });

      const res = await scanPostHandler(req);
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.code).toBe("PAYLOAD_TOO_LARGE");
    });
  });
});
