import { describe, it, expect } from "vitest";
import { normalizeAndValidateUrl } from "./url-validator";

describe("url-validator", () => {
  it("normalizes a bare domain to https", () => {
    const result = normalizeAndValidateUrl("naffeez.com");
    expect(result.isValid).toBe(true);
    expect(result.normalizedUrl).toBe("https://naffeez.com/");
    expect(result.domain).toBe("naffeez.com");
  });

  it("normalizes an http URL correctly", () => {
    const result = normalizeAndValidateUrl("http://example.com/shop?b=2&a=1#section");
    expect(result.isValid).toBe(true);
    // Hash removed, query parameters sorted
    expect(result.normalizedUrl).toBe("http://example.com/shop?a=1&b=2");
  });

  it("rejects localhost and loopback variations", () => {
    expect(normalizeAndValidateUrl("localhost").isValid).toBe(false);
    expect(normalizeAndValidateUrl("http://localhost:3000").isValid).toBe(false);
    expect(normalizeAndValidateUrl("127.0.0.1").isValid).toBe(false);
    expect(normalizeAndValidateUrl("https://127.0.0.1").isValid).toBe(false);
    expect(normalizeAndValidateUrl("::1").isValid).toBe(false);
  });

  it("rejects unsupported and dangerous schemes", () => {
    expect(normalizeAndValidateUrl("ftp://files.example.com").isValid).toBe(false);
    expect(normalizeAndValidateUrl("file:///etc/passwd").isValid).toBe(false);
    expect(normalizeAndValidateUrl("javascript:alert(1)").isValid).toBe(false);
    expect(normalizeAndValidateUrl("data:text/html,<h1>Hi</h1>").isValid).toBe(false);
    expect(normalizeAndValidateUrl("gopher://gopher.floodgap.com").isValid).toBe(false);
  });

  it("rejects embedded user credentials", () => {
    const result = normalizeAndValidateUrl("https://admin:secret123@example.com");
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("embedded user credentials");
  });

  it("rejects prohibited ports outside 80 and 443", () => {
    expect(normalizeAndValidateUrl("https://example.com:8080").isValid).toBe(false);
    expect(normalizeAndValidateUrl("https://example.com:22").isValid).toBe(false);
    expect(normalizeAndValidateUrl("http://example.com:80").isValid).toBe(true);
    expect(normalizeAndValidateUrl("https://example.com:443").isValid).toBe(true);
  });

  it("rejects malformed domains and short strings", () => {
    expect(normalizeAndValidateUrl("").isValid).toBe(false);
    expect(normalizeAndValidateUrl("   ").isValid).toBe(false);
    expect(normalizeAndValidateUrl("ab").isValid).toBe(false);
    expect(normalizeAndValidateUrl("nodotdomain").isValid).toBe(false);
  });
});
