import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/database";

// GET - Fetch all questions (for debugging)
export async function GET() {
  try {
    const client = getPrismaClient();
    const questions = await client.question.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      count: questions.length,
      data: questions.map((question) => ({
        id: question.id,
        questionId: question.questionId,
        rules: question.rules,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error in questions debug GET API:", error);
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

// DELETE - Clear all questions (for debugging)
export async function DELETE() {
  try {
    const client = getPrismaClient();
    await client.question.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "All questions cleared successfully",
    });
  } catch (error) {
    console.error("Error in questions debug DELETE API:", error);
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
