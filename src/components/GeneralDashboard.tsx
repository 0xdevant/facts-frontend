"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "viem/actions";
import { formatEther, parseEther } from "viem";
import { factsContractAddress, factsAbi, publicClient } from "@/lib/contract";

interface ClaimableQuestion {
  questionId: number;
  hunterClaimable: bigint;
  vouched: bigint;
  claimed: boolean;
  voucherClaimable: bigint;
  voucherDetails: Array<{
    answerId: number;
    vouched: bigint;
    claimed: boolean;
    claimable: bigint;
    slashed: bigint;
    isSlashed: boolean;
  }>;
}

export default function GeneralDashboard() {
  // Cache for reducing duplicate calls
  const cache = useRef<Map<string, { data: unknown; timestamp: number }>>(new Map());
  const CACHE_DURATION = 30000; // 30 seconds cache
  
  // Hunter state
  const [depositedAmount, setDepositedAmount] = useState<bigint>(BigInt(0));
  const [requiredStake, setRequiredStake] = useState<bigint>(BigInt(0));
  
  // Owner/DAO state
  const [isOwner, setIsOwner] = useState(false);
  const [isDAO, setIsDAO] = useState(false);
  const [requiredDAOStake, setRequiredDAOStake] = useState<bigint>(BigInt(0));
  const [protocolFees, setProtocolFees] = useState<bigint>(BigInt(0));
  const [daoFees, setDaoFees] = useState<bigint>(BigInt(0));
  
  // Claimable questions state
  const [claimableQuestions, setClaimableQuestions] = useState<ClaimableQuestion[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositType, setDepositType] = useState<'hunter' | 'dao'>('hunter');
  const [activeTab, setActiveTab] = useState<'hunter' | 'claims' | 'platform'>('hunter');
  const prevIsHunterRef = useRef<boolean | null>(null);
  const [hasBeenSlashed, setHasBeenSlashed] = useState(false);
  
  // Engaging question IDs state
  const [engagingQIds, setEngagingQIds] = useState<bigint[]>([]);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetNumIds, setResetNumIds] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Handle reset success
  useEffect(() => {
    if (isSuccess && resetLoading) {
      setResetLoading(false);
      setShowResetForm(false);
      setResetNumIds("");
    }
  }, [isSuccess, resetLoading]);

  // Cached contract call function
  const cachedContractCall = async (key: string, callFn: () => Promise<unknown>) => {
    const now = Date.now();
    const cached = cache.current.get(key);
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }
    
    try {
      const data = await callFn();
      cache.current.set(key, { data, timestamp: now });
      return data;
    } catch (error) {
      console.error(`Contract call failed for key ${key}:`, error);
      throw error;
    }
  };

  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Get system config
        const systemConfig = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'config',
        });

        // Get user info
        const userInfo = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'usersInfo',
          args: [address as `0x${string}`],
        });

        // Get contract owner and protocol fee receiver
        const [contractOwner, protocolFeeReceiver] = await Promise.all([
          readContract(publicClient, {
            address: factsContractAddress,
            abi: factsAbi,
            functionName: 'owner',
            args: [],
          }),
          readContract(publicClient, {
            address: factsContractAddress,
            abi: factsAbi,
            functionName: 'PROTOCOL_FEE_RECEIVER',
            args: [],
          })
        ]);

        // Get number of questions
        let numQuestions = 0;
        try {
          const numQuestionsResult = await readContract(publicClient, {
            address: factsContractAddress,
            abi: factsAbi,
            functionName: 'getNumOfQuestions',
            args: [],
          });
          numQuestions = Number(numQuestionsResult);
        } catch (error) {
          console.warn("Failed to get number of questions, using fallback:", error);
          // Fallback: try to find questions incrementally
          let maxQuestionId = -1;
          const maxAttempts = 20;
          for (let i = 0; i < maxAttempts; i++) {
            try {
              await readContract(publicClient, {
                address: factsContractAddress,
                abi: factsAbi,
                functionName: 'questions',
                args: [BigInt(i)],
              });
              maxQuestionId = i;
            } catch {
              break;
            }
          }
          numQuestions = maxQuestionId + 1;
        }

        // Calculate total protocol and DAO fees by looping through all questions
        let totalProtocolFees = BigInt(0);
        let totalDaoFees = BigInt(0);
        
        for (let i = 0; i < numQuestions; i++) {
          try {
            const fees = await readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'platformFees',
              args: [BigInt(i)],
            });
            
            const [protocolFees, daoFees] = fees as [bigint, bigint];
            totalProtocolFees += protocolFees;
            totalDaoFees += daoFees;
          } catch {
            // Question might not exist or have fees, continue
            continue;
          }
        }

        // Extract data
        const configData = (systemConfig as [{ requiredStakeForDAO: bigint; challengeDeposit: bigint; requiredStakeToHunt: bigint; minVouched: bigint; huntPeriod: bigint; challengePeriod: bigint; settlePeriod: bigint; reviewPeriod: bigint; }, unknown, unknown])[0];
        const requiredStakeAmount = configData.requiredStakeToHunt;
        const requiredDAOStakeAmount = configData.requiredStakeForDAO;
        const userDepositedAmount = userInfo as bigint;
        const isContractOwner = address?.toLowerCase() === (contractOwner as string).toLowerCase();
        const isProtocolFeeReceiver = address?.toLowerCase() === (protocolFeeReceiver as string).toLowerCase();

        // Check if user is DAO member (owner needs to stake to become DAO)
        const daoStatus = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'isDAO',
          args: [address as `0x${string}`],
        });

        // Get user's engaging question IDs
        const userEngagingQIds = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'getUserEngagingQIds',
          args: [address as `0x${string}`],
        });

        setRequiredStake(requiredStakeAmount);
        setRequiredDAOStake(requiredDAOStakeAmount);
        setDepositedAmount(userDepositedAmount);
        setIsOwner(isContractOwner);
        setIsDAO(daoStatus as boolean);
        setProtocolFees(isProtocolFeeReceiver ? totalProtocolFees : BigInt(0));
        setDaoFees(isContractOwner ? totalDaoFees : BigInt(0));
        setEngagingQIds(userEngagingQIds as bigint[]);

        // Check if user has been slashed (deposit amount < required stake)
        const requiredStakeForUser = isContractOwner ? requiredDAOStakeAmount : requiredStakeAmount;
        const isSlashed = userDepositedAmount < requiredStakeForUser && userDepositedAmount > BigInt(0);
        setHasBeenSlashed(isSlashed);

        // Don't fetch claimable questions here - only fetch when user switches to Claims tab
        
      } catch (e) {
        console.error("Error fetching dashboard data:", e);
        setError("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [address, isConnected, isSuccess]);

  // Update active tab when hunter status changes
  useEffect(() => {
    const isHunter = depositedAmount >= requiredStake;
    const prevIsHunter = prevIsHunterRef.current;
    
    if (prevIsHunter !== null) {
      if (isHunter && !prevIsHunter && activeTab === 'claims') {
        // If user becomes a hunter and is on claims tab, switch to hunter tab
        setActiveTab('hunter');
      } else if (!isHunter && prevIsHunter && activeTab === 'hunter') {
        // If user is no longer a hunter and is on hunter tab, stay on hunter tab (don't switch to claims)
        // This keeps users on the hunter status tab where they can see their deposit form
      }
    }
    
    prevIsHunterRef.current = isHunter;
  }, [depositedAmount, requiredStake, activeTab]);

  // Fetch claimable questions only when user switches to Claims tab
  useEffect(() => {
    if (activeTab === 'claims' && !loading && address) {
      fetchClaimableQuestions();
    }
  }, [activeTab, loading, address]);

  // Debounced fetch function to prevent rapid successive calls
  const debouncedFetchClaimableQuestions = useRef<NodeJS.Timeout | null>(null);
  
  const fetchClaimableQuestions = useCallback(async () => {
    if (!address) return;
    
    // Clear any existing timeout
    if (debouncedFetchClaimableQuestions.current) {
      clearTimeout(debouncedFetchClaimableQuestions.current);
    }
    
    // Set a new timeout to debounce the call
    debouncedFetchClaimableQuestions.current = setTimeout(async () => {
      await fetchClaimableQuestionsInternal();
    }, 500); // 500ms debounce
  }, [address]);
  
  const fetchClaimableQuestionsInternal = async () => {
    if (!address) return;

    try {
      setClaimsLoading(true);
      const questions: ClaimableQuestion[] = [];
      
      // Get number of questions
      let numQuestions = 0;
      try {
        const numQuestionsResult = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'getNumOfQuestions',
          args: [],
        });
        numQuestions = Number(numQuestionsResult);
      } catch (error) {
        console.warn("Failed to get number of questions, using fallback:", error);
        // Fallback: try to find questions incrementally
        let maxQuestionId = -1;
        const maxAttempts = 20;
        for (let i = 0; i < maxAttempts; i++) {
          try {
            await readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'questions',
              args: [BigInt(i)],
            });
            maxQuestionId = i;
          } catch {
            break;
          }
        }
        numQuestions = maxQuestionId + 1;
      }
      
      if (numQuestions === 0) {
        console.warn("No questions found in contract");
        setClaimableQuestions([]);
        return;
      }
      
      // Batch fetch all questions
      const questionPromises = [];
      for (let i = 0; i < numQuestions; i++) {
        questionPromises.push(
          cachedContractCall(`question_${i}`, () => 
            readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'questions',
              args: [BigInt(i)],
            })
          ).catch(() => null) // Return null if question doesn't exist
        );
      }
      
      const questionResults = await Promise.all(questionPromises);
      
      // Process each question that exists
      for (let i = 0; i < questionResults.length; i++) {
        const questionResult = questionResults[i];
        if (!questionResult) continue; // Skip non-existent questions
        
        try {
          // Get all answers for this question in one call
          const answers = await readContract(publicClient, {
            address: factsContractAddress,
            abi: factsAbi,
            functionName: 'getAnswers',
            args: [BigInt(i)],
          });
          
          const answersArray = answers as Array<{ hunter: `0x${string}`; encodedAnswer: `0x${string}`; byChallenger: boolean; totalVouched: bigint }>;
          if (answersArray.length === 0) continue;
          
          // Batch fetch all user results for this question
          const userResultPromises = [];
          for (let answerId = 0; answerId < answersArray.length; answerId++) {
            userResultPromises.push(
              readContract(publicClient, {
                address: factsContractAddress,
                abi: factsAbi,
                functionName: 'getUserQuestionResult',
                args: [address as `0x${string}`, BigInt(i), answerId],
              }).catch(() => [BigInt(0), BigInt(0), false] as [bigint, bigint, boolean])
            );
          }
          
          const userResults = await Promise.all(userResultPromises);
          
          // Get question data and slot data
          const questionData = questionResult as [number, string, `0x${string}`, `0x${string}`, bigint, { startHuntAt: bigint; endHuntAt: bigint; answerId: number; overthrownAnswerId: number; challenged: boolean; challengeSucceeded: boolean; overridden: boolean; finalized: boolean }];
          const slotData = questionData[5];
          const isQuestionFinalized = slotData.finalized;
          
          let totalHunterClaimable = BigInt(0);
          let totalVouched = BigInt(0);
          let totalVoucherClaimable = BigInt(0);
          let anyClaimed = false;
          const voucherDetails: Array<{
            answerId: number;
            vouched: bigint;
            claimed: boolean;
            claimable: bigint;
            slashed: bigint;
            isSlashed: boolean;
          }> = [];
          
          // Get config for slash calculations
          const config = await readContract(publicClient, {
            address: factsContractAddress,
            abi: factsAbi,
            functionName: 'config',
            args: [],
          });
          const challengeConfig = config[2];
          const basisPoints = BigInt(10000); // 100% = 10000 basis points
          
          // Process results
          for (let answerId = 0; answerId < answersArray.length; answerId++) {
            const [hunterClaimable, vouched, claimed] = userResults[answerId];
            const answerHunter = answersArray[answerId].hunter;
            
            // Only add hunter claimable if user is the actual hunter for this answer
            if (answerHunter.toLowerCase() === address.toLowerCase()) {
              totalHunterClaimable += hunterClaimable;
            }
            
            // Add voucher amounts
            totalVouched += vouched;
            if (claimed) anyClaimed = true;
            
            // Process voucher details
            if (vouched > BigInt(0)) {
              
              let claimable = BigInt(0);
              let slashed = BigInt(0);
              let isSlashed = false;
              
              // Only process voucher details if question is finalized
              if (slotData.finalized) {
                // Check if this answer was slashed (challenge succeeded and this answer was overthrown)
                if (slotData.challengeSucceeded && slotData.overthrownAnswerId === answerId) {
                  isSlashed = true;
                  try {
                    slashed = await readContract(publicClient, {
                      address: factsContractAddress,
                      abi: factsAbi,
                      functionName: 'calcSlashAmount',
                      args: [vouched, challengeConfig.slashVoucherBP],
                    }) as bigint;
                  } catch {
                    console.error(`Error calculating slash amount for question ${i}, answer ${answerId}`);
                    slashed = BigInt(0);
                  }
                } else if (!slotData.challengeSucceeded && !claimed) {
                  // Only calculate claimable if challenge failed and not claimed
                  try {
                    const bountyAmount = questionData[4];
                    
                    const voucherClaimable = await readContract(publicClient, {
                      address: factsContractAddress,
                      abi: factsAbi,
                      functionName: 'calcVouchedClaimable',
                      args: [BigInt(i), address as `0x${string}`, answerId, bountyAmount],
                    });
                    claimable = voucherClaimable as bigint;
                    totalVoucherClaimable += claimable;
                  } catch {
                    console.error(`Error calculating voucher claimable for question ${i}, answer ${answerId}`);
                  }
                }
              }
              
              voucherDetails.push({
                answerId,
                vouched,
                claimed,
                claimable,
                slashed,
                isSlashed,
              });
            }
          }
          
          // Only include questions where user has some claimable amount or slashed amount (and question is finalized for vouchers)
          if (totalHunterClaimable > BigInt(0) || (isQuestionFinalized && (totalVoucherClaimable > BigInt(0) || voucherDetails.some(detail => detail.isSlashed)))) {
            questions.push({
              questionId: i,
              hunterClaimable: totalHunterClaimable,
              vouched: totalVouched,
              claimed: anyClaimed,
              voucherClaimable: totalVoucherClaimable,
              voucherDetails,
            });
          }
        } catch {
          // Question might not exist, continue to next
          continue;
        }
      }
      
      setClaimableQuestions(questions);
    } catch {
      console.error("Error fetching claimable questions");
    } finally {
      setClaimsLoading(false);
    }
  };

  // Hunter operations
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (depositedAmount <= BigInt(0)) {
      setError("No amount to withdraw");
      return;
    }

    setError("");
    
    try {
      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'withdraw',
        args: [address as `0x${string}`],
      });
    } catch (e) {
      console.error("Error withdrawing:", e);
      setError(e instanceof Error ? e.message : "Failed to withdraw");
    }
  };

  const handleReset = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (engagingQIds.length === 0) {
      setError("No engaging question IDs to reset");
      return;
    }

    setError("");
    setResetLoading(true);
    
    try {
      const maxResetAmount = engagingQIds.length <= 10 ? engagingQIds.length : Math.floor(engagingQIds.length / 2);
      const numIdsToReset = engagingQIds.length <= 10 ? engagingQIds.length : parseInt(resetNumIds);
      
      if (engagingQIds.length > 10 && (!resetNumIds || parseInt(resetNumIds) <= 0 || parseInt(resetNumIds) > maxResetAmount)) {
        setError(`Please enter a valid number between 1 and ${maxResetAmount}`);
        setResetLoading(false);
        return;
      }

      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'reset',
        args: [BigInt(numIdsToReset)],
      });
    } catch (e) {
      console.error("Error resetting engaging question IDs:", e);
      setError(e instanceof Error ? e.message : "Failed to reset engaging question IDs");
      setResetLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }

    // Check minimum deposit based on deposit type
    if (depositType === 'dao') {
      // DAO deposit needs to meet DAO stake requirement
      if (parseFloat(depositAmount) < parseFloat(formatEther(requiredDAOStake))) {
        setError(`You need to deposit at least ${formatAmountWithDecimals(requiredDAOStake)} HYPE to become a DAO member`);
        return;
      }
    } else {
      // Hunter deposit needs to meet hunter stake requirement
      if (parseFloat(depositAmount) < parseFloat(formatEther(requiredStake))) {
        setError(`You need to deposit at least ${formatAmountWithDecimals(requiredStake)} HYPE to become a hunter`);
        return;
      }
    }

    setError("");
    
    try {
      const depositAmountWei = parseEther(depositAmount || "0");
      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'deposit',
        value: depositAmountWei,
      });
    } catch (e) {
      console.error("Error depositing:", e);
      setError(e instanceof Error ? e.message : "Failed to deposit");
    }
  };

  // Claim operations
  const handleClaimBounty = async (questionId: number, asHunter: boolean) => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    setError("");
    
    try {
      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'claim',
        args: [BigInt(questionId), asHunter],
      });
    } catch (e) {
      console.error("Error claiming bounty:", e);
      setError(e instanceof Error ? e.message : "Failed to claim bounty");
    }
  };

  const handleRedeem = async (questionId: number, answerId: number) => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    setError("");
    
    try {
      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'redeem',
        args: [BigInt(questionId), answerId],
      });
    } catch (e) {
      console.error("Error redeeming vouched stake:", e);
      setError(e instanceof Error ? e.message : "Failed to redeem vouched stake");
    }
  };

  const handleRedeemAll = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    setError("");
    
    try {
      // Get number of questions
      let numQuestions = 0;
      try {
        const numQuestionsResult = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'getNumOfQuestions',
          args: [],
        });
        numQuestions = Number(numQuestionsResult);
      } catch (error) {
        console.warn("Failed to get number of questions, using fallback:", error);
        // Fallback: try to find questions incrementally
        let maxQuestionId = -1;
        const maxAttempts = 20;
        for (let i = 0; i < maxAttempts; i++) {
          try {
            await readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'questions',
              args: [BigInt(i)],
            });
            maxQuestionId = i;
          } catch {
            break;
          }
        }
        numQuestions = maxQuestionId + 1;
      }
      
      if (numQuestions === 0) {
        setError("No questions found in contract");
        return;
      }

      // Loop through all questions and answers to find redeemable vouches
      for (let questionId = 0; questionId < numQuestions; questionId++) {
        try {
          const answers = await readContract(publicClient, {
            address: factsContractAddress,
            abi: factsAbi,
            functionName: 'getAnswers',
            args: [BigInt(questionId)],
          });

          for (let answerId = 0; answerId < (answers as Array<{ hunter: `0x${string}`; encodedAnswer: `0x${string}`; byChallenger: boolean; totalVouched: bigint }>).length; answerId++) {
            try {
              // Check if user has vouched for this answer
              const result = await readContract(publicClient, {
                address: factsContractAddress,
                abi: factsAbi,
                functionName: 'getUserQuestionResult',
                args: [address as `0x${string}`, BigInt(questionId), answerId],
              });

              const [, vouched, claimed] = result as [bigint, bigint, boolean];
              
              // If user has vouched and hasn't claimed, try to redeem
              if (vouched > BigInt(0) && !claimed) {
                try {
                  writeContract({
                    address: factsContractAddress as `0x${string}`,
                    abi: factsAbi,
                    functionName: 'redeem',
                    args: [BigInt(questionId), answerId],
                  });
                  return; // Exit after first successful redeem call
                } catch {
                  // Continue to next answer if this one can't be redeemed
                  continue;
                }
              }
            } catch {
              // Continue to next answer if error
              continue;
            }
          }
        } catch {
          // Continue to next question if error
          continue;
        }
      }
      
      setError("No redeemable vouched stake found");
    } catch (e) {
      console.error("Error redeeming vouched stake:", e);
      setError(e instanceof Error ? e.message : "Failed to redeem vouched stake");
    }
  };

  const handleClaimPlatformFees = async (feeType: 'protocol' | 'dao') => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    const feesToClaim = feeType === 'protocol' ? protocolFees : daoFees;
    if (feesToClaim <= BigInt(0)) {
      setError(`No ${feeType} fees to claim`);
      return;
    }

    setError("");
    
    try {
      // Get number of questions
      let numQuestions = 0;
      try {
        const numQuestionsResult = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'getNumOfQuestions',
          args: [],
        });
        numQuestions = Number(numQuestionsResult);
      } catch (error) {
        console.warn("Failed to get number of questions, using fallback:", error);
        // Fallback: try to find questions incrementally
        let maxQuestionId = -1;
        const maxAttempts = 20;
        for (let i = 0; i < maxAttempts; i++) {
          try {
            await readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'questions',
              args: [BigInt(i)],
            });
            maxQuestionId = i;
          } catch {
            break;
          }
        }
        numQuestions = maxQuestionId + 1;
      }
      
      if (numQuestions === 0) {
        setError("No questions found in contract");
        return;
      }

      // Create array of all question IDs from 0 to numQuestions-1
      const questionIds = Array.from({ length: numQuestions }, (_, i) => BigInt(i));
      
      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'claimPlatformFee',
        args: [questionIds, address as `0x${string}`],
      });
    } catch (e) {
      console.error(`Error claiming ${feeType} fees:`, e);
      setError(e instanceof Error ? e.message : `Failed to claim ${feeType} fees`);
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 theme-text-secondary">Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="card p-6">
        <div className="text-center">
          <p className="theme-text-secondary">Please connect your wallet to view dashboard.</p>
        </div>
      </div>
    );
  }

  const formattedAmount = formatEther(depositedAmount);
  const formattedRequiredStake = formatEther(requiredStake);
  const formattedProtocolFees = formatEther(protocolFees);
  const formattedDaoFees = formatEther(daoFees);
  const isHunter = depositedAmount >= requiredStake;
  const isLoading = isPending || isConfirming;

  // Helper function to format amounts with appropriate decimal places
  const formatAmountWithDecimals = (amount: bigint) => {
    const amountInEther = Number(formatEther(amount));
    if (amountInEther < 0.01) {
      return amountInEther.toFixed(6).replace(/\.?0+$/, '');
    } else if (amountInEther < 1) {
      return amountInEther.toFixed(4).replace(/\.?0+$/, '');
    } else {
      return amountInEther.toFixed(2).replace(/\.?0+$/, '');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-2 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-2 border border-cyan-200 dark:border-gray-600">
        <button
          onClick={() => setActiveTab('hunter')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'hunter'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
              : 'text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-gray-700'
          }`}
        >
          {isOwner ? 'DAO Status' : 'Hunter Status'}
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'claims'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
              : 'text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-gray-700'
          }`}
        >
          Claim & Redeem
        </button>
        {(isOwner || protocolFees > BigInt(0)) && (
          <button
            onClick={() => setActiveTab('platform')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'platform'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                : 'text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-gray-700'
            }`}
          >
            Platform Fees
          </button>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">Transaction successful!</p>
        </div>
      )}

      {/* Hunter/DAO Status Tab */}
      {activeTab === 'hunter' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold theme-text-primary">
              {isOwner ? 'DAO Status' : 'Hunter Status'}
            </h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isOwner ? (isDAO ? 'bg-green-500' : 'bg-yellow-500') : (isHunter ? 'bg-green-500' : 'bg-yellow-500')}`}></div>
              <span className="text-sm theme-text-secondary">
                {isOwner 
                  ? (isDAO ? 'Registered DAO Member' : 'DAO Member - Insufficient Stake')
                  : (isHunter ? 'Registered Hunter' : 'Insufficient Stake')
                }
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 card-blue">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm theme-text-secondary">Deposited Amount</p>
                  <p className="text-xl font-semibold theme-text-primary">{formatAmountWithDecimals(depositedAmount)} HYPE</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200 card-orange">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm theme-text-secondary">Required Stake</p>
                  <p className="text-xl font-semibold theme-text-primary">
                    {isOwner 
                      ? `${formatAmountWithDecimals(requiredDAOStake)} HYPE`
                      : `${formatAmountWithDecimals(requiredStake)} HYPE`
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 card-green">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm theme-text-secondary">Status</p>
                  <p className="text-xl font-semibold theme-text-primary">
                    {isOwner 
                      ? (isDAO ? 'Active' : 'Inactive')
                      : (isHunter ? 'Active' : 'Inactive')
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Slashed Alert */}
          {hasBeenSlashed && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm font-medium text-red-800">
                  You have been slashed! Your deposit amount is below the required stake.
                </p>
              </div>
            </div>
          )}

          {(!isHunter && !isDAO) && !hasBeenSlashed && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm text-yellow-800">
                  {isOwner 
                    ? `You need to deposit at least ${formatAmountWithDecimals(requiredDAOStake)} HYPE to become an active DAO member.`
                    : `You need to deposit at least ${formatAmountWithDecimals(requiredStake)} HYPE to become an active hunter.`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Deposit Form for Users to become Hunters or DAO Members or to recover from slashing */}
          {(!isHunter && !isDAO) && (
            <div className="border-t pt-6">
              {!showDepositForm ? (
                <button
                  onClick={() => {
                    setDepositType(isOwner ? 'dao' : 'hunter');
                    setShowDepositForm(true);
                  }}
                  className="button-primary w-full"
                >
                  {hasBeenSlashed 
                    ? (isOwner ? 'Deposit HYPE to Recover DAO Status' : 'Deposit HYPE to Recover Hunter Status')
                    : (isOwner ? 'Deposit HYPE to Become DAO Member' : 'Deposit HYPE to Become Hunter')
                  }
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-blue-800">
                        {depositType === 'hunter' 
                          ? hasBeenSlashed
                            ? `Enter the amount of HYPE you want to deposit to recover your hunter status. You need at least ${formatAmountWithDecimals(requiredStake)} HYPE.`
                            : `Enter the amount of HYPE you want to deposit to become a hunter. You need at least ${formatAmountWithDecimals(requiredStake)} HYPE.`
                          : hasBeenSlashed
                            ? `Enter the amount of HYPE you want to deposit to recover your DAO status. You need at least ${formatAmountWithDecimals(requiredDAOStake)} HYPE.`
                            : `Enter the amount of HYPE you want to deposit to become a DAO member. You need at least ${formatAmountWithDecimals(requiredDAOStake)} HYPE.`
                        }
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 theme-text-primary">
                      Deposit Amount (HYPE)
                    </label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder={depositType === 'hunter' 
                        ? `Minimum: ${formatAmountWithDecimals(requiredStake)} HYPE`
                        : `Minimum: ${formatAmountWithDecimals(requiredDAOStake)} HYPE`
                      }
                      className="input-modern w-full"
                      min={depositType === 'hunter' ? parseFloat(formattedRequiredStake) : parseFloat(formatEther(requiredDAOStake))}
                      step="0.01"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDepositForm(false);
                        setDepositAmount("");
                      }}
                      className="button-secondary flex-1"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      onClick={handleDeposit}
                      className="button-primary flex-1"
                      disabled={isLoading || !depositAmount || 
                        (depositType === 'hunter' 
                          ? parseFloat(depositAmount) < parseFloat(formattedRequiredStake)
                          : parseFloat(depositAmount) < parseFloat(formatEther(requiredDAOStake))
                        )
                      }
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Depositing...
                        </div>
                      ) : (
                        `Deposit ${depositAmount || '0'} HYPE`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {depositedAmount > BigInt(0) && (
            <div className={`${(!isHunter && !isDAO) ? '' : 'border-t'} pt-6`}>
              {/* Engaging Question IDs Info */}
              {engagingQIds.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm font-medium text-yellow-800">
                      You have {engagingQIds.length} engaging question ID{engagingQIds.length !== 1 ? 's' : ''} that need to be reset before withdrawal.
                    </p>
                  </div>
                  <p className="text-sm text-yellow-700 mb-3">
                    Question IDs: {engagingQIds.map(id => Number(id)).join(', ')}
                  </p>
                  
                  {/* Reset Button */}
                  {!showResetForm ? (
                    <button
                      onClick={() => setShowResetForm(true)}
                      className="px-4 py-2 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition-all duration-200"
                    >
                      Reset Engaging Question IDs
                    </button>
                  ) : (
                    <div className="space-y-3">
                      {engagingQIds.length > 10 && (
                        <div>
                          <label className="block text-sm font-medium mb-1 text-yellow-800">
                            Number of IDs to reset (max {Math.floor(engagingQIds.length / 2)}):
                          </label>
                          <input
                            type="number"
                            value={resetNumIds}
                            onChange={(e) => setResetNumIds(e.target.value)}
                            placeholder={`Enter number (1-${Math.floor(engagingQIds.length / 2)})`}
                            min="1"
                            max={Math.floor(engagingQIds.length / 2)}
                            className="input-modern w-full"
                          />
                        </div>
                      )}
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setShowResetForm(false);
                            setResetNumIds("");
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-all duration-200"
                          disabled={resetLoading}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleReset}
                          className="px-4 py-2 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition-all duration-200"
                          disabled={resetLoading || (engagingQIds.length > 10 && (!resetNumIds || parseInt(resetNumIds) <= 0 || parseInt(resetNumIds) > Math.floor(engagingQIds.length / 2)))}
                        >
                          {resetLoading ? (
                            <div className="flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Resetting...
                            </div>
                          ) : (
                            `Reset ${engagingQIds.length <= 10 ? engagingQIds.length : resetNumIds} ID${engagingQIds.length <= 10 ? (engagingQIds.length !== 1 ? 's' : '') : (parseInt(resetNumIds) !== 1 ? 's' : '')}`
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Withdraw Button - Only show if no engaging question IDs */}
              {engagingQIds.length === 0 && (
                <>
                  {!showWithdrawForm ? (
                    <button
                      onClick={() => setShowWithdrawForm(true)}
                      className="button-secondary w-full"
                    >
                      Withdraw All HYPE
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-blue-800">
                            This will withdraw your entire deposited amount of {formatAmountWithDecimals(depositedAmount)} HYPE.
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowWithdrawForm(false)}
                          className="button-secondary flex-1"
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          onClick={handleWithdraw}
                          className="button-primary flex-1"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <div className="flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Withdrawing...
                            </div>
                          ) : (
                            `Withdraw All ${formatAmountWithDecimals(depositedAmount)} HYPE`
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Claim & Redeem Tab */}
      {activeTab === 'claims' && (
        <div className="space-y-6">
          {/* Claim Rewards Card */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6 theme-text-primary">Claim Rewards</h3>
          
          {claimsLoading ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="theme-text-secondary">Loading claimable rewards...</p>
            </div>
          ) : claimableQuestions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <p className="theme-text-secondary">No claimable rewards found.</p>
              <p className="text-sm text-gray-500 mt-1">Complete questions and wait for finalization to see rewards here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {claimableQuestions
                .filter(question => question.hunterClaimable > BigInt(0))
                .map((question) => (
                  <div key={question.questionId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold theme-text-primary">Question #{question.questionId}</h4>
                      {question.claimed && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Claimed
                        </span>
                      )}
                    </div>
                    
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm theme-text-secondary">Hunter Reward</p>
                          <p className="font-semibold theme-text-primary">{formatEther(question.hunterClaimable)} HYPE</p>
                        </div>
                        {!question.claimed && (
                          <button
                            onClick={() => handleClaimBounty(question.questionId, true)}
                            className="button-primary"
                            disabled={isLoading}
                          >
                            {isLoading ? 'Claiming...' : 'Claim as Hunter'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
          </div>

          {/* Redeem Vouched Stake Card */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-6 theme-text-primary">Redeem Vouched Stake</h3>
            <p className="text-sm theme-text-secondary mb-4">
              Redeem your vouched stake from answers that didn&apos;t win or were challenged.
            </p>
            
            {claimsLoading ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="theme-text-secondary">Loading redeemable stakes...</p>
              </div>
            ) : claimableQuestions.filter(q => q.voucherDetails.some(d => !d.claimed)).length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p className="theme-text-secondary">No redeemable vouched stakes found.</p>
                <p className="text-sm text-gray-500 mt-1">Vouch for answers to see redeemable stakes here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {claimableQuestions
                  .filter(q => q.voucherDetails.some(d => !d.claimed))
                  .map((question) => (
                    <div key={question.questionId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-semibold theme-text-primary mb-3">Question #{question.questionId}</h4>
                      
                      <div className="space-y-3">
                        {question.voucherDetails
                          .filter(detail => !detail.claimed)
                          .map((detail) => (
                            <div key={detail.answerId} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium theme-text-primary">Answer #{detail.answerId + 1}</span>
                                {detail.isSlashed && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                    Slashed
                                  </span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                  <p className="text-xs theme-text-secondary">Vouched Amount</p>
                                  <p className="text-sm font-medium theme-text-primary">{formatEther(detail.vouched)} HYPE</p>
                                </div>
                                {detail.isSlashed ? (
                                  <div>
                                    <p className="text-xs theme-text-secondary">Slashed Amount</p>
                                    <p className="text-sm font-medium text-red-600 dark:text-red-400">{formatEther(detail.slashed)} HYPE</p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs theme-text-secondary">Claimable</p>
                                    <p className="text-sm font-medium theme-text-primary">{formatEther(detail.claimable)} HYPE</p>
                                  </div>
                                )}
                              </div>
                              
                              <button
                                onClick={() => handleRedeem(question.questionId, detail.answerId)}
                                className="button-secondary w-full"
                                disabled={isLoading}
                              >
                                {isLoading ? 'Redeeming...' : detail.isSlashed ? 'Redeem Remaining Stake' : 'Redeem Stake'}
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Platform Fees Tab */}
      {activeTab === 'platform' && (isOwner || protocolFees > BigInt(0)) && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-6 theme-text-primary">Platform Fees</h3>
          
          <div className={`grid gap-6 mb-6 ${protocolFees > BigInt(0) && daoFees > BigInt(0) ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {protocolFees > BigInt(0) && (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 card-blue">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm theme-text-secondary">Protocol Fees</p>
                    <p className="text-xl font-semibold theme-text-primary">{parseFloat(formattedProtocolFees).toFixed(2)} HYPE</p>
                  </div>
                </div>
              </div>
            )}

            {daoFees > BigInt(0) && (
              <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200 card-orange">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm theme-text-secondary">DAO Fees</p>
                    <p className="text-xl font-semibold theme-text-primary">{parseFloat(formattedDaoFees).toFixed(2)} HYPE</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(protocolFees > BigInt(0) || daoFees > BigInt(0)) ? (
            <div className="space-y-3">
              {protocolFees > BigInt(0) && (
                <button
                  onClick={() => handleClaimPlatformFees('protocol')}
                  className="button-primary w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Claiming Protocol Fees...
                    </div>
                  ) : (
                    `Claim ${parseFloat(formattedProtocolFees).toFixed(2)} HYPE Protocol Fees`
                  )}
                </button>
              )}
              {daoFees > BigInt(0) && (
                <button
                  onClick={() => handleClaimPlatformFees('dao')}
                  className="button-secondary w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Claiming DAO Fees...
                    </div>
                  ) : (
                    `Claim ${parseFloat(formattedDaoFees).toFixed(2)} HYPE DAO Fees`
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <p className="theme-text-secondary">No platform fees available to claim.</p>
              <p className="text-sm text-gray-500 mt-1">Platform fees accumulate as questions are finalized.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
