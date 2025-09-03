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

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'withdraw' | 'claim'>('withdraw');
  const [isOwner, setIsOwner] = useState(false);
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
      checkOwner();
    }
  }, [address]);

  const checkOwner = async () => {
    try {
      const contractOwner = await readContract(publicClient, {
        address: factsContractAddress,
        abi: factsAbi,
        functionName: 'owner',
      });
      setIsOwner(contractOwner.toLowerCase() === address?.toLowerCase());
    } catch (error) {
      console.error("Error checking owner:", error);
    }
  };

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

  const handleClaimBounty = async (questionId: number, asHunter: boolean) => {
    try {
      writeContract({
        address: factsContractAddress,
        abi: factsAbi,
        functionName: 'claim',
        args: [BigInt(questionId), asHunter],
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to claim bounty");
    }
  };

  const handleClaimPlatformFee = async () => {
    if (!recipient) {
      setError("Please enter a recipient address for platform fees");
      return;
    }

    try {
      // Get all question IDs for platform fee claim
      const questionIds = questions.map(q => BigInt(q.id));
      
      writeContract({
        address: factsContractAddress,
        abi: factsAbi,
        functionName: 'claimPlatformFee',
        args: [questionIds, recipient as `0x${string}`],
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to claim platform fees");
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen theme-bg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card p-8 text-center">
            <h1 className="text-2xl font-bold mb-4 theme-text-primary">Dashboard</h1>
            <p className="theme-text-secondary mb-6">
              Please connect your wallet to access the dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4 theme-text-primary">Dashboard</h1>
          <p className="theme-text-secondary text-lg">
            Manage your funds and claim your rewards.
          </p>
        </div>

        {/* Tabs */}
        <div className="card p-6 mb-6">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'withdraw'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Withdraw
            </button>
            <button
              onClick={() => setActiveTab('claim')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'claim'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Claim
            </button>
          </div>

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <div className="space-y-6">
              <div>
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
                        <strong>Important:</strong> You can only withdraw either staked OR vouched amounts - not both. 
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
          )}

          {/* Claim Tab */}
          {activeTab === 'claim' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4 theme-text-primary">Claim Rewards</h3>
                <p className="theme-text-secondary mb-4">
                  Claim your bounty rewards and platform fees.
                </p>
                
                {/* Bounty Claims */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium mb-3 theme-text-primary">Claim Bounty Rewards</h4>
                  <p className="text-sm theme-text-secondary mb-4">
                    Claim rewards for questions where you provided answers or vouched for answers.
                  </p>
                  
                  {questions.length > 0 ? (
                    <div className="space-y-3">
                      {questions.map((question) => (
                        <div key={question.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium theme-text-primary">
                                Q{question.id}: {question.description.substring(0, 60)}...
                              </h5>
                              <p className="text-sm theme-text-secondary">
                                Bounty: {question.bountyAmount.toString()} tokens
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleClaimBounty(question.id, true)}
                                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                disabled={isPending || isConfirming}
                              >
                                Claim as Hunter
                              </button>
                              <button
                                onClick={() => handleClaimBounty(question.id, false)}
                                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                disabled={isPending || isConfirming}
                              >
                                Claim as Voucher
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm theme-text-secondary">No questions available for claiming.</p>
                  )}
                </div>

                {/* Platform Fee Claims */}
                {isOwner && (
                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-3 theme-text-primary">Claim Platform Fees</h4>
                    <p className="text-sm theme-text-secondary mb-4">
                      As the contract owner, you can claim accumulated platform fees.
                    </p>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="Recipient address for platform fees"
                        className="input-modern flex-1"
                      />
                      <button
                        onClick={handleClaimPlatformFee}
                        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                        disabled={isPending || isConfirming || !recipient}
                      >
                        {isPending || isConfirming ? "Processing..." : "Claim Platform Fees"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2 theme-text-primary">Submit Answers</h3>
              <p className="text-sm theme-text-secondary">
                Answer questions and earn rewards from bounties.
              </p>
            </div>
          </div>

          <div className="card p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2 theme-text-primary">Vouch for Answers</h3>
              <p className="text-sm theme-text-secondary">
                Stake HYPE on answers you believe are correct.
              </p>
            </div>
          </div>

          <div className="card p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2 theme-text-primary">Challenge Answers</h3>
              <p className="text-sm theme-text-secondary">
                Challenge incorrect answers and earn rewards.
              </p>
            </div>
          </div>

          <div className="card p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2 theme-text-primary">Claim Rewards</h3>
              <p className="text-sm theme-text-secondary">
                Claim bounty rewards or platform fees if you are the owner.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
