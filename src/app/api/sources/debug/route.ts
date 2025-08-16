import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/database";
import { SourceRecord } from "@/lib/database";

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { success: false, error: "Debug endpoint only available in development" },
      { status: 403 }
    );
  }

  try {
    const client = getPrismaClient();

    // Get all sources
    const sources = await client.source.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get count
    const count = await client.source.count();

    return NextResponse.json({
      success: true,
      data: {
        count,
        sources: sources.map((source: SourceRecord) => ({
          id: source.id,
          questionId: source.questionId,
          answerId: source.answerId,
          answer: source.answer,
          sources: source.sources,
          hunterAddress: source.hunterAddress,
          timestamp: Number(source.timestamp),
          createdAt: source.createdAt.toISOString(),
          updatedAt: source.updatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Error in debug API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { success: false, error: "Debug endpoint only available in development" },
      { status: 403 }
    );
  }

  try {
    const client = getPrismaClient();

    // Delete all sources
    const result = await client.source.deleteMany();

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} sources`,
      data: {
        deletedCount: result.count,
      },
    });
  } catch (error) {
    console.error("Error in debug API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
