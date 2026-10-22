import { NextResponse } from "next/server";
import { scanDb } from "@/lib/persistence/db";

export const dynamic = "force-dynamic";

/**
 * Health & Readiness Probe
 * Verifies application liveness and database connectivity without exposing
 * internal paths, secrets, or sensitive configuration.
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const uptimeSeconds = Math.floor(process.uptime());

  try {
    // Verify SQLite connectivity using a safe query
    const dbOk = scanDb.ping();
    if (!dbOk) {
      throw new Error("Database ping failed");
    }

    return NextResponse.json(
      {
        status: "healthy",
        uptimeSeconds,
        timestamp,
        version: "1.0.0",
        checks: {
          database: "connected",
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        uptimeSeconds,
        timestamp,
        checks: {
          database: "disconnected",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
