import {
  createSource,
  getSource,
  getSourcesByQuestion,
  updateSource,
  deleteSource,
  sourceExists,
} from "./database";

export interface BackendResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface SourceData {
  questionId: number;
  answerId: number;
  answer: string;
  sources: string;
  hunterAddress: string;
  timestamp: number;
}

export interface SavedSourceData {
  questionId: number;
  answerId: number;
  savedAt: string;
  updatedAt: string;
}

// Save sources to database
export const saveSources = async (
  sourceData: SourceData
): Promise<BackendResponse<SavedSourceData>> => {
  try {
    // Validate the data first
    const validationError = validateSourceData(sourceData);
    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    // Check if source already exists
    const exists = await sourceExists(
      sourceData.questionId,
      sourceData.answerId
    );

    let source;
    if (exists) {
      // Update existing source
      source = await updateSource(sourceData.questionId, sourceData.answerId, {
        answer: sourceData.answer,
        sources: sourceData.sources,
        hunterAddress: sourceData.hunterAddress,
        timestamp: sourceData.timestamp,
      });
    } else {
      // Create new source
      source = await createSource(sourceData);
    }

    return {
      success: true,
      message: "Sources saved successfully",
      data: {
        questionId: source.questionId,
        answerId: source.answerId,
        savedAt: source.createdAt.toISOString(),
        updatedAt: source.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error saving sources:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save sources",
    };
  }
};

// Fetch sources from database
export const fetchSources = async (
  questionId: number,
  answerId: number
): Promise<BackendResponse<SourceData>> => {
  try {
    const source = await getSource(questionId, answerId);

    if (!source) {
      return {
        success: false,
        error: "Source not found",
      };
    }

    return {
      success: true,
      data: {
        questionId: source.questionId,
        answerId: source.answerId,
        answer: source.answer,
        sources: source.sources,
        hunterAddress: source.hunterAddress,
        timestamp: Number(source.timestamp),
      },
    };
  } catch (error) {
    console.error("Error fetching sources:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch sources",
    };
  }
};

// Fetch all sources for a question
export const fetchSourcesByQuestion = async (
  questionId: number
): Promise<BackendResponse<SourceData[]>> => {
  try {
    const sources = await getSourcesByQuestion(questionId);

    return {
      success: true,
      data: sources.map((source) => ({
        questionId: source.questionId,
        answerId: source.answerId,
        answer: source.answer,
        sources: source.sources,
        hunterAddress: source.hunterAddress,
        timestamp: Number(source.timestamp),
      })),
    };
  } catch (error) {
    console.error("Error fetching sources by question:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch sources",
    };
  }
};

// Delete sources from database
export const deleteSources = async (
  questionId: number,
  answerId: number
): Promise<BackendResponse> => {
  try {
    await deleteSource(questionId, answerId);

    return {
      success: true,
      message: "Sources deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting sources:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete sources",
    };
  }
};

// Validate source data before sending
export const validateSourceData = (
  data: Partial<SourceData>
): string | null => {
  if (!data.questionId || typeof data.questionId !== "number") {
    return "Invalid question ID";
  }

  if (!data.answerId || typeof data.answerId !== "number") {
    return "Invalid answer ID";
  }

  if (
    !data.answer ||
    typeof data.answer !== "string" ||
    data.answer.trim().length === 0
  ) {
    return "Answer cannot be empty";
  }

  if (
    !data.sources ||
    typeof data.sources !== "string" ||
    data.sources.trim().length === 0
  ) {
    return "Sources cannot be empty";
  }

  if (
    !data.hunterAddress ||
    typeof data.hunterAddress !== "string" ||
    !data.hunterAddress.startsWith("0x")
  ) {
    return "Invalid hunter address";
  }

  return null;
};

// Queue for offline source saving (now uses database directly)
export class SourceQueue {
  private queue: SourceData[] = [];
  private isProcessing = false;

  addToQueue(sourceData: SourceData): void {
    this.queue.push(sourceData);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const sourceData = this.queue.shift();
      if (sourceData) {
        try {
          const result = await saveSources(sourceData);
          if (result.success) {
          } else {
            console.error("Failed to save queued source:", result.error);
            // Re-add to queue for retry (with limit to prevent infinite loops)
            if (this.queue.length < 10) {
              this.queue.push(sourceData);
            }
          }
        } catch (error) {
          console.error("Failed to save queued source:", error);
          // Re-add to queue for retry (with limit to prevent infinite loops)
          if (this.queue.length < 10) {
            this.queue.push(sourceData);
          }
        }
      }
    }

    this.isProcessing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
  }
}

// Global source queue instance
export const sourceQueue = new SourceQueue();
