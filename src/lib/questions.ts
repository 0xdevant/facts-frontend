// Utility functions for question operations with rules

export interface QuestionData {
  questionId: number;
  rules?: string;
}

export interface SavedQuestionData {
  questionId: number;
  rules: string | null;
  createdAt: string;
  updatedAt: string;
}

// Save question rules to database
export async function saveQuestionRules(
  questionId: number,
  rules?: string
): Promise<SavedQuestionData> {
  try {
    const response = await fetch("/api/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionId,
        rules,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorData.error}`
      );
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error saving question rules:", error);
    throw new Error("Failed to save question rules");
  }
}

// Save rules with temporary ID (for demo purposes)
export async function saveRulesWithTempId(
  rules: string
): Promise<SavedQuestionData> {
  try {
    // Use a negative ID to indicate it's temporary
    const tempQuestionId = -Math.floor(Date.now() / 1000);
    const response = await fetch("/api/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionId: tempQuestionId,
        rules,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorData.error}`
      );
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.warn(
      "Error saving rules with temp ID (database may be unavailable):",
      error
    );
    throw new Error("Failed to save rules to database");
  }
}

// Fetch question rules from database
export async function fetchQuestionRules(
  questionId: number
): Promise<SavedQuestionData | null> {
  try {
    const response = await fetch(`/api/questions?questionId=${questionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Question not found
      }
      console.warn(
        `Rules API returned ${response.status}, treating as no rules available`
      );
      return null;
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.warn(
      "Error fetching question rules (database may be unavailable):",
      error
    );
    return null;
  }
}

// Get all rules (for debugging)
export async function getAllRules(): Promise<SavedQuestionData[]> {
  try {
    const response = await fetch("/api/questions/debug", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("Error fetching all rules:", error);
    return [];
  }
}

// Update question rules in database
export async function updateQuestionRules(
  questionId: number,
  rules?: string
): Promise<SavedQuestionData> {
  try {
    const response = await fetch("/api/questions", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionId,
        rules,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorData.error}`
      );
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error updating question rules:", error);
    throw new Error("Failed to update question rules");
  }
}

// Delete question rules from database
export async function deleteQuestionRules(questionId: number): Promise<void> {
  try {
    const response = await fetch(`/api/questions?questionId=${questionId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorData.error}`
      );
    }
  } catch (error) {
    console.error("Error deleting question rules:", error);
    throw new Error("Failed to delete question rules");
  }
}
