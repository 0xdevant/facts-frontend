"use client";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "viem/actions";
import { factsContractAddress, factsAbi, publicClient } from "@/lib/contract";

// Types
interface Question {
  id: number;
  questionType: number;
  description: string;
  seeker: `0x${string}`;
  bountyToken: `0x${string}`;
  bountyAmount: bigint;
  slotData: {
    startHuntAt: number;
    endHuntAt: number;
    answerId: number;
    overthrownAnswerId: number;
    challenged: boolean;
    challengeSucceeded: boolean;
    overridden: boolean;
    finalized: boolean;
  };
}

interface Answer {
  hunter: `0x${string}`;
  encodedAnswer: `0x${string}`;
  byChallenger: boolean;
  totalVouched: bigint;
}

export default function HunterDashboard() {
  const { address } = useAccount();
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [recipient, setRecipient] = useState("");
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Map<number, Answer[]>>(new Map());
  const { writeContract, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  // Fetch questions and their answers
  useEffect(() => {
    if (address) {
      fetchQuestions();
    }
  }, [address]);

  const fetchQuestions = async () => {
    try {
      // Find the actual number of questions by checking incrementally
      let maxQuestionId = -1;
      const maxAttempts = 50; // Try up to 50 questions
      
      for (let i = 0; i < maxAttempts; i++) {
        try {
          await readContract(publicClient, {
            address: factsContractAddress,
            abi: factsAbi,
            functionName: 'questions',
            args: [BigInt(i)],
          });
          maxQuestionId = i;
        } catch (error) {
          break;
        }
      }
      
      if (maxQuestionId === -1) {
        setQuestions([]);
        return;
      }
      
      // Fetch all valid questions
      const questionPromises = Array.from({ length: maxQuestionId + 1 }, (_, i) => 
        readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'questions',
          args: [BigInt(i)],
        }).then((result) => {
          return { result, index: i };
        }).catch(() => null)
      );

      const results = await Promise.all(questionPromises);
      const validQuestions = results
        .filter((item): item is { result: readonly [number, `0x${string}`, string, `0x${string}`, bigint, { startHuntAt: bigint; endHuntAt: bigint; answerId: number; overthrownAnswerId: number; challenged: boolean; challengeSucceeded: boolean; overridden: boolean; finalized: boolean }]; index: number } => item !== null)
        .map(({ result, index }) => ({
          id: index,
          questionType: result[0],
          seeker: result[1],
          description: result[2],
          bountyToken: result[3],
          bountyAmount: result[4],
          slotData: {
            startHuntAt: Number(result[5].startHuntAt),
            endHuntAt: Number(result[5].endHuntAt),
            answerId: result[5].answerId,
            overthrownAnswerId: result[5].overthrownAnswerId,
            challenged: result[5].challenged,
            challengeSucceeded: result[5].challengeSucceeded,
            overridden: result[5].overridden,
            finalized: result[5].finalized,
          }
        }));

      setQuestions(validQuestions);

      // Fetch answers for each question
      const answersMap = new Map<number, Answer[]>();
      for (const question of validQuestions) {
        try {
          const answers = await readContract(publicClient, {
            address: factsContractAddress,
            abi: factsAbi,
            functionName: 'getAnswers',
            args: [BigInt(question.id)],
          });
          answersMap.set(question.id, answers as Answer[]);
        } catch (error) {
          answersMap.set(question.id, []);
        }
      }
      setQuestionAnswers(answersMap);
      
          } catch (error) {
        console.error("Error fetching questions:", error);
      }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!address) {
      setError("Please connect your wallet");
      return;
    }

    try {
      // Validate that answer IDs correspond to selected question IDs
      if (selectedAnswers.length > 0 && selectedQuestions.length > 0) {
        const invalidAnswers = selectedAnswers.filter(answerId => {
          const answerIdNum = parseInt(answerId);
          return !selectedQuestions.some(qId => {
            const questionId = parseInt(qId);
            const answers = questionAnswers.get(questionId) || [];
            return answers.some((_, index) => index === answerIdNum);
          });
        });
        
        if (invalidAnswers.length > 0) {
          setError(`Answer ID(s) ${invalidAnswers.join(', ')} do not correspond to any selected question ID(s). Please ensure answer IDs match the selected questions.`);
          return;
        }
      }

      const questionIds = selectedQuestions.length > 0 
        ? selectedQuestions.map(q => BigInt(q))
        : [];
      const answerIds = selectedAnswers.length > 0 
        ? selectedAnswers.map(a => parseInt(a))
        : [];

      writeContract({
        address: factsContractAddress,
        abi: factsAbi,
        functionName: 'withdraw',
        args: [questionIds, answerIds, (recipient || address) as `0x${string}`],
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to withdraw");
    }
  };

  const getQuestionDisplayText = (question: Question) => {
    const typeLabels = ["Binary", "Number", "Open Ended"];
    const typeLabel = typeLabels[question.questionType] || "Unknown";
    return `Q${question.id}: ${typeLabel} - ${question.description.substring(0, 50)}${question.description.length > 50 ? '...' : ''}`;
  };

  const getAnswerDisplayText = (questionId: number, answerIndex: number) => {
    const answers = questionAnswers.get(questionId) || [];
    const answer = answers[answerIndex];
    if (!answer) return `Answer ${answerIndex}`;
    
    const isChallenger = answer.byChallenger;
    const vouched = answer.totalVouched;
    return `Answer ${answerIndex}: ${isChallenger ? 'Challenger' : 'Hunter'} (${vouched > 0 ? `${vouched} vouched` : 'No vouches'})`;
  };

  if (!address) {
    return (
      <div className="min-h-screen theme-bg">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="card p-6 text-center">
            <h2 className="text-2xl font-bold mb-4 theme-text-primary">Hunter Dashboard</h2>
            <p className="theme-text-secondary">
              Please connect your wallet to view your hunter dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-4 theme-text-primary">Hunter Dashboard</h2>
        <p className="theme-text-secondary mb-4">
          Welcome to your hunter dashboard! In the new contract, you stake HYPE directly when submitting answers to questions.
        </p>
        
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm theme-text-secondary">Hunter Dashboard</p>
          <p className="text-lg font-semibold theme-text-primary">Manage your staked and vouched funds</p>
        </div>
      </div>

      {/* Withdraw Section */}
      <div className="card p-6">
        <h3 className="text-xl font-semibold mb-4 theme-text-primary">Withdraw Funds</h3>
        <p className="theme-text-secondary mb-4">
          Withdraw your staked amounts and vouched amounts from all questions.
        </p>

        {!showWithdrawForm ? (
          <button
            onClick={() => setShowWithdrawForm(true)}
            className="button-primary"
          >
            Withdraw Funds
          </button>
        ) : (
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Important:</strong> You can only withdraw either staked OR vouched amounts, not both from the same question-answer combination. 
                When selecting answer IDs, ensure they correspond to the selected question IDs.
              </p>
            </div>
            
            {/* Question Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 theme-text-primary">
                Select Questions (optional)
              </label>
              <select
                multiple
                value={selectedQuestions}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectedQuestions(selected);
                  // Clear answers when questions change to avoid mismatches
                  setSelectedAnswers([]);
                }}
                className="input-modern w-full min-h-[120px]"
              >
                <option value="">-- Select Questions --</option>
                {questions.map((question) => (
                  <option key={question.id} value={question.id.toString()}>
                    {getQuestionDisplayText(question)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple questions. Leave empty to withdraw from all questions.
              </p>
            </div>
            
            {/* Answer Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 theme-text-primary">
                Select Answers (optional)
              </label>
              <select
                multiple
                value={selectedAnswers}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectedAnswers(selected);
                }}
                className="input-modern w-full min-h-[120px]"
                disabled={selectedQuestions.length === 0}
              >
                <option value="">-- Select Answers --</option>
                {selectedQuestions.length > 0 ? (
                  selectedQuestions.map(qId => {
                    const questionId = parseInt(qId);
                    const answers = questionAnswers.get(questionId) || [];
                    return answers.map((_, index) => (
                      <option key={`${qId}-${index}`} value={index.toString()}>
                        {getAnswerDisplayText(questionId, index)}
                      </option>
                    ));
                  }).flat()
                ) : (
                  <option value="" disabled>Please select questions first</option>
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {selectedQuestions.length === 0 
                  ? "Select questions first to see available answers."
                  : "Hold Ctrl/Cmd to select multiple answers. Leave empty to withdraw from all answers in selected questions."
                }
              </p>
            </div>
            
            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium mb-2 theme-text-primary">
                Recipient Address (optional)
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x... (leave empty to use your address)"
                className="input-modern w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to withdraw to your own address</p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                className="button-primary"
                disabled={isPending || isConfirming}
              >
                {isPending || isConfirming ? "Processing..." : "Confirm Withdrawal"}
              </button>
              <button
                type="button"
                onClick={() => setShowWithdrawForm(false)}
                className="button-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

