import { NextRequest, NextResponse } from "next/server";
import {
  upsertQuestion,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  CreateQuestionData,
  testDatabaseConnection,
} from "@/lib/database";

// POST - Create a new question with rules
export async function POST(request: NextRequest) {
  try {
    // Test database connection first
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.error("Database connection failed");
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
          details: "Unable to connect to the database",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { questionId, rules } = body;

    // Validate required fields
    if (
      questionId === undefined ||
      questionId === null ||
      typeof questionId !== "number"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields or invalid data types",
        },
        { status: 400 }
      );
    }

    const questionData: CreateQuestionData = {
      questionId,
      rules: rules || undefined,
    };

    const question = await upsertQuestion(questionData);

    return NextResponse.json({
      success: true,
      message: "Question saved successfully",
      data: {
        questionId: question.questionId,
        rules: question.rules,
        createdAt: question.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in questions POST API:", error);

    // Check for specific database errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check for common database errors
    if (errorMessage.includes("P1001") || errorMessage.includes("P1002")) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection error",
          details:
            "Unable to connect to the database. Please check your DATABASE_URL configuration.",
        },
        { status: 503 }
      );
    }

    if (errorMessage.includes("P2002")) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate entry",
          details: "A question with this ID already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// GET - Retrieve question data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: "Question ID is required" },
        { status: 400 }
      );
    }

    const question = await getQuestion(parseInt(questionId));

    if (!question) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        questionId: question.questionId,
        rules: question.rules,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in questions GET API:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// PATCH - Update question data
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, rules } = body;

    // Validate required fields
    if (
      questionId === undefined ||
      questionId === null ||
      typeof questionId !== "number"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields or invalid data types",
        },
        { status: 400 }
      );
    }

    const question = await updateQuestion(questionId, { rules });

    return NextResponse.json({
      success: true,
      message: "Question updated successfully",
      data: {
        questionId: question.questionId,
        rules: question.rules,
        updatedAt: question.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in questions PATCH API:", error);
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

// DELETE - Delete question data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: "Question ID is required" },
        { status: 400 }
      );
    }

    await deleteQuestion(parseInt(questionId));

    return NextResponse.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error in questions DELETE API:", error);
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
