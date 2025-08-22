"use client";
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { readContract } from 'viem/actions';
import { factsContractAddress, factsAbi, publicClient } from '@/lib/contract';
import { formatEther, parseEther } from 'viem';

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // System Config Form State
  const [systemConfig, setSystemConfig] = useState({
    requiredStakeForDAO: "",
    challengeDeposit: "",
    requiredStakeToHunt: "",
    minVouched: "",
    huntPeriod: "",
    challengePeriod: "",
    settlePeriod: "",
    reviewPeriod: ""
  });

  // Challenge Config Form State
  const [challengeConfig, setChallengeConfig] = useState({
    slashHunterBP: "",
    slashVoucherBP: "",
    slashDaoBP: "",
    daoOpFeeBP: ""
  });

  // Distribution Config Form State
  const [distributionConfig, setDistributionConfig] = useState({
    hunterBP: "",
    voucherBP: ""
  });

  // Check if user is owner
  useEffect(() => {
    async function checkOwner() {
      if (!isConnected || !address) {
        setIsOwner(false);
        setLoading(false);
        return;
      }

      try {
        const contractOwner = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'owner',
          args: [],
        });

        setIsOwner(contractOwner.toLowerCase() === address.toLowerCase());
      } catch (error) {
        console.error('Error checking owner:', error);
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    }

    checkOwner();
  }, [isConnected, address]);

  // Load current config
  useEffect(() => {
    async function loadConfig() {
      if (!isOwner) return;

      try {
        const config = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'config',
          args: [],
        });

        const [systemConfigData, distributionConfigData, challengeConfigData] = config;

        setSystemConfig({
          requiredStakeForDAO: formatEther(systemConfigData.requiredStakeForDAO),
          challengeDeposit: formatEther(systemConfigData.challengeDeposit),
          requiredStakeToHunt: formatEther(systemConfigData.requiredStakeToHunt),
          minVouched: formatEther(systemConfigData.minVouched),
          huntPeriod: systemConfigData.huntPeriod.toString(),
          challengePeriod: systemConfigData.challengePeriod.toString(),
          settlePeriod: systemConfigData.settlePeriod.toString(),
          reviewPeriod: systemConfigData.reviewPeriod.toString()
        });

        setChallengeConfig({
          slashHunterBP: challengeConfigData.slashHunterBP.toString(),
          slashVoucherBP: challengeConfigData.slashVoucherBP.toString(),
          slashDaoBP: challengeConfigData.slashDaoBP.toString(),
          daoOpFeeBP: challengeConfigData.daoOpFeeBP.toString()
        });

        setDistributionConfig({
          hunterBP: distributionConfigData.hunterBP.toString(),
          voucherBP: distributionConfigData.voucherBP.toString()
        });
      } catch (error) {
        console.error('Error loading config:', error);
        setError('Failed to load current configuration');
      }
    }

    loadConfig();
  }, [isOwner]);

  // Handle success
  useEffect(() => {
    if (isSuccess) {
      setSuccessMessage('Transaction successful!');
      setError("");
      // Reload config after successful update
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [isSuccess]);

  const handleSetSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      const newSystemConfig = {
        requiredStakeForDAO: parseEther(systemConfig.requiredStakeForDAO),
        challengeDeposit: parseEther(systemConfig.challengeDeposit),
        requiredStakeToHunt: parseEther(systemConfig.requiredStakeToHunt),
        minVouched: parseEther(systemConfig.minVouched),
        huntPeriod: BigInt(systemConfig.huntPeriod),
        challengePeriod: BigInt(systemConfig.challengePeriod),
        settlePeriod: BigInt(systemConfig.settlePeriod),
        reviewPeriod: BigInt(systemConfig.reviewPeriod)
      };

      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'setSystemConfig',
        args: [newSystemConfig],
      });
    } catch (e) {
      console.error("Error setting system config:", e);
      setError(e instanceof Error ? e.message : "Failed to set system config");
    }
  };

  const handleSetChallengeConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      const newChallengeConfig = {
        slashHunterBP: BigInt(challengeConfig.slashHunterBP),
        slashVoucherBP: BigInt(challengeConfig.slashVoucherBP),
        slashDaoBP: BigInt(challengeConfig.slashDaoBP),
        daoOpFeeBP: BigInt(challengeConfig.daoOpFeeBP)
      };

      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'setChallengeConfig',
        args: [newChallengeConfig],
      });
    } catch (e) {
      console.error("Error setting challenge config:", e);
      setError(e instanceof Error ? e.message : "Failed to set challenge config");
    }
  };

  const handleSetDistributionConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      const hunterBP = BigInt(distributionConfig.hunterBP);
      const voucherBP = BigInt(distributionConfig.voucherBP);
      const protocolBP = BigInt(10000) - hunterBP - voucherBP;
      
      // Validate that the sum doesn't exceed 10000 BP
      if (hunterBP + voucherBP > BigInt(10000)) {
        setError("Hunter BP + Voucher BP cannot exceed 10000 basis points (100%)");
        return;
      }
      
      const newDistributionConfig = {
        hunterBP,
        voucherBP,
        protocolBP
      };

      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'setDistributionConfig',
        args: [newDistributionConfig],
      });
    } catch (e) {
      console.error("Error setting distribution config:", e);
      setError(e instanceof Error ? e.message : "Failed to set distribution config");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen theme-bg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card p-8 text-center">
            <div className="theme-text-primary">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen theme-bg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card p-8 text-center">
            <h1 className="text-2xl font-bold mb-4 theme-text-primary">Connect Your Wallet</h1>
            <p className="theme-text-secondary">
              Please connect your wallet to access the admin panel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen theme-bg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card p-8 text-center">
            <h1 className="text-2xl font-bold mb-4 theme-text-primary">Access Denied</h1>
            <p className="theme-text-secondary">
              Only the contract owner can access the admin panel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 theme-text-primary">Admin Panel</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600">{successMessage}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* System Config */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 theme-text-primary">System Configuration</h2>
            <form onSubmit={handleSetSystemConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Required Stake for DAO (HYPE)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={systemConfig.requiredStakeForDAO}
                    onChange={(e) => setSystemConfig({...systemConfig, requiredStakeForDAO: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Challenge Deposit (HYPE)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={systemConfig.challengeDeposit}
                    onChange={(e) => setSystemConfig({...systemConfig, challengeDeposit: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Required Stake to Hunt (HYPE)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={systemConfig.requiredStakeToHunt}
                    onChange={(e) => setSystemConfig({...systemConfig, requiredStakeToHunt: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Minimum Vouched (HYPE)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={systemConfig.minVouched}
                    onChange={(e) => setSystemConfig({...systemConfig, minVouched: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Hunt Period (seconds)</label>
                  <input
                    type="number"
                    value={systemConfig.huntPeriod}
                    onChange={(e) => setSystemConfig({...systemConfig, huntPeriod: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Challenge Period (seconds)</label>
                  <input
                    type="number"
                    value={systemConfig.challengePeriod}
                    onChange={(e) => setSystemConfig({...systemConfig, challengePeriod: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Settle Period (seconds)</label>
                  <input
                    type="number"
                    value={systemConfig.settlePeriod}
                    onChange={(e) => setSystemConfig({...systemConfig, settlePeriod: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Review Period (seconds)</label>
                  <input
                    type="number"
                    value={systemConfig.reviewPeriod}
                    onChange={(e) => setSystemConfig({...systemConfig, reviewPeriod: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isPending || isConfirming}
                className="button-primary w-full"
              >
                {isPending || isConfirming ? 'Updating...' : 'Update System Config'}
              </button>
            </form>
          </div>

          {/* Challenge Config */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 theme-text-primary">Challenge Configuration (Basis Points)</h2>
            <form onSubmit={handleSetChallengeConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Slash Hunter BP</label>
                  <input
                    type="number"
                    value={challengeConfig.slashHunterBP}
                    onChange={(e) => setChallengeConfig({...challengeConfig, slashHunterBP: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Slash Voucher BP</label>
                  <input
                    type="number"
                    value={challengeConfig.slashVoucherBP}
                    onChange={(e) => setChallengeConfig({...challengeConfig, slashVoucherBP: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Slash DAO BP</label>
                  <input
                    type="number"
                    value={challengeConfig.slashDaoBP}
                    onChange={(e) => setChallengeConfig({...challengeConfig, slashDaoBP: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">DAO Op Fee BP</label>
                  <input
                    type="number"
                    value={challengeConfig.daoOpFeeBP}
                    onChange={(e) => setChallengeConfig({...challengeConfig, daoOpFeeBP: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isPending || isConfirming}
                className="button-primary w-full"
              >
                {isPending || isConfirming ? 'Updating...' : 'Update Challenge Config'}
              </button>
            </form>
          </div>

          {/* Distribution Config */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 theme-text-primary">Distribution Configuration (Basis Points)</h2>
            <form onSubmit={handleSetDistributionConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Hunter BP</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={distributionConfig.hunterBP}
                    onChange={(e) => setDistributionConfig({...distributionConfig, hunterBP: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Voucher BP</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={distributionConfig.voucherBP}
                    onChange={(e) => setDistributionConfig({...distributionConfig, voucherBP: e.target.value})}
                    className="input-modern w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 theme-text-primary">Protocol BP (Auto-calculated)</label>
                  <input
                    type="number"
                    value={(() => {
                      const hunterBP = parseInt(distributionConfig.hunterBP) || 0;
                      const voucherBP = parseInt(distributionConfig.voucherBP) || 0;
                      const protocolBP = 10000 - hunterBP - voucherBP;
                      return protocolBP >= 0 ? protocolBP.toString() : "0";
                    })()}
                    className="input-modern w-full bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Protocol BP = 10000 - Hunter BP - Voucher BP
                  </p>
                </div>
              </div>
              <button
                type="submit"
                disabled={isPending || isConfirming}
                className="button-primary w-full"
              >
                {isPending || isConfirming ? 'Updating...' : 'Update Distribution Config'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
