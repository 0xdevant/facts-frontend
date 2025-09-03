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
  const [userData, setUserData] = useState<Map<number, readonly [bigint, bigint, bigint, boolean]>>(new Map());

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
      
      // Fetch user data for finalized questions
      if (address) {
        const userDataMap = new Map<number, readonly [bigint, bigint, bigint, boolean]>();
        for (const question of validQuestions) {
          if (question.slotData.finalized) {
            try {
              const userDataResult = await readContract(publicClient, {
                address: factsContractAddress,
                abi: factsAbi,
                functionName: 'getUserData',
                args: [address, BigInt(question.id), question.slotData.answerId],
              });
              userDataMap.set(question.id, userDataResult);
            } catch (error) {
              console.error(`Error fetching user data for question ${question.id}:`, error);
            }
          }
        }
        setUserData(userDataMap);
      }
      
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

  const formatBountyAmount = (amount: bigint): string => {
    if (amount === BigInt(0)) return 'No bounty';
    const inEther = Number(amount) / Math.pow(10, 18);
    return `${inEther.toFixed(2)} HYPE`;
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
          <div className="flex items-center justify-center mb-8">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`relative px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ease-in-out ${
                  activeTab === 'withdraw'
                    ? 'text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-700 shadow-md transform scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Withdraw</span>
                </div>
                {activeTab === 'withdraw' && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </button>
              
              <div className="w-2"></div>
              
              <button
                onClick={() => setActiveTab('claim')}
                className={`relative px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ease-in-out ${
                  activeTab === 'claim'
                    ? 'text-green-700 dark:text-green-300 bg-white dark:bg-gray-700 shadow-md transform scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Claim</span>
                </div>
                {activeTab === 'claim' && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            </div>
          </div>

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <div className="max-w-2xl mx-auto">
              {!showWithdrawForm ? (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-full mb-6">
                    <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 theme-text-primary">Withdraw Your Funds</h3>
                  <p className="theme-text-secondary mb-8 max-w-md mx-auto">
                    Withdraw your staked amounts and vouched amounts from questions you&apos;ve participated in.
                  </p>
                  <button
                    onClick={() => setShowWithdrawForm(true)}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Start Withdrawal
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold theme-text-primary">Withdrawal Form</h3>
                    <button
                      onClick={() => setShowWithdrawForm(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleWithdraw} className="space-y-5">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                      <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Important Note</p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            You can only withdraw either staked OR vouched amounts - not both. Ensure answer IDs correspond to selected question IDs.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 theme-text-primary">
                        Questions
                      </label>
                      <select
                        multiple
                        value={selectedQuestions}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          setSelectedQuestions(selected);
                          setSelectedAnswers([]);
                        }}
                        className="input-modern w-full"
                        size={4}
                      >
                        {questions.map((question) => (
                          <option key={question.id} value={question.id.toString()}>
                            Q{question.id}: {question.description.substring(0, 40)}...
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd for multiple</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 theme-text-primary">
                        Answers
                      </label>
                      <select
                        multiple
                        value={selectedAnswers}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          setSelectedAnswers(selected);
                        }}
                        className="input-modern w-full"
                        size={4}
                      >
                        {questions.map((question) => {
                          const answers = questionAnswers.get(question.id) || [];
                          return answers.map((_, index) => (
                            <option key={`${question.id}-${index}`} value={index.toString()}>
                              Q{question.id} A{index}
                            </option>
                          ));
                        })}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd for multiple</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 theme-text-primary">
                        Recipient Address
                      </label>
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="Your wallet address (optional)"
                        className="input-modern w-full"
                      />
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 to-blue-700 transition-all duration-200 disabled:opacity-50"
                        disabled={isPending || isConfirming}
                      >
                        {isPending || isConfirming ? "Processing..." : "Withdraw Funds"}
                      </button>
                    </div>
                  </form>

                  {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                      <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Claim Tab */}
          {activeTab === 'claim' && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-full mb-6">
                  <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 theme-text-primary">Claim Your Rewards</h3>
                <p className="theme-text-secondary text-lg max-w-2xl mx-auto">
                  Claim bounty rewards and platform fees from finalized questions.
                </p>
              </div>

              {/* Bounty Claims */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xl font-semibold theme-text-primary">Bounty Rewards</h4>
                  <div className="text-sm text-gray-500">
                    {questions.filter(q => q.slotData.finalized).length} finalized questions
                  </div>
                </div>
                
                {questions.length > 0 ? (
                  <div className="grid gap-4">
                    {questions
                      .filter(question => {
                        if (!question.slotData.finalized) return false;
                        const finalAnswerId = question.slotData.answerId;
                        if (finalAnswerId === 0) return false;
                        
                        const userDataForQuestion = userData.get(question.id);
                        if (!userDataForQuestion) return false;
                        
                        const [, hunterClaimable, vouched, claimed] = userDataForQuestion;
                        return hunterClaimable > BigInt(0) || 
                               (!question.slotData.challengeSucceeded && vouched > BigInt(0) && !claimed);
                      })
                      .map((question) => {
                        const userDataForQuestion = userData.get(question.id);
                        const [, hunterClaimable, vouched, claimed] = userDataForQuestion || [BigInt(0), BigInt(0), BigInt(0), false];
                        
                        return (
                          <div key={question.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-3">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                    Finalized
                                  </span>
                                  <span className="text-sm text-gray-500">Q{question.id}</span>
                                </div>
                                <h5 className="font-medium theme-text-primary mb-2 line-clamp-2">
                                  {question.description}
                                </h5>
                                <div className="flex items-center space-x-4 text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Bounty: <span className="font-medium">{formatBountyAmount(question.bountyAmount)}</span>
                                  </span>
                                  {hunterClaimable > BigInt(0) && (
                                    <span className="text-blue-600 dark:text-blue-400">
                                      Hunter: <span className="font-medium">{formatBountyAmount(hunterClaimable)}</span>
                                    </span>
                                  )}
                                  {vouched > BigInt(0) && !question.slotData.challengeSucceeded && !claimed && (
                                    <span className="text-green-600 dark:text-green-400">
                                      Vouched: <span className="font-medium">{formatBountyAmount(vouched)}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col space-y-2 ml-4">
                                {hunterClaimable > BigInt(0) && (
                                  <button
                                    onClick={() => handleClaimBounty(question.id, true)}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
                                    disabled={isPending || isConfirming}
                                  >
                                    Claim as Hunter
                                  </button>
                                )}
                                {vouched > BigInt(0) && !question.slotData.challengeSucceeded && !claimed && (
                                  <button
                                    onClick={() => handleClaimBounty(question.id, false)}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50"
                                    disabled={isPending || isConfirming}
                                  >
                                    Claim as Voucher
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">No questions available for claiming</p>
                  </div>
                )}
              </div>

              {/* Platform Fee Claims */}
              {isOwner && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold theme-text-primary">Platform Fees</h4>
                      <p className="text-sm theme-text-secondary">As the contract owner, claim accumulated platform fees</p>
                    </div>
                  </div>
                  
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
                      className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:opacity-50"
                      disabled={isPending || isConfirming || !recipient}
                    >
                      {isPending || isConfirming ? "Processing..." : "Claim Platform Fees"}
                    </button>
                  </div>
                </div>
              )}
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
