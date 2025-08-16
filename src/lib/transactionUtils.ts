import { TransactionReceipt, decodeEventLog } from "viem";
import { factsAbi } from "./abis/Facts";

// Extract question ID from Ask transaction receipt
export function extractQuestionIdFromReceipt(
  receipt: TransactionReceipt
): number | null {
  try {
    // Look for the Asked event
    const askedEvent = receipt.logs.find((log) => {
      try {
        // Try to decode the log as an Asked event
        const decoded = decodeEventLog({
          abi: factsAbi,
          data: log.data,
          topics: log.topics,
        });
        return decoded.eventName === "Asked";
      } catch {
        return false;
      }
    });

    if (askedEvent) {
      const decoded = decodeEventLog({
        abi: factsAbi,
        data: askedEvent.data,
        topics: askedEvent.topics,
      });

      if (decoded.eventName === "Asked") {
        return Number(decoded.args.questionId);
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting question ID from receipt:", error);
    return null;
  }
}

// Extract answer ID from Submit transaction receipt
export function extractAnswerIdFromReceipt(
  receipt: TransactionReceipt
): number | null {
  try {
    // Look for the Submitted event
    const submittedEvent = receipt.logs.find((log) => {
      try {
        // Try to decode the log as a Submitted event
        const decoded = decodeEventLog({
          abi: factsAbi,
          data: log.data,
          topics: log.topics,
        });
        return decoded.eventName === "Submitted";
      } catch {
        return false;
      }
    });

    if (submittedEvent) {
      const decoded = decodeEventLog({
        abi: factsAbi,
        data: submittedEvent.data,
        topics: submittedEvent.topics,
      });

      if (decoded.eventName === "Submitted") {
        return Number(decoded.args.answerId);
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting answer ID from receipt:", error);
    return null;
  }
}

// Extract answer ID from Challenge transaction receipt
export function extractChallengeAnswerIdFromReceipt(
  receipt: TransactionReceipt
): number | null {
  try {
    // Look for the Challenged event
    const challengedEvent = receipt.logs.find((log) => {
      try {
        // Try to decode the log as a Challenged event
        const decoded = decodeEventLog({
          abi: factsAbi,
          data: log.data,
          topics: log.topics,
        });
        return decoded.eventName === "Challenged";
      } catch {
        return false;
      }
    });

    if (challengedEvent) {
      const decoded = decodeEventLog({
        abi: factsAbi,
        data: challengedEvent.data,
        topics: challengedEvent.topics,
      });

      if (decoded.eventName === "Challenged") {
        return Number(decoded.args.answerId);
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting challenge answer ID from receipt:", error);
    return null;
  }
}
