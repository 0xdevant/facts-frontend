"use client";
import { useAccount } from "wagmi";

interface HunterRegistrationProps {
  onSuccess?: () => void;
}

export default function HunterRegistration({ onSuccess }: HunterRegistrationProps) {
  const { isConnected } = useAccount();



  if (!isConnected) {
    return (
      <div className="card p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2 theme-text-primary">Connect Wallet</h3>
          <p className="theme-text-secondary mb-4">
            Please connect your wallet to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2 theme-text-primary">No Registration Required!</h3>
                  <p className="theme-text-secondary">
            In the new contract version, you don&apos;t need to register as a hunter. You can now submit answers directly with HYPE staking relative to each question&apos;s bounty.
          </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How it works now:</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• <strong>No upfront deposit:</strong> You don&apos;t need to deposit HYPE to become a hunter</li>
          <li>• <strong>Stake per question:</strong> When you submit an answer, you stake HYPE relative to the question&apos;s bounty</li>
          <li>• <strong>Isolated staking:</strong> Each stake is isolated to each question and can be slashed independently</li>
          <li>• <strong>Direct participation:</strong> Start answering questions immediately without any registration process</li>
        </ul>
      </div>



      <div className="text-center">
        <button
          onClick={() => onSuccess?.()}
          className="button-primary mx-auto"
        >
          Continue to Questions
        </button>
      </div>
    </div>
  );
}
