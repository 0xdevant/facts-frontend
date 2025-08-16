// Health check utility for frontend

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    api: "healthy" | "unhealthy";
    database: "healthy" | "unhealthy";
  };
}

// Check system health
export async function checkHealth(): Promise<HealthStatus | null> {
  try {
    const response = await fetch("/api/health", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("Health check failed with status:", response.status);
      return null;
    }

    const health = await response.json();
    return health;
  } catch (error) {
    console.warn("Health check failed:", error);
    return null;
  }
}

// Check if database is available
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    const health = await checkHealth();
    return health?.services?.database === "healthy";
  } catch (error) {
    console.warn("Database availability check failed:", error);
    return false;
  }
}
