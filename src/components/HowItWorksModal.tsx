interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-4xl w-full shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold theme-text-primary">How facts.hype Works</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Introduction */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-4 rounded-xl">
            <p className="text-lg theme-text-primary leading-relaxed">
              facts.hype provides a way for users to ask any questions and get the most reliable and credible answer verified by the crowd, with a dispute resolution mechanism built-in.
            </p>
          </div>

          {/* Phases Overview */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
            <h3 className="text-lg font-semibold mb-4 theme-text-primary">Phases:</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">Ask</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">Hunt & Vouch</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full">Challenge</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">Settle</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full">Review</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full">Finalize</span>
            </div>
          </div>

          {/* Step by Step Process */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-blue-800">1</span>
              </div>
              <div>
                <p className="theme-text-primary">
                  Users can ask any question and choose to attach a bounty <span className="font-semibold text-blue-600">(Truth-seeker asks)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-green-800">2</span>
              </div>
              <div>
                <p className="theme-text-primary">
                  Others can submit different answers after depositing $HYPE to be a hunter <span className="font-semibold text-green-600">(Hunter hunts)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-green-800">3</span>
              </div>
              <div>
                <p className="theme-text-primary">
                  Others can vouch for the answer they believe to be true by staking $HYPE on top <span className="font-semibold text-emerald-600">(Voucher vouches)</span>
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-green-800">4</span>
              </div>
              <div>
                <p className="theme-text-primary">
                  The answer with the most vouched gets selected to be the &ldquo;most-truthful&rdquo; answer
                </p>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm theme-text-secondary">
                      <span className="font-semibold">Note 1:</span> Hunter and vouchers of the selected answer will share the bounty
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm theme-text-secondary">
                      <span className="font-semibold">Note 2:</span> If there is only one answer or no answer gets more vouched than the others, the result can be settled immediately and no bounty will be distributed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-yellow-800">5</span>
              </div>
              <div>
                <p className="theme-text-primary">
                  Anyone can submit a challenge after the hunting period by paying $HYPE <span className="font-semibold text-yellow-600">(Challenger challenges)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-purple-800">6</span>
              </div>
              <div>
                <p className="theme-text-primary">
                  If it gets accepted by the DAO - part of the hunter&apos;s stake will be slashed to challenger, part of vouchers&apos; stake will be slashed to the DAO <span className="font-semibold text-orange-600">(DAO settles)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-indigo-800">7</span>
              </div>
              <div>
                <p className="theme-text-primary">
                  In order to avoid the truth being manipulated by the DAO there is an external party in facts i.e. the Council to override DAO&apos;s decision and slash the DAO&apos;s $HYPE if needed <span className="font-semibold text-indigo-600">(Council reviews)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-red-800">8</span>
              </div>
              <div>
                <p className="theme-text-primary">
                  Anyone can then finalize the question to automatically distribute the bounty and slash related parties
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
