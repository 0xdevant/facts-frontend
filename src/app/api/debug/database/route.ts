import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient, testDatabaseConnection } from "@/lib/database";

export async function GET(request: NextRequest) {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL ? "Set" : "Not set",
    databaseUrlLength: process.env.DATABASE_URL?.length || 0,
    connectionTest: "pending",
    prismaClient: "pending",
    error: null as string | null,
  };

  try {
    // Test basic connection
    debugInfo.connectionTest = (await testDatabaseConnection())
      ? "success"
      : "failed";

    // Test Prisma client operations
    const client = getPrismaClient();

    // Test a simple query
    const result = await client.$queryRaw`SELECT 1 as test`;
    debugInfo.prismaClient = "success";

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      testResult: result,
    });
  } catch (error) {
    debugInfo.error = error instanceof Error ? error.message : "Unknown error";
    debugInfo.connectionTest = "failed";
    debugInfo.prismaClient = "failed";

    console.error("Database debug error:", error);

    return NextResponse.json(
      {
        success: false,
        debug: debugInfo,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case "test-query":
        const client = getPrismaClient();
        const result = await client.$queryRaw`SELECT NOW() as current_time`;
        return NextResponse.json({
          success: true,
          result,
        });

      case "test-insert":
        // Test inserting a temporary record
        const client2 = getPrismaClient();
        const testQuestion = await client2.question.create({
          data: {
            questionId: 999999, // Use a very high number to avoid conflicts
            rules: "Test rule for debugging",
          },
        });

        // Clean up the test record
        await client2.question.delete({
          where: { questionId: 999999 },
        });

        return NextResponse.json({
          success: true,
          message: "Test insert and delete successful",
          testRecord: testQuestion,
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Database debug POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
