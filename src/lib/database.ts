import { PrismaClient } from "@prisma/client";

// Global variable to store the Prisma client instance
let prisma: PrismaClient;

// Function to get or create the Prisma client
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }
  return prisma;
}

// Function to close the database connection
export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

// Database operations for sources
export interface CreateSourceData {
  questionId: number;
  answerId: number;
  answer: string;
  sources: string;
  hunterAddress: string;
  timestamp: number;
}

export interface SourceRecord {
  id: number;
  questionId: number;
  answerId: number;
  answer: string;
  sources: string;
  hunterAddress: string;
  timestamp: bigint;
  createdAt: Date;
  updatedAt: Date;
}

// Create a new source record
export async function createSource(
  data: CreateSourceData
): Promise<SourceRecord> {
  const client = getPrismaClient();

  try {
    const source = await client.source.create({
      data: {
        questionId: data.questionId,
        answerId: data.answerId,
        answer: data.answer,
        sources: data.sources,
        hunterAddress: data.hunterAddress,
        timestamp: BigInt(data.timestamp),
      },
    });

    return source;
  } catch (error) {
    console.error("Error creating source:", error);
    throw new Error("Failed to save source to database");
  }
}

// Get source by question ID and answer ID
export async function getSource(
  questionId: number,
  answerId: number
): Promise<SourceRecord | null> {
  const client = getPrismaClient();

  try {
    const source = await client.source.findFirst({
      where: {
        questionId,
        answerId,
      },
    });

    return source;
  } catch (error) {
    console.error("Error fetching source:", error);
    throw new Error("Failed to fetch source from database");
  }
}

// Get all sources for a question
export async function getSourcesByQuestion(
  questionId: number
): Promise<SourceRecord[]> {
  const client = getPrismaClient();

  try {
    const sources = await client.source.findMany({
      where: {
        questionId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return sources;
  } catch (error) {
    console.error("Error fetching sources for question:", error);
    throw new Error("Failed to fetch sources from database");
  }
}

// Update an existing source
export async function updateSource(
  questionId: number,
  answerId: number,
  data: Partial<CreateSourceData>
): Promise<SourceRecord> {
  const client = getPrismaClient();

  try {
    await client.source.updateMany({
      where: {
        questionId,
        answerId,
      },
      data: {
        ...(data.answer && { answer: data.answer }),
        ...(data.sources && { sources: data.sources }),
        ...(data.hunterAddress && { hunterAddress: data.hunterAddress }),
        ...(data.timestamp && { timestamp: BigInt(data.timestamp) }),
      },
    });

    // Fetch the updated record
    const updatedSource = await getSource(questionId, answerId);
    if (!updatedSource) {
      throw new Error("Source not found after update");
    }

    return updatedSource;
  } catch (error) {
    console.error("Error updating source:", error);
    throw new Error("Failed to update source in database");
  }
}

// Update answer ID for an existing source
export async function updateSourceAnswerId(
  questionId: number,
  oldAnswerId: number,
  newAnswerId: number
): Promise<SourceRecord> {
  const client = getPrismaClient();

  try {
    await client.source.updateMany({
      where: {
        questionId,
        answerId: oldAnswerId,
      },
      data: {
        answerId: newAnswerId,
      },
    });

    // Return the updated source
    return (await getSource(questionId, newAnswerId)) as SourceRecord;
  } catch (error) {
    console.error("Error updating source answer ID:", error);
    throw new Error("Failed to update source answer ID in database");
  }
}

// Delete a source
export async function deleteSource(
  questionId: number,
  answerId: number
): Promise<void> {
  const client = getPrismaClient();

  try {
    await client.source.deleteMany({
      where: {
        questionId,
        answerId,
      },
    });
  } catch (error) {
    console.error("Error deleting source:", error);
    throw new Error("Failed to delete source from database");
  }
}

// Check if a source exists
export async function sourceExists(
  questionId: number,
  answerId: number
): Promise<boolean> {
  const client = getPrismaClient();

  try {
    const count = await client.source.count({
      where: {
        questionId,
        answerId,
      },
    });

    return count > 0;
  } catch (error) {
    console.error("Error checking source existence:", error);
    throw new Error("Failed to check source existence");
  }
}

// Database operations for questions
export interface CreateQuestionData {
  questionId: number;
  rules?: string;
}

export interface QuestionRecord {
  id: number;
  questionId: number;
  rules: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Create a new question record
export async function createQuestion(
  data: CreateQuestionData
): Promise<QuestionRecord> {
  const client = getPrismaClient();

  try {
    const question = await client.question.create({
      data: {
        questionId: data.questionId,
        rules: data.rules || null,
      },
    });

    return question;
  } catch (error) {
    console.error("Error creating question:", error);
    throw new Error("Failed to save question to database");
  }
}

// Create or update a question record (upsert)
export async function upsertQuestion(
  data: CreateQuestionData
): Promise<QuestionRecord> {
  const client = getPrismaClient();

  try {
    const question = await client.question.upsert({
      where: {
        questionId: data.questionId,
      },
      update: {
        rules: data.rules || null,
      },
      create: {
        questionId: data.questionId,
        rules: data.rules || null,
      },
    });

    return question;
  } catch (error) {
    console.error("Error upserting question:", error);
    throw new Error("Failed to save question to database");
  }
}

// Get question by question ID
export async function getQuestion(
  questionId: number
): Promise<QuestionRecord | null> {
  const client = getPrismaClient();

  try {
    const question = await client.question.findUnique({
      where: {
        questionId,
      },
    });

    return question;
  } catch (error) {
    console.error("Error fetching question:", error);
    return null;
  }
}

// Update an existing question
export async function updateQuestion(
  questionId: number,
  data: Partial<CreateQuestionData>
): Promise<QuestionRecord> {
  const client = getPrismaClient();

  try {
    const question = await client.question.update({
      where: {
        questionId,
      },
      data: {
        ...(data.rules !== undefined && { rules: data.rules }),
      },
    });

    return question;
  } catch (error) {
    console.error("Error updating question:", error);
    throw new Error("Failed to update question in database");
  }
}

// Delete a question
export async function deleteQuestion(questionId: number): Promise<void> {
  const client = getPrismaClient();

  try {
    await client.question.delete({
      where: {
        questionId,
      },
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    throw new Error("Failed to delete question from database");
  }
}

// Check if a question exists
export async function questionExists(questionId: number): Promise<boolean> {
  const client = getPrismaClient();

  try {
    const count = await client.question.count({
      where: {
        questionId,
      },
    });

    return count > 0;
  } catch (error) {
    console.error("Error checking question existence:", error);
    throw new Error("Failed to check question existence");
  }
}
