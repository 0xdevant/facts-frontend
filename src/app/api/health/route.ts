import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/database";

// GET - Health check endpoint
export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      api: "healthy",
      database: "unknown",
    },
  };

  try {
    // Test database connection
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    health.services.database = "healthy";
  } catch (error) {
    console.warn("Database health check failed:", error);
    health.services.database = "unhealthy";
    health.status = "degraded";
  }

  const statusCode = health.status === "healthy" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
