"use client";
import { useState, useEffect, useRef } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, type TransactionReceipt } from "viem";
import { readContract } from "viem/actions";
import { factsContractAddress, factsAbi, iERC20Abi, publicClient } from "@/lib/contract";


import { extractQuestionIdFromReceipt } from "@/lib/transactionUtils";


export default function AskQuestionPage() {
  const [type, setType] = useState<number>(0);
  const [question, setQuestion] = useState("");
  const [bountyAmount, setBountyAmount] = useState("");
  const [tokenOption, setTokenOption] = useState<"native" | "custom">("native");
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [extraHuntTime, setExtraHuntTime] = useState("0"); // Optional field
  const [huntStartOption, setHuntStartOption] = useState<"now" | "custom">("now");
  const [customStartTime, setCustomStartTime] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [rules, setRules] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const hasProcessedSuccessRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  
  // Token approval states
  const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0));
  const [needsApproval, setNeedsApproval] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  
  const { address, isConnected } = useAccount();
  
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });
  const { data: approvalTxHash, writeContract: writeApprovalContract, isPending: isApprovalPending } = useWriteContract();
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approvalTxHash });



  // Function to set error and scroll to it
  const setErrorAndScroll = (message: string) => {
    setError(message);
    // Scroll to error message after a short delay to ensure it's rendered
    setTimeout(() => {
      errorRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  };

  // Helper function to validate Ethereum address
  const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const getBountyToken = () => {
    switch (tokenOption) {
      case "native":
        return "0x0000000000000000000000000000000000000000";
      case "custom":
        return customTokenAddress;
      default:
        return "0x0000000000000000000000000000000000000000";
    }
  };

  const getStartHuntAt = () => {
    const now = Math.floor(Date.now() / 1000);
    
    if (huntStartOption === "now") {
      return now + 60; // Start hunting in 1 minute from current time
    } else {
      // Parse custom start date and time
      if (!customStartDate || !customStartTime) {
        return now + 60; // Fallback to 1 minute from now
      }
      
      const dateTimeString = `${customStartDate}T${customStartTime}`;
      const customStartTimestamp = Math.floor(new Date(dateTimeString).getTime() / 1000);
      
      // Ensure the timestamp is in the future
      return Math.max(customStartTimestamp, now + 60);
    }
  };

  // Check token allowance and balance for non-native tokens
  const checkTokenApproval = async () => {
    if (!address || !isConnected || tokenOption === "native") return;
    
    // Only check if user has entered a token address
    if (tokenOption === "custom" && !customTokenAddress) return;

    try {
      const bountyToken = getBountyToken();
      
      // Validate token address format
      if (!bountyToken || !isValidEthereumAddress(bountyToken)) {
        console.error("Invalid token address format:", bountyToken);
        return;
      }

      const bountyAmountWei = parseEther(bountyAmount || "0");

      // Get token allowance
      const allowance = await readContract(publicClient, {
        address: bountyToken as `0x${string}`,
        abi: iERC20Abi,
        functionName: 'allowance',
        args: [address as `0x${string}`, factsContractAddress as `0x${string}`],
      });

      // Get token balance
      const balance = await readContract(publicClient, {
        address: bountyToken as `0x${string}`,
        abi: iERC20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });

      setTokenBalance(balance as bigint);
      setNeedsApproval((allowance as bigint) < bountyAmountWei);
    } catch (error) {
      console.error("Error checking token approval:", error);
      // Reset states on error
      setTokenBalance(BigInt(0));
      setNeedsApproval(false);
      setApprovalSuccess(false);
      
      // Show user-friendly error for invalid token contract
      if (tokenOption === "custom") {
        setErrorAndScroll("Invalid token contract. Please check the token address and ensure it's a valid ERC20 token.");
      }
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setType(0);
    setQuestion("");
    setBountyAmount("");
    setTokenOption("native");
    setCustomTokenAddress("");
    setExtraHuntTime("");
    setHuntStartOption("now");
    setCustomStartTime("");
    setCustomStartDate("");
    setRules("");
    setError("");
    hasProcessedSuccessRef.current = false;
    
    // Reset approval states
    setTokenBalance(BigInt(0));
    setNeedsApproval(false);
    setApprovalSuccess(false);
  };

  const handleRefresh = () => {
    resetForm();
  };

  // Check token approval when token option, bounty amount, or address changes
  useEffect(() => {
    if (tokenOption !== "native" && bountyAmount && parseFloat(bountyAmount) > 0) {
      // Only check if user has entered a custom token address
      if (tokenOption === "custom" && !customTokenAddress) {
        setNeedsApproval(false);
        setApprovalSuccess(false);
        return;
      }
      checkTokenApproval();
    } else {
      setNeedsApproval(false);
      setApprovalSuccess(false);
    }
  }, [tokenOption, bountyAmount, address, isConnected, customTokenAddress]);

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setSuccessMessage("");
    resetForm();
  };

  const handleApproval = async () => {
    if (!isConnected || !address) {
      setErrorAndScroll('Please connect your wallet first');
      return;
    }

    if (tokenOption === "native") {
      setErrorAndScroll('No approval needed for native token');
      return;
    }

    if (!bountyAmount || parseFloat(bountyAmount) < 0) {
      setErrorAndScroll('Please enter a valid bounty amount first (must be 0 or greater)');
      return;
    }

    if (tokenBalance < parseEther(bountyAmount)) {
      setErrorAndScroll(`Insufficient token balance. You need ${bountyAmount} tokens.`);
      return;
    }

    if (tokenOption === "custom" && customTokenAddress && !isValidEthereumAddress(customTokenAddress)) {
      setErrorAndScroll('Invalid token address format. Must be a valid 0x address.');
      return;
    }

    setError("");
    
    try {
      const bountyToken = getBountyToken();
      const bountyAmountWei = parseEther(bountyAmount);
      
      writeApprovalContract({
        address: bountyToken as `0x${string}`,
        abi: iERC20Abi,
        functionName: 'approve',
        args: [factsContractAddress as `0x${string}`, bountyAmountWei],
      });
    } catch (e) {
      console.error("Error approving tokens:", e);
      setError(e instanceof Error ? e.message : "Failed to approve tokens");
    }
  };

    const handleSubmit = async () => {
    setLoading(true);
    setError("");
    hasProcessedSuccessRef.current = false;
    
    // Validate inputs first
    if (!isConnected) {
      setErrorAndScroll('Please connect your wallet first');
      setLoading(false);
      return;
    }
    
    if (!address) {
      setErrorAndScroll('No wallet address found');
      setLoading(false);
      return;
    }
    
    if (!question.trim()) {
      setErrorAndScroll('Please enter a question');
      setLoading(false);
      return;
    }
    
    if (!bountyAmount || parseFloat(bountyAmount) < 0) {
      setErrorAndScroll('Enter a valid bounty amount (must be 0 or greater)');
      setLoading(false);
      return;
    }
    
    if (tokenOption === "custom" && !customTokenAddress) {
      setErrorAndScroll('Enter custom token address');
      setLoading(false);
      return;
    }
    
    if (tokenOption === "custom" && customTokenAddress && !isValidEthereumAddress(customTokenAddress)) {
      setErrorAndScroll('Invalid token address format. Must be a valid 0x address.');
      setLoading(false);
      return;
    }
    
    if (extraHuntTime && parseFloat(extraHuntTime) < 0) {
      setErrorAndScroll('Extra hunt time must be positive');
      setLoading(false);
      return;
    }
    
    if (huntStartOption === "custom" && (!customStartDate || !customStartTime)) {
      setErrorAndScroll('Please select both date and time for custom start');
      setLoading(false);
      return;
    }
    
    // Validate rules if provided
    if (rules.trim() && rules.length > 1000) {
      setErrorAndScroll('Rules are too long. Please keep them under 1000 characters.');
      setLoading(false);
      return;
    }
    
    // Check if approval is needed for non-native tokens
    if (tokenOption !== "native" && needsApproval) {
      setErrorAndScroll('Please approve tokens first');
      setLoading(false);
      return;
    }
    
    // If all validations pass, proceed with submission
    try {
      const startHuntAt = getStartHuntAt();
      const extraHuntTimeSeconds = parseFloat(extraHuntTime) > 0 ? parseFloat(extraHuntTime) * 3600 : 0;
      const bountyToken = getBountyToken();

      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'ask',
        args: [
          type,
          question,
          bountyToken as `0x${string}`,
          parseEther(bountyAmount),
          BigInt(startHuntAt),
          BigInt(extraHuntTimeSeconds)
        ],
        value: tokenOption === "native" ? parseEther(bountyAmount) : BigInt(0),
      });
    } catch (e) {
      console.error("Error submitting question:", e);
      setError(e instanceof Error ? e.message : "Failed to submit question");
    } finally {
      setLoading(false);
    }
  };

  // Handle approval success
  useEffect(() => {
    if (isApprovalSuccess) {
      setApprovalSuccess(true);
      setNeedsApproval(false);
      // Refresh allowance
      if (address && tokenOption !== "native") {
        checkTokenApproval();
      }
    }
  }, [isApprovalSuccess, address, tokenOption]);

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && receipt && !hasProcessedSuccessRef.current) {
      hasProcessedSuccessRef.current = true;
      
      if (rules.trim()) {
        handleQuestionWithRules(receipt);
      } else {
        handleQuestionWithoutRules();
      }
    } else if (isSuccess && !hasProcessedSuccessRef.current) {
      hasProcessedSuccessRef.current = true;
      handleQuestionWithoutRules();
    }
  }, [isSuccess, receipt]);

  // Handle question submission with rules
  const handleQuestionWithRules = async (receipt: TransactionReceipt) => {
    const questionId = extractQuestionIdFromReceipt(receipt);
    
    if (questionId !== null) {
      await saveQuestionToDatabase(questionId);
    } else {
      handleQuestionWithoutRules();
    }
  };

  // Handle question submission without rules
  const handleQuestionWithoutRules = () => {
    setSuccessMessage("Question submitted successfully!");
    setShowSuccessModal(true);
  };

  // Save question to database via API
  const saveQuestionToDatabase = async (questionId: number) => {
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: questionId,
          rules: rules.trim(),
        }),
      });

      if (response.ok) {
        setSuccessMessage("Question submitted successfully! Your rules have been saved.");
      } else {
        const errorData = await response.json();
        console.error("API error:", errorData);
        setSuccessMessage("Question submitted successfully! However, there was an issue saving your question to the database.");
      }
    } catch (error) {
      console.error("Failed to save question to database:", error);
      setSuccessMessage("Question submitted successfully! However, there was an issue saving your question to the database.");
    }
    setShowSuccessModal(true);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen theme-bg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card p-8 text-center">
            <h1 className="text-2xl font-bold mb-4 theme-text-primary">Connect Your Wallet</h1>
            <p className="theme-text-secondary mb-6">
              Please connect your wallet to ask a question.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-8">
          <h1 className="text-3xl font-bold mb-8 theme-text-primary">Ask a Question</h1>
          
          {error && (
            <div 
              ref={errorRef}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}



          <div className="space-y-6">
            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium mb-2 theme-text-primary">
                Question Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(Number(e.target.value))}
                className="select-modern w-full"
              >
                <option value={0}>Binary (Yes/No)</option>
                <option value={1}>Number</option>
                <option value={2}>Open Ended</option>
              </select>
            </div>

            {/* Question */}
            <div>
              <label className="block text-sm font-medium mb-2 theme-text-primary">
                Question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter your question here..."
                className="input-modern w-full h-32 resize-none"
                required
              />
            </div>

            {/* Rules */}
            <div>
              <label className="block text-sm font-medium mb-2 theme-text-primary">
                Rules (Optional)
              </label>
              <textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="As long as ... the answer should be resolved as ..."
                className="input-modern w-full h-24 resize-none"
              />
              <p className="text-sm theme-text-secondary mt-1">
                Specify any criteria, constraints, or requirements that answers must meet to be considered valid.
              </p>
            </div>

            {/* Bounty Amount */}
            <div>
              <label className="block text-sm font-medium mb-2 theme-text-primary">
                Bounty Amount
              </label>
              <input
                type="number"
                value={bountyAmount}
                onChange={(e) => setBountyAmount(e.target.value)}
                placeholder="0 (no bounty) or amount"
                step="0.01"
                min="0"
                className="input-modern w-full"
                required
              />
            </div>

            {/* Token Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 theme-text-primary">
                Bounty Token
              </label>
              <select
                value={tokenOption}
                onChange={(e) => setTokenOption(e.target.value as "native" | "custom")}
                className="select-modern w-full"
              >
                <option value="native">HYPE (Native)</option>
                <option value="custom">Custom Token</option>
              </select>
            </div>

            {/* Custom Token Address */}
            {tokenOption === "custom" && (
              <div>
                <label className="block text-sm font-medium mb-2 theme-text-primary">
                  Custom Token Address
                </label>
                <input
                  type="text"
                  value={customTokenAddress}
                  onChange={(e) => setCustomTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="input-modern w-full"
                  required
                />
              </div>
            )}

            {/* Hunt Start Time */}
            <div>
              <label className="block text-sm font-medium mb-2 theme-text-primary">
                When should hunting start?
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="start-now"
                    name="huntStart"
                    value="now"
                    checked={huntStartOption === "now"}
                    onChange={(e) => setHuntStartOption(e.target.value as "now" | "custom")}
                    className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="start-now" className="text-sm theme-text-primary cursor-pointer">
                    Start immediately (in 1 minute)
                  </label>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="start-custom"
                    name="huntStart"
                    value="custom"
                    checked={huntStartOption === "custom"}
                    onChange={(e) => setHuntStartOption(e.target.value as "now" | "custom")}
                    className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="start-custom" className="text-sm theme-text-primary cursor-pointer">
                    Start at specific date & time
                  </label>
                </div>
                
                {huntStartOption === "custom" && (
                  <div className="ml-7 space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 theme-text-secondary">
                        Date
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="input-modern w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 theme-text-secondary">
                        Time
                      </label>
                      <input
                        type="time"
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        className="input-modern w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm theme-text-secondary mt-2">
                Choose when hunters can start answering your question.
              </p>
            </div>

            {/* Extra Hunt Time */}
            <div>
              <label className="block text-sm font-medium mb-2 theme-text-primary">
                Extra Hunt Time (hours) - Optional
              </label>
              <input
                type="number"
                value={extraHuntTime}
                onChange={(e) => setExtraHuntTime(e.target.value)}
                placeholder="0 (default)"
                step="1"
                min="0"
                className="input-modern w-full"
              />
              <p className="text-sm theme-text-secondary mt-1">
                Default hunt period is 24 hours. Add extra time if needed.
              </p>
            </div>

            {/* Approval Success Message */}
            {approvalSuccess && tokenOption !== "native" && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">
                    Tokens approved! You can now submit your question.
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              {needsApproval && tokenOption !== "native" ? (
                <button
                  onClick={handleApproval}
                  disabled={isApprovalPending || isApprovalConfirming || tokenBalance < parseEther(bountyAmount || "0")}
                  className="button-secondary flex-1"
                >
                  {isApprovalPending || isApprovalConfirming ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Approving tokens...
                    </div>
                  ) : tokenBalance < parseEther(bountyAmount || "0") ? (
                    "Insufficient Token Balance"
                  ) : (
                    `Approve ${bountyAmount || '0'} Tokens`
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || isPending || isConfirming}
                  className="button-primary flex-1"
                >
                  {loading || isPending || isConfirming ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {isPending ? "Waiting for wallet..." : isConfirming ? "Confirming..." : "Submitting..."}
                    </div>
                  ) : (
                    "Submit Question"
                  )}
                </button>
              )}
              <button
                onClick={handleRefresh}
                type="button"
                className="button-secondary"
                disabled={loading || isPending || isConfirming || isApprovalPending || isApprovalConfirming}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        message={successMessage}
      />
    </div>
  );
}

// Success Modal Component
const SuccessModal = ({ isOpen, onClose, message }: { isOpen: boolean; onClose: () => void; message: string }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all">
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Question Submitted!
          </h3>
          
          {/* Message */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {message}
          </p>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium py-3 px-6 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 transform hover:scale-105"
            >
              Continue
            </button>
            <button
              onClick={() => {
                onClose();
                // Navigate to questions page
                window.location.href = '/questions';
              }}
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-3 px-6 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
            >
              View All Questions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 

