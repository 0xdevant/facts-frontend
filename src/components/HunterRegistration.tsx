"use client";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "viem/actions";
import { parseEther, formatEther } from "viem";
import { factsContractAddress, factsAbi, publicClient } from "@/lib/contract";

interface HunterRegistrationProps {
  onSuccess?: () => void;
}

export default function HunterRegistration({ onSuccess }: HunterRegistrationProps) {
  const [amount, setAmount] = useState("");
  const [requiredStake, setRequiredStake] = useState<bigint>(BigInt(0));
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const { address, isConnected } = useAccount();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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

  // Fetch required stake amount
  useEffect(() => {
    async function fetchRequiredStake() {
      try {
        setLoading(true);
        const systemConfig = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'config',
        });

        const requiredStakeAmount = (systemConfig as [{ requiredStakeForDAO: bigint; challengeDeposit: bigint; requiredStakeToHunt: bigint; minVouched: bigint; huntPeriod: bigint; challengePeriod: bigint; settlePeriod: bigint; reviewPeriod: bigint; }, unknown, unknown])[0].requiredStakeToHunt;
        
        setRequiredStake(requiredStakeAmount);
      } catch (e) {
        console.error("Error fetching required stake:", e);
        setError("Failed to fetch required stake amount");
      } finally {
        setLoading(false);
      }
    }

    fetchRequiredStake();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const depositAmount = parseEther(amount);
    if (depositAmount < requiredStake) {
      setError(`Minimum required stake is ${formatAmountWithDecimals(requiredStake)} HYPE`);
      return;
    }

    setError("");
    
    try {
      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'deposit',
        value: depositAmount,
      });
    } catch (e) {
      console.error("Error registering hunter:", e);
      setError(e instanceof Error ? e.message : "Failed to register hunter");
    }
  };

  // Handle successful registration
  if (isSuccess) {
    return (
      <div className="card p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2 theme-text-primary">Hunter Registration Successful!</h3>
          <p className="theme-text-secondary mb-4">
            You have successfully deposited {amount} HYPE and are now registered as a hunter.
          </p>
          <button
            onClick={() => {
              setAmount("");
              setShowForm(false);
              onSuccess?.();
            }}
            className="button-primary"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 theme-text-secondary">Loading...</span>
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="card p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2 theme-text-primary">Become a Hunter</h3>
          <p className="theme-text-secondary mb-4">
            To submit answers or challenge existing ones, you need to register as a hunter by depositing at least {formatAmountWithDecimals(requiredStake)} HYPE tokens.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="button-primary"
          >
            Register as Hunter
          </button>
        </div>
      </div>
    );
  }

  const isLoading = isPending || isConfirming;

  return (
    <div className="card p-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2 theme-text-primary">Hunter Registration</h3>
        <p className="theme-text-secondary">
          Deposit at least {formatAmountWithDecimals(requiredStake)} HYPE tokens to register as a hunter and start participating in the protocol.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2 theme-text-primary">
            HYPE Amount to Deposit
          </label>
          <div className="relative">
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.01"
              min={formatEther(requiredStake)}
              className="input-modern w-full pr-12"
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-sm theme-text-secondary">HYPE</span>
            </div>
          </div>
          <p className="text-xs theme-text-secondary mt-1">
            Minimum required: {formatEther(requiredStake)} HYPE
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="button-secondary flex-1"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="button-primary flex-1"
            disabled={isLoading || !amount || parseFloat(amount) < parseFloat(formatEther(requiredStake))}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Registering...
              </div>
            ) : (
              `Register with ${amount || '0'} HYPE`
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
