"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

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

        // In the new contract, users don't need to register as hunters
        // They stake HYPE directly when submitting answers

        // In the new contract, users don't need to register as hunters
        // They stake HYPE directly when submitting answers
        // For now, we'll show that everyone can be a hunter
        setIsHunter(true);
        
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
