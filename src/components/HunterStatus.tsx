"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { readContract } from "viem/actions";
import { factsContractAddress, factsAbi, publicClient } from "@/lib/contract";

interface HunterStatusProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function HunterStatus({ children, fallback }: HunterStatusProps) {
  const [isHunter, setIsHunter] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const { address, isConnected } = useAccount();

  useEffect(() => {
    async function checkHunterStatus() {
      if (!isConnected || !address) {
        setIsHunter(false);
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

        
        
        // Extract required stake and user's deposited amount
        const requiredStake = (systemConfig as [{ requiredStakeForDAO: bigint; challengeDeposit: bigint; requiredStakeToHunt: bigint; minVouched: bigint; huntPeriod: bigint; challengePeriod: bigint; settlePeriod: bigint; reviewPeriod: bigint; }, unknown, unknown])[0].requiredStakeToHunt;
        const userDepositedAmount = userInfo as bigint;



        // Check if user has deposited enough to be a hunter
        setIsHunter(userDepositedAmount >= requiredStake);
        
      } catch (e) {
        console.error("Error checking hunter status:", e);
        setError("Failed to check hunter status");
        setIsHunter(false);
      } finally {
        setLoading(false);
      }
    }

    checkHunterStatus();
  }, [address, isConnected]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 theme-text-secondary">Checking hunter status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!isHunter) {
    return fallback || null;
  }

  return <>{children}</>;
}
