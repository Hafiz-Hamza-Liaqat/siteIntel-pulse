import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/health/route";
import { scanDb, getScanDb } from "@/lib/persistence/db";

describe("Health & Readiness Probe (/api/health)", () => {
  it("verifies scanDb.ping() returns true when SQLite database is open and healthy", () => {
    const isHealthy = scanDb.ping();
    expect(isHealthy).toBe(true);
  });

  it("returns HTTP 200 and healthy status when database is operational", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("healthy");
    expect(typeof data.uptimeSeconds).toBe("number");
    expect(data.version).toBe("1.0.0");
    expect(data.checks.database).toBe("connected");
    expect(res.headers.get("Cache-Control")).toContain("no-store");

    // Strict security check: ensure no internal paths or sensitive tokens are leaked
    const jsonStr = JSON.stringify(data);
    expect(jsonStr).not.toContain("password");
    expect(jsonStr).not.toContain("secret");
    expect(jsonStr).not.toContain(".db");
    expect(jsonStr).not.toContain("siteintel.db");
  });

  it("returns HTTP 503 and unhealthy status when database connectivity fails", async () => {
    // Spy on underlying singleton instance ping method
    const dbInstance = getScanDb();
    const spy = vi.spyOn(dbInstance, "ping").mockReturnValue(false);

    try {
      const res = await GET();
      expect(res.status).toBe(503);

      const data = await res.json();
      expect(data.status).toBe("unhealthy");
      expect(data.checks.database).toBe("disconnected");
    } finally {
      spy.mockRestore();
    }
  });
});
