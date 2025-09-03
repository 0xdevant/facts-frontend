"use client";

import { useAccount } from "wagmi";
import GeneralDashboard from "@/components/GeneralDashboard";

export default function DashboardPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-screen theme-bg">
        <div className="max-w-6xl mx-auto px-4 py-8">
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <GeneralDashboard />

        {/* Information Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
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
