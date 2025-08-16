import { readContract } from "viem/actions";
import { factsContractAddress, factsAbi, publicClient } from "./contract";

// Get the next available question ID using getNumOfQuestions
export async function getNextQuestionId(): Promise<number> {
  try {
    // Get the total number of questions from the contract
    const numQuestions = await readContract(publicClient, {
      address: factsContractAddress,
      abi: factsAbi,
      functionName: "getNumOfQuestions",
    });

    // Return the next question ID (0-based indexing)
    return Number(numQuestions);
  } catch (error) {
    console.error("Error getting next question ID:", error);
    // Fallback to 1
    return 1;
  }
}

// Get the next available answer ID for a question using getNumOfAnswers
export async function getNextAnswerId(questionId: number): Promise<number> {
  try {
    // Get the number of answers for the question from the contract
    const numAnswers = await readContract(publicClient, {
      address: factsContractAddress,
      abi: factsAbi,
      functionName: "getNumOfAnswers",
      args: [BigInt(questionId)],
    });

    // Return the next answer ID (0-based indexing)
    return Number(numAnswers);
  } catch (error) {
    console.error("Error getting next answer ID:", error);
    // Fallback to 0
    return 0;
  }
}
