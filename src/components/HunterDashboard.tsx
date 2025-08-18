"use client";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "viem/actions";
import { formatEther } from "viem";
import { factsContractAddress, factsAbi, publicClient } from "@/lib/contract";

export default function HunterDashboard() {
  const [depositedAmount, setDepositedAmount] = useState<bigint>(BigInt(0));
  const [requiredStake, setRequiredStake] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  
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

  // Fetch hunter data
  useEffect(() => {
    async function fetchHunterData() {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Get system config to check required stake
        const systemConfig = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'config',
        });

        // Get user info to check deposited amount
        const userInfo = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'usersInfo',
          args: [address as `0x${string}`],
        });

        // Get user's engaging question IDs
        const userEngagingQIds = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'getUserEngagingQIds',
          args: [address as `0x${string}`],
        });

        
        
        // Extract required stake and user's deposited amount
        const requiredStakeAmount = (systemConfig as [{ requiredStakeForDAO: bigint; challengeDeposit: bigint; requiredStakeToHunt: bigint; minVouched: bigint; huntPeriod: bigint; challengePeriod: bigint; settlePeriod: bigint; reviewPeriod: bigint; }, unknown, unknown])[0].requiredStakeToHunt;
        const userDepositedAmount = userInfo as bigint;



        setRequiredStake(requiredStakeAmount);
        setDepositedAmount(userDepositedAmount);
        setEngagingQIds(userEngagingQIds as bigint[]);
        
      } catch (e) {
        console.error("Error fetching hunter data:", e);
        setError("Failed to fetch hunter data");
      } finally {
        setLoading(false);
      }
    }

    fetchHunterData();
  }, [address, isConnected, isSuccess]);

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

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 theme-text-secondary">Loading hunter data...</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="card p-6">
        <div className="text-center">
          <p className="theme-text-secondary">Please connect your wallet to view hunter dashboard.</p>
        </div>
      </div>
    );
  }

  const formattedAmount = formatEther(depositedAmount);
  const formattedRequiredStake = formatEther(requiredStake);
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
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold theme-text-primary">Hunter Dashboard</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isHunter ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-sm theme-text-secondary">
            {isHunter ? 'Registered Hunter' : 'Insufficient Stake'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 card-blue">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
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
                                <p className="text-xl font-semibold theme-text-primary">{formatAmountWithDecimals(requiredStake)} HYPE</p>
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
                {isHunter ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!isHunter && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-yellow-800">
              You need to deposit at least {parseFloat(formattedRequiredStake).toFixed(2)} HYPE to become an active hunter.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
          <p className="text-sm text-green-600">Withdrawal successful!</p>
        </div>
      )}

      {depositedAmount > BigInt(0) && (
        <div className="border-t pt-6">
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
  );
}

