"use client";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "viem/actions";
import { encodeAbiParameters, formatEther } from "viem";
import { factsContractAddress, factsAbi, publicClient } from "@/lib/contract";

interface Answer {
  hunter: string;
  encodedAnswer: string;
  totalVouched: bigint;
}

interface ChallengeFormProps {
  questionId: number;
  questionType: number;
  answers: Answer[];
  onChallenge: (challengeAnswer: string, challengeSources: string) => void;
  loading: boolean;
}

export default function ChallengeForm({ 
  questionId, 
  questionType, 
  answers, 
  onChallenge, 
  loading 
}: ChallengeFormProps) {
  const [mostVouchedAnswerId, setMostVouchedAnswerId] = useState<number | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [challengeSources, setChallengeSources] = useState("");
  const [error, setError] = useState("");
  const [isLoadingMostVouched, setIsLoadingMostVouched] = useState(true);
  const [challengeDeposit, setChallengeDeposit] = useState<bigint>(BigInt(0));
  
  const { address, isConnected } = useAccount();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Get the most vouched answer ID from contract
  useEffect(() => {
    const getMostVouchedAnswer = async () => {
      try {
        setIsLoadingMostVouched(true);
        
        const mostVouchedAnsId = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'getMostVouchedAnsId',
          args: [BigInt(questionId)],
        });
        
        setMostVouchedAnswerId(Number(mostVouchedAnsId));
      } catch (error) {
        console.error("Error getting most vouched answer:", error);
        // Fallback to first answer if contract call fails
        setMostVouchedAnswerId(0);
      } finally {
        setIsLoadingMostVouched(false);
      }
    };

    if (questionId !== undefined && answers.length > 0) {
      getMostVouchedAnswer();
    } else {
      setIsLoadingMostVouched(false);
      setMostVouchedAnswerId(null);
    }
  }, [questionId, answers]);

  // Fetch challenge deposit
  useEffect(() => {
    const fetchChallengeData = async () => {
      if (!address || !isConnected) return;

      try {
        // Get challenge deposit from contract config
        const config = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'config',
        });
        
        const challengeDepositAmount = (config as [{ requiredStakeForDAO: bigint; challengeDeposit: bigint; requiredStakeToHunt: bigint; minVouched: bigint; huntPeriod: bigint; challengePeriod: bigint; settlePeriod: bigint; reviewPeriod: bigint; }, unknown, unknown])[0].challengeDeposit;
        setChallengeDeposit(challengeDepositAmount);
      } catch (error) {
        console.error("Error fetching challenge data:", error);
      }
    };

    fetchChallengeData();
  }, [address, isConnected]);

  const handleChallenge = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (mostVouchedAnswerId === null) {
      setError('No answer available to challenge');
      return;
    }

    if (!challengeAnswer.trim()) {
      setError('Please provide your challenge answer');
      return;
    }

    if (!challengeSources.trim()) {
      setError('Please provide sources for your challenge');
      return;
    }

    setError("");
    
    try {
      // Encode the challenge answer based on question type
      let encodedChallengeAnswer: string;
      
      if (questionType === 0) { // Binary
        const isYes = challengeAnswer.toLowerCase() === 'yes';
        encodedChallengeAnswer = encodeAbiParameters(
          [{ type: 'uint256' }],
          [BigInt(isYes ? 1 : 0)]
        );
      } else if (questionType === 1) { // Number
        const numberValue = parseFloat(challengeAnswer);
        if (isNaN(numberValue)) {
          throw new Error('Please enter a valid number');
        }
        encodedChallengeAnswer = encodeAbiParameters(
          [{ type: 'uint256' }],
          [BigInt(numberValue)]
        );
      } else { // OpenEnded
        encodedChallengeAnswer = encodeAbiParameters(
          [{ type: 'string' }],
          [challengeAnswer]
        );
      }

      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'challenge',
        args: [
          BigInt(questionId),
          encodedChallengeAnswer as `0x${string}`
        ],
        value: challengeDeposit,
      });

    } catch (e) {
      console.error("Error submitting challenge:", e);
      const errorMessage = e instanceof Error ? e.message : "Failed to submit challenge";
      
      // Handle specific contract errors
      if (errorMessage.includes("NotInChallengePeriod")) {
        setError("Challenge period has ended or not started yet.");
      } else if (errorMessage.includes("CannotChallengeSelf")) {
        setError("You cannot challenge your own answer.");
      } else if (errorMessage.includes("CannotChallengeSameAnswer")) {
        setError("You cannot challenge the same answer twice.");
      } else if (errorMessage.includes("NotHunter")) {
        setError("You must be a registered hunter to challenge answers.");
      } else {
        setError(errorMessage);
      }
    }
  };

  // Handle success
  if (isSuccess) {
    onChallenge(challengeAnswer, challengeSources);
  }



  return (
    <div className="card p-6 mb-8">
      <h3 className="text-xl font-bold mb-4 theme-text-primary">Challenge an Answer</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Most Vouched Answer Display */}
        <div>
          <label className="block text-sm font-medium mb-2 theme-text-primary">
            Current Most Vouched Answer
          </label>
          {isLoadingMostVouched ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600 dark:text-gray-400">Loading most vouched answer...</span>
              </div>
            </div>
          ) : mostVouchedAnswerId !== null && answers[mostVouchedAnswerId] ? (
            <div className="p-4 challenge-most-vouched-card bg-gradient-to-br from-blue-200 to-indigo-200 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border-2 border-blue-400 dark:border-blue-800 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Answer #{mostVouchedAnswerId + 1} by {answers[mostVouchedAnswerId].hunter.slice(0, 6)}...{answers[mostVouchedAnswerId].hunter.slice(-4)}
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                    Most vouched answer ({Number(answers[mostVouchedAnswerId].totalVouched) / Math.pow(10, 18)} HYPE)
                  </p>
                </div>
                <div className="text-blue-700 dark:text-blue-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400">No answer available to challenge</p>
            </div>
          )}
        </div>

        {/* Challenge Answer */}
        <div>
          <label className="block text-sm font-medium mb-2 theme-text-primary">
            Your Challenge Answer
          </label>
          {questionType === 0 ? (
            // Binary question - Yes/No buttons
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setChallengeAnswer("Yes")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  challengeAnswer === "Yes"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                    : "border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setChallengeAnswer("No")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  challengeAnswer === "No"
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                    : "border-gray-300 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-400"
                }`}
              >
                No
              </button>
            </div>
          ) : questionType === 1 ? (
            // Number question
            <input
              type="number"
              value={challengeAnswer}
              onChange={(e) => setChallengeAnswer(e.target.value)}
              placeholder="Enter your answer..."
              className="input-modern w-full"
            />
          ) : (
            // Open-ended question
            <textarea
              value={challengeAnswer}
              onChange={(e) => setChallengeAnswer(e.target.value)}
              placeholder="Enter your challenge answer..."
              className="input-modern w-full h-24 resize-none"
            />
          )}
        </div>

        {/* Challenge Sources */}
        <div>
          <label className="block text-sm font-medium mb-2 theme-text-primary">
            Sources for Your Challenge
          </label>
          <textarea
            value={challengeSources}
            onChange={(e) => setChallengeSources(e.target.value)}
            placeholder="Provide sources and evidence to support your challenge..."
            className="input-modern w-full h-24 resize-none"
          />
          <p className="text-sm theme-text-secondary mt-1">
            Explain why you believe the selected answer is incorrect and provide supporting evidence.
          </p>
        </div>

        {/* Challenge Deposit Info */}
        {challengeDeposit > BigInt(0) && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium text-blue-800">Challenge Deposit Required</span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Challenge deposit: {formatEther(challengeDeposit)} HYPE</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleChallenge}
          disabled={loading || isPending || isConfirming || isLoadingMostVouched || mostVouchedAnswerId === null || !challengeAnswer.trim() || !challengeSources.trim()}
          className="button-primary w-full"
        >
          {loading || isPending || isConfirming ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Submitting Challenge...
            </div>
          ) : isLoadingMostVouched ? (
            "Loading..."
          ) : (
            `Pay ${formatEther(challengeDeposit)} HYPE to Challenge`
          )}
        </button>
      </div>
    </div>
  );
}






