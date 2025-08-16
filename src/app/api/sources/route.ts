import { NextRequest, NextResponse } from "next/server";
import {
  createSource,
  getSource,
  getSourcesByQuestion,
  updateSource,
  updateSourceAnswerId,
  deleteSource,
  sourceExists,
  testDatabaseConnection,
} from "@/lib/database";

interface SourceData {
  questionId: number;
  answerId: number;
  answer: string;
  sources: string;
  hunterAddress: string;
  timestamp: number;
}

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

    const body: SourceData = await request.json();

    // Validate required fields
    if (
      body.questionId === undefined ||
      body.questionId === null ||
      body.answerId === undefined ||
      body.answerId === null ||
      !body.answer ||
      !body.sources ||
      !body.hunterAddress
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate data types
    if (
      typeof body.questionId !== "number" ||
      typeof body.answerId !== "number"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid questionId or answerId" },
        { status: 400 }
      );
    }

    if (typeof body.answer !== "string" || body.answer.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Answer cannot be empty" },
        { status: 400 }
      );
    }

    if (typeof body.sources !== "string" || body.sources.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Sources cannot be empty" },
        { status: 400 }
      );
    }

    if (
      typeof body.hunterAddress !== "string" ||
      !body.hunterAddress.startsWith("0x")
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid hunter address" },
        { status: 400 }
      );
    }

    // Check if source already exists
    const exists = await sourceExists(body.questionId, body.answerId);

    let source;
    if (exists) {
      // Update existing source
      source = await updateSource(body.questionId, body.answerId, {
        answer: body.answer,
        sources: body.sources,
        hunterAddress: body.hunterAddress,
        timestamp: body.timestamp,
      });
    } else {
      // Create new source
      source = await createSource({
        questionId: body.questionId,
        answerId: body.answerId,
        answer: body.answer,
        sources: body.sources,
        hunterAddress: body.hunterAddress,
        timestamp: body.timestamp,
      });
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Sources saved successfully",
      data: {
        questionId: source.questionId,
        answerId: source.answerId,
        savedAt: source.createdAt.toISOString(),
        updatedAt: source.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in sources API:", error);

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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, oldAnswerId, newAnswerId } = body;

    // Validate required fields
    if (
      questionId === undefined ||
      questionId === null ||
      oldAnswerId === undefined ||
      oldAnswerId === null ||
      newAnswerId === undefined ||
      newAnswerId === null
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate data types
    if (
      typeof questionId !== "number" ||
      typeof oldAnswerId !== "number" ||
      typeof newAnswerId !== "number"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid questionId or answerId" },
        { status: 400 }
      );
    }

    // Update the answer ID
    const source = await updateSourceAnswerId(
      questionId,
      oldAnswerId,
      newAnswerId
    );

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Source answer ID updated successfully",
      data: {
        questionId: source.questionId,
        answerId: source.answerId,
        updatedAt: source.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in sources PATCH API:", error);

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");
    const answerId = searchParams.get("answerId");

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: "Missing questionId parameter" },
        { status: 400 }
      );
    }

    const questionIdNum = parseInt(questionId);

    if (isNaN(questionIdNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid questionId parameter" },
        { status: 400 }
      );
    }

    if (answerId) {
      // Get specific source for question and answer
      const answerIdNum = parseInt(answerId);

      if (isNaN(answerIdNum)) {
        return NextResponse.json(
          { success: false, error: "Invalid answerId parameter" },
          { status: 400 }
        );
      }

      const source = await getSource(questionIdNum, answerIdNum);

      if (!source) {
        return NextResponse.json(
          { success: false, error: "Source not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          questionId: source.questionId,
          answerId: source.answerId,
          answer: source.answer,
          sources: source.sources,
          hunterAddress: source.hunterAddress,
          timestamp: Number(source.timestamp),
          createdAt: source.createdAt.toISOString(),
          updatedAt: source.updatedAt.toISOString(),
        },
      });
    } else {
      // Get all sources for a question
      const sources = await getSourcesByQuestion(questionIdNum);

      return NextResponse.json({
        success: true,
        data: sources.map((source) => ({
          questionId: source.questionId,
          answerId: source.answerId,
          answer: source.answer,
          sources: source.sources,
          hunterAddress: source.hunterAddress,
          timestamp: Number(source.timestamp),
          createdAt: source.createdAt.toISOString(),
          updatedAt: source.updatedAt.toISOString(),
        })),
      });
    }
  } catch (error) {
    console.error("Error fetching sources:", error);

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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");
    const answerId = searchParams.get("answerId");

    if (!questionId || !answerId) {
      return NextResponse.json(
        { success: false, error: "Missing questionId or answerId parameter" },
        { status: 400 }
      );
    }

    const questionIdNum = parseInt(questionId);
    const answerIdNum = parseInt(answerId);

    if (isNaN(questionIdNum) || isNaN(answerIdNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid questionId or answerId parameter" },
        { status: 400 }
      );
    }

    await deleteSource(questionIdNum, answerIdNum);

    return NextResponse.json({
      success: true,
      message: "Source deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting source:", error);

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
