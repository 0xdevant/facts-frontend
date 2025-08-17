import { useState, useEffect } from 'react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Force re-render when theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          setIsDarkMode(isDark);
          setForceUpdate((prev: number) => prev + 1);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Set initial theme state
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);

    return () => observer.disconnect();
  }, []);

  if (!isOpen) return null;

  // Use forceUpdate to ensure re-render on theme change
  const renderKey = forceUpdate;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${isDarkMode ? 'bg-white/50' : 'bg-gray-800/50'}`}
      onClick={handleBackdropClick}
    >
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 max-w-4xl w-full shadow-2xl transform transition-all max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-start mb-4">
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>How facts.hype Works</h2>
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
            <p className={`text-lg leading-relaxed ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              facts.hype provides a way for users to ask any questions and get the most reliable and credible answer verified by the crowd, with a dispute resolution mechanism built-in.
            </p>
          </div>

          {/* Phases Overview */}
          <div className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'} p-4 rounded-xl`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Phases:</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-200 text-blue-900'}`}>Ask</span>
              <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-200 text-green-900'}`}>Hunt & Vouch</span>
              <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-200 text-yellow-900'}`}>Challenge</span>
              <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-200 text-purple-900'}`}>Settle</span>
              <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-200 text-indigo-900'}`}>Review</span>
              <svg className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-200 text-red-900'}`}>Finalize</span>
            </div>
          </div>

          {/* Step by Step Process */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-blue-800">1</span>
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Users can ask any question and choose to attach a bounty <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>(Truth-seeker asks)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-green-800">2</span>
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Others can submit different answers after depositing $HYPE to be a hunter <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>(Hunter hunts)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-green-800">3</span>
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Others can vouch for the answer they believe to be true by staking $HYPE on top <span className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>(Voucher vouches)</span>
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-green-800">4</span>
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  The answer with the most vouched gets selected to be the &ldquo;most-truthful&rdquo; answer
                </p>
                <div className="mt-2 space-y-2">
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span className="font-semibold">Note 1:</span> Hunter and vouchers of the selected answer will share the bounty
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
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
                <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Anyone can submit a challenge after the hunting period by paying $HYPE <span className={`font-semibold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>(Challenger challenges)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-purple-800">6</span>
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  If it gets accepted by the DAO - part of the hunter&apos;s stake will be slashed to challenger, part of vouchers&apos; stake will be slashed to the DAO <span className={`font-semibold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>(DAO settles)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-indigo-800">7</span>
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  In order to avoid the truth being manipulated by the DAO there is an external party in facts i.e. the Council to override DAO&apos;s decision and slash the DAO&apos;s $HYPE if needed <span className={`font-semibold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>(Council reviews)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm font-semibold text-red-800">8</span>
              </div>
              <div>
                <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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
