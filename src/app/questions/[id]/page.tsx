"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "viem/actions";
import { parseEther, formatEther, encodeAbiParameters, decodeAbiParameters } from "viem";
import { factsContractAddress, factsAbi, publicClient } from "@/lib/contract";
import HunterStatus from "@/components/HunterStatus";
import HunterRegistration from "@/components/HunterRegistration";
import ChallengeForm from "@/components/ChallengeForm";
import { fetchQuestionRules } from "@/lib/questions";
import { extractAnswerIdFromReceipt, extractChallengeAnswerIdFromReceipt } from "@/lib/transactionUtils";

// Question types from smart contract
// enum QuestionType {
//     Binary,      // 0
//     Number,      // 1  
//     OpenEnded    // 2
// }

// Types
interface Question {
  questionType: number;
  description: string;
  seeker: string;
  bountyToken: string;
  bountyAmount: bigint;
  slotData: {
    startHuntAt: bigint;
    endHuntAt: bigint;
    answerId: number;
    overthrownAnswerId: number;
    challenged: boolean;
    challengeSucceeded: boolean;
    overridden: boolean;
    finalized: boolean;
  };
}

interface Answer {
  hunter: string;
  encodedAnswer: string;
  byChallenger: boolean;
  totalVouched: bigint;
}

interface BackendResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// API functions
const saveSourcesToBackend = async (
  questionId: number,
  answerId: number,
  answer: string,
  sources: string,
  hunterAddress: string
): Promise<BackendResponse> => {
  try {
    const requestBody = {
      questionId,
      answerId,
      answer,
      sources,
      hunterAddress,
      timestamp: Date.now(),
    };
    

    
    const response = await fetch('/api/sources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving sources to backend:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save sources',
    };
  }
};

// Utility functions
const mapQuestionData = (questionData: readonly [number, `0x${string}`, string, `0x${string}`, bigint, { startHuntAt: bigint; endHuntAt: bigint; answerId: number; overthrownAnswerId: number; challenged: boolean; challengeSucceeded: boolean; overridden: boolean; finalized: boolean }]): Question => {
  return {
    questionType: questionData[0],
    seeker: questionData[1],
    description: questionData[2],
    bountyToken: questionData[3],
    bountyAmount: questionData[4],
    slotData: {
      startHuntAt: questionData[5].startHuntAt,
      endHuntAt: questionData[5].endHuntAt,
      answerId: questionData[5].answerId,
      overthrownAnswerId: questionData[5].overthrownAnswerId,
      challenged: questionData[5].challenged,
      challengeSucceeded: questionData[5].challengeSucceeded,
      overridden: questionData[5].overridden,
      finalized: questionData[5].finalized,
    }
  };
};

const mapAnswersData = (answersData: Array<{ hunter: `0x${string}`; encodedAnswer: `0x${string}`; byChallenger: boolean; totalVouched: bigint }>): Answer[] => {
  return answersData.map((answerData) => {
    // Extract data from object structure
    const hunter = answerData.hunter;
    const encodedAnswer = answerData.encodedAnswer;
    const byChallenger = answerData.byChallenger;
    const totalVouched = answerData.totalVouched || BigInt(0);
    
    return {
      hunter,
      encodedAnswer,
      byChallenger,
      totalVouched,
    };
  });
};

const getQuestionTypeLabel = (type: number): string => {
  switch (type) {
    case 0: return "Binary (Yes/No)";
    case 1: return "Number";
    default: return "Open Ended";
  }
};

const decodeAnswer = (encodedAnswer: string, questionType: number): string => {
  try {
    if (!encodedAnswer || encodedAnswer === '0x') {
      return 'No answer provided';
    }

    if (questionType === 0) {
      // Binary question: decode as uint
      const decoded = decodeAbiParameters(
        [{ type: 'uint256', name: 'answer' }],
        encodedAnswer as `0x${string}`
      );
      const value = Number(decoded[0]);
      return value === 1 ? 'Yes' : 'No';
    } else if (questionType === 1) {
      // Number question: decode as uint
      const decoded = decodeAbiParameters(
        [{ type: 'uint256', name: 'answer' }],
        encodedAnswer as `0x${string}`
      );
      return decoded[0].toString();
    } else {
      // OpenEnded question: decode as string
      const decoded = decodeAbiParameters(
        [{ type: 'string', name: 'answer' }],
        encodedAnswer as `0x${string}`
      );
      return decoded[0];
    }
  } catch (error) {
    console.error('Error decoding answer:', error);
    return 'Error decoding answer';
  }
};

const formatDate = (timestamp: bigint | undefined): string => {
  try {
    if (!timestamp) {
      return 'Date unavailable';
    }
    
    // Handle very large BigInt values safely
    let timestampNumber: number;
    if (timestamp > BigInt(Number.MAX_SAFE_INTEGER)) {
      // For very large numbers, try to extract the relevant part
      const timestampStr = timestamp.toString();
      if (timestampStr.length > 13) {
        // If it's longer than 13 digits, it might be in nanoseconds or microseconds
        timestampNumber = parseInt(timestampStr.slice(0, 10));
      } else {
        timestampNumber = parseInt(timestampStr);
      }
    } else {
      timestampNumber = Number(timestamp);
    }
    
    // Try different timestamp formats
    let date = new Date(timestampNumber * 1000); // Unix timestamp in seconds
    
    if (isNaN(date.getTime())) {
      date = new Date(timestampNumber); // Unix timestamp in milliseconds
    }
    
    if (isNaN(date.getTime())) {
      return 'Date unavailable';
    }
    
    const currentYear = new Date().getFullYear();
    const dateYear = date.getFullYear();
    
    // If the date is in the current year, don't show the year
    if (dateYear === currentYear) {
      return date.toLocaleDateString('en-US', {
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date unavailable';
  }
};

const formatBountyAmount = (amount: bigint): string => {
  if (amount === BigInt(0)) return 'No bounty';
  const inEther = Number(amount) / Math.pow(10, 18);
  
  // Remove trailing zeros and unnecessary decimal point
  const formatted = inEther.toString();
  const parts = formatted.split('.');
  
  if (parts.length === 1) {
    // No decimal part
    return `${parts[0]} HYPE`;
  } else {
    // Has decimal part, remove trailing zeros and limit to 6 decimal places for detail page
    let decimalPart = parts[1].replace(/0+$/, '');
    if (decimalPart.length > 6) {
      decimalPart = decimalPart.substring(0, 6);
    }
    
    if (decimalPart === '') {
      return `${parts[0]} HYPE`;
    } else {
      return `${parts[0]}.${decimalPart} HYPE`;
    }
  }
};

const formatBountyAmountExact = (amount: bigint): string => {
  if (amount === BigInt(0)) return 'No bounty';
  const inEther = Number(amount) / Math.pow(10, 18);
  return `${inEther} HYPE`;
};

const formatExactTime = (timestamp: bigint | undefined): string => {
  try {
    if (!timestamp) {
      return 'Time unavailable';
    }
    
    // Handle very large BigInt values safely
    let timestampNumber: number;
    if (timestamp > BigInt(Number.MAX_SAFE_INTEGER)) {
      // For very large numbers, try to extract the relevant part
      const timestampStr = timestamp.toString();
      if (timestampStr.length > 13) {
        // If it's longer than 13 digits, it might be in nanoseconds or microseconds
        timestampNumber = parseInt(timestampStr.slice(0, 10));
      } else {
        timestampNumber = parseInt(timestampStr);
      }
    } else {
      timestampNumber = Number(timestamp);
    }
    
    // Try different timestamp formats
    let date = new Date(timestampNumber * 1000); // Unix timestamp in seconds
    
    if (isNaN(date.getTime())) {
      date = new Date(timestampNumber); // Unix timestamp in milliseconds
    }
    
    if (isNaN(date.getTime())) {
      return 'Time unavailable';
    }
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  } catch (error) {
    console.error('Error formatting exact time:', error);
    return 'Time unavailable';
  }
};

// Function to convert text with URLs to JSX with clickable links
const renderTextWithLinks = (text: string): React.ReactNode => {
  if (!text || text === "No sources provided") {
    return text;
  }

  // URL regex pattern - matches http/https URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const formatVouchedAmount = (amount: bigint): string => {
  if (amount === BigInt(0)) return '0 HYPE';
  const inEther = Number(amount) / Math.pow(10, 18);
  
  // Remove trailing zeros and unnecessary decimal point
  const formatted = inEther.toString();
  const parts = formatted.split('.');
  
  if (parts.length === 1) {
    // No decimal part
    return `${parts[0]} HYPE`;
  } else {
    // Has decimal part, remove trailing zeros and limit to 4 decimal places
    let decimalPart = parts[1].replace(/0+$/, '');
    if (decimalPart.length > 4) {
      decimalPart = decimalPart.substring(0, 4);
    }
    
    if (decimalPart === '') {
      return `${parts[0]} HYPE`;
    } else {
      return `${parts[0]}.${decimalPart} HYPE`;
    }
  }
};

const truncateAddress = (address: string | undefined | null): string => {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getQuestionStatus = (question: Question & { id: number }, challengePeriodSeconds: number): { status: string; color: string } => {
  const now = Math.floor(Date.now() / 1000);
  if (question.slotData.finalized) {
    return { status: "Finalized", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" };
  }
  if (question.slotData.challenged) {
    return { status: "Challenged", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
  }
  const challengePeriodEnd = Number(question.slotData.endHuntAt) + challengePeriodSeconds;
  if (now > challengePeriodEnd) {
    return { status: "Settling", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
  }
  if (now > question.slotData.endHuntAt) {
    return { status: "Challenge Period", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
  }
  return { status: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
};

// Components
const StatusBadge = ({ question, challengePeriod }: { question: Question & { id: number }; challengePeriod: number }) => {
  const { status, color } = getQuestionStatus(question, challengePeriod);
  return (
    <div className={`flex items-center gap-2 px-3 py-1 ${color} rounded-full`}>
      <div className="w-2 h-2 bg-current rounded-full"></div>
      <span className="text-sm font-medium">
        {status}
      </span>
    </div>
  );
};

const InfoCard = ({ 
  icon, 
  title, 
  value, 
  gradientFrom, 
  gradientTo, 
  borderColor,
  tooltip,
  textSize = "text-sm"
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  tooltip?: string;
  textSize?: string;
}) => (
  <div className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} border ${borderColor} rounded-xl p-3`}>
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <h4 className="font-semibold text-white text-base">{title}</h4>
    </div>
    <div className={`${textSize} text-white whitespace-pre-line`} title={tooltip}>{value}</div>
  </div>
);

// Period calculation functions
const calculatePeriods = (question: Question & { id: number }, config: [{ requiredStakeForDAO: bigint; challengeDeposit: bigint; requiredStakeToHunt: bigint; minVouched: bigint; huntPeriod: bigint; challengePeriod: bigint; settlePeriod: bigint; reviewPeriod: bigint; }, unknown, unknown]) => {
  const startHuntAt = Number(question.slotData.startHuntAt);
  const endHuntAt = Number(question.slotData.endHuntAt);
  const challengePeriod = Number(config[0].challengePeriod);
  const settlePeriod = Number(config[0].settlePeriod);
  const reviewPeriod = Number(config[0].reviewPeriod);

  return {
    huntPeriod: {
      start: new Date(startHuntAt * 1000),
      end: new Date(endHuntAt * 1000)
    },
    challengePeriod: {
      start: new Date(endHuntAt * 1000),
      end: new Date((endHuntAt + challengePeriod) * 1000)
    },
    settlePeriod: {
      start: new Date((endHuntAt + challengePeriod) * 1000),
      end: new Date((endHuntAt + challengePeriod + settlePeriod) * 1000)
    },
    reviewPeriod: {
      start: new Date((endHuntAt + challengePeriod + settlePeriod) * 1000),
      end: new Date((endHuntAt + challengePeriod + settlePeriod + reviewPeriod) * 1000)
    }
  };
};

const PeriodInfoTooltip = ({ question, mostVouchedAnsId }: { question: Question & { id: number }; mostVouchedAnsId: number }) => {
  const [config, setConfig] = useState<[{ requiredStakeForDAO: bigint; challengeDeposit: bigint; requiredStakeToHunt: bigint; minVouched: bigint; huntPeriod: bigint; challengePeriod: bigint; settlePeriod: bigint; reviewPeriod: bigint; }, unknown, unknown] | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configData = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'config',
          args: [],
        });
        setConfig(configData as [{ requiredStakeForDAO: bigint; challengeDeposit: bigint; requiredStakeToHunt: bigint; minVouched: bigint; huntPeriod: bigint; challengePeriod: bigint; settlePeriod: bigint; reviewPeriod: bigint; }, unknown, unknown]);
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };
    fetchConfig();
  }, []);

  if (!config) return null;

  const periods = calculatePeriods(question, config);
  const currentTime = new Date();

  const formatPeriod = (start: Date, end: Date, name: string) => {
    const isActive = currentTime >= start && currentTime <= end;
    const isPast = currentTime > end;
    
    let status = '';
    if (isActive) status = '🟢 Active';
    else if (isPast) status = '🔴 Ended';
    else status = '⏳ Upcoming';

    // Check if start and end are on the same day
    const isSameDay = start.toDateString() === end.toDateString();
    
    // Format the time display
    let timeDisplay = '';
    if (isSameDay) {
      // Same day: show date + time range
      timeDisplay = `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      // Different days: show date range
      timeDisplay = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }

    return (
      <div key={name} className={`p-3 rounded-lg border ${isActive ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : isPast ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm text-gray-900 dark:text-white">{name}</span>
          <span className="text-xs font-medium text-gray-900 dark:text-white">{status}</span>
        </div>
        <div className="text-xs text-gray-700 dark:text-gray-300">
          {timeDisplay}
        </div>
      </div>
    );
  };

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      
      {isVisible && (
        <div className="absolute z-50 left-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl p-4">
          <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Question Periods</h4>
          <div className="space-y-2">
            {formatPeriod(periods.huntPeriod.start, periods.huntPeriod.end, 'Hunt')}
            {/* Show other periods if hunt period is still active OR if there's a most vouched answer */}
            {(currentTime < periods.huntPeriod.end || mostVouchedAnsId !== 65535) && (
              <>
                {formatPeriod(periods.challengePeriod.start, periods.challengePeriod.end, 'Challenge (if available)')}
                {formatPeriod(periods.settlePeriod.start, periods.settlePeriod.end, 'Settle')}
                {formatPeriod(periods.reviewPeriod.start, periods.reviewPeriod.end, 'Review (if challenged)')}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionDetails = ({ 
  question, 
  rules, 
  isDAO,
  isInSettlePeriod, 
  questionChallenged, 
  isAfterChallengePeriod,
  isAfterReviewPeriod,
  isWithinReviewPeriod,
  isAfterHuntPeriod,
  mostVouchedAnsId,
  challengePeriod,
  daoFee,
  onSettleClick,
  onOverrideSettle,
  onFinalize
}: { 
  question: Question & { id: number }; 
  rules: string | null;
  isDAO: boolean;
  isInSettlePeriod: boolean;
  questionChallenged: boolean;
  isAfterChallengePeriod: boolean;
  isAfterReviewPeriod: boolean;
  isWithinReviewPeriod: boolean;
  isAfterHuntPeriod: boolean;
  mostVouchedAnsId: number;
  challengePeriod: number;
  daoFee: bigint;
  onSettleClick: () => void;
  onOverrideSettle: () => void;
  onFinalize: () => void;
}) => (
  <>
    <div className="card p-8 mb-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold theme-text-primary">Question #{question.id}</h1>
            <PeriodInfoTooltip question={question} mostVouchedAnsId={mostVouchedAnsId} />
            {/* Settle Button - Show when hunt period is over and no most vouched answer, or when challenge period is over */}
            {((mostVouchedAnsId === 65535 && isAfterHuntPeriod) || (mostVouchedAnsId !== 65535 && isAfterChallengePeriod)) && !question.slotData.finalized && daoFee === BigInt(0) && (
              <div className="flex gap-2">
                {/* Regular Settle Button - Show for DAO members or when question is not challenged */}
                {(isDAO || !question.slotData.challenged) && (
                  <button
                    onClick={onSettleClick}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 transform hover:scale-105"
                  >
                    Settle Question
                  </button>
                )}
              </div>
            )}

            {/* Override Settlement Button - Show during review period when question is challenged */}
            {question.slotData.challenged && isWithinReviewPeriod && !question.slotData.finalized && !question.slotData.overridden && (
              <div className="flex gap-2">
                <button
                  onClick={onOverrideSettle}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 transform hover:scale-105"
                >
                  Override Settlement
                </button>
              </div>
            )}

            {/* Finalize Button - Show when review period is over and question is not finalized */}
            {isAfterReviewPeriod && !question.slotData.finalized && (
              <div className="flex gap-2">
                <button
                  onClick={onFinalize}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 transform hover:scale-105"
                >
                  Finalize Question
                </button>
              </div>
            )}
          </div>
          <p className="theme-text-secondary text-lg">{question.description}</p>
        </div>
        <StatusBadge question={question} challengePeriod={challengePeriod} />
      </div>
      
      {/* DAO Settlement Announcement */}
      {daoFee > BigInt(0) && (
        <div className="card p-6 mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">DAO Settlement Complete</h3>
          </div>
          <div className="space-y-3">
            <p className="text-purple-800 dark:text-purple-200">
              The DAO has settled this question. Here are the settlement results:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Winning Answer</h4>
                <p className="text-purple-800 dark:text-purple-200">
                  Answer #{question.slotData.answerId + 1}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Challenge Result</h4>
                <p className="text-purple-800 dark:text-purple-200">
                  {question.slotData.challengeSucceeded ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">Challenge Succeeded</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 font-medium">Challenge Failed</span>
                  )}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
              <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">DAO Fee Collected</h4>
              <p className="text-purple-800 dark:text-purple-200">
                {formatEther(daoFee)} HYPE
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard
          icon={
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="Type"
          value={getQuestionTypeLabel(question.questionType)}
          gradientFrom="from-purple-500 to-purple-600"
          gradientTo=""
          borderColor="border-purple-500"
        />
        
        <InfoCard
          icon={
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          title="Bounty"
          value={formatBountyAmount(question.bountyAmount)}
          gradientFrom="from-green-500 to-green-600"
          gradientTo=""
          borderColor="border-green-500"
          tooltip={formatBountyAmountExact(question.bountyAmount)}
        />
        
        <InfoCard
          icon={
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          title="Seeker"
          value={truncateAddress(question.seeker)}
          gradientFrom="from-blue-500 to-blue-600"
          gradientTo=""
          borderColor="border-blue-500"
        />
        
        <InfoCard
          icon={
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="Hunt Period"
          value={`${formatDate(question.slotData.startHuntAt)} - ${formatDate(question.slotData.endHuntAt)}`}
          gradientFrom="from-orange-500 to-orange-600"
          gradientTo=""
          borderColor="border-orange-500"
          textSize="text-xs"
          tooltip={`${formatExactTime(question.slotData.startHuntAt)} - ${formatExactTime(question.slotData.endHuntAt)}`}
        />
      </div>
    </div>

    {/* Rules Section */}
    {rules && (
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold theme-text-primary">Rules</h3>
        </div>
        <p className="theme-text-secondary whitespace-pre-wrap">{rules}</p>
      </div>
    )}
  </>
);

const AnswerForm = ({ 
  onSubmit, 
  loading, 
  error,
  questionType,
  questionId 
}: { 
  onSubmit: (answer: string, sources: string) => void;
  loading: boolean;
  error: string;
  questionType: number;
  questionId: number;
}) => {
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState("");
  const [backendError, setBackendError] = useState("");
  const [backendLoading, setBackendLoading] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim() || !sources.trim()) {
      return;
    }

    // First, submit the answer to the smart contract
    onSubmit(answer, sources);
    
    // Clear form immediately for better UX
    setAnswer("");
    setSources("");
    setBackendError("");
  };

  const isBinaryQuestion = questionType === 0;

  return (
    <div className="card p-8 mb-8">
      <h2 className="text-2xl font-bold mb-6 theme-text-primary">Submit Answer</h2>
      
      {(error || backendError) && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">
            {error || backendError}
          </p>
          {backendError && (
            <p className="text-sm text-red-500 dark:text-red-400 mt-1">
              Note: Your answer was submitted to the blockchain, but sources couldn&apos;t be saved to our database.
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 theme-text-primary">
            Your Answer
          </label>
          
          {isBinaryQuestion ? (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setAnswer("Yes")}
                className={`flex-1 py-3 px-6 rounded-xl border-2 font-medium transition-all ${
                  answer === "Yes"
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300"
                    : "border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-600"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setAnswer("No")}
                className={`flex-1 py-3 px-6 rounded-xl border-2 font-medium transition-all ${
                  answer === "No"
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300"
                    : "border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-600"
                }`}
              >
                No
              </button>
            </div>
          ) : (
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Provide your answer here..."
              className="input-modern w-full h-32 resize-none"
              required
            />
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2 theme-text-primary">
            Sources <span className="text-sm text-gray-500">(will be saved to our database)</span>
          </label>
          <textarea
            value={sources}
            onChange={(e) => setSources(e.target.value)}
            placeholder="Provide sources to support your answer..."
            className="input-modern w-full h-24 resize-none"
            required
          />
          <p className="text-xs theme-text-secondary mt-1">
            Sources are stored separately from the blockchain for better accessibility.
          </p>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={loading || !answer.trim() || !sources.trim()}
          className="button-primary w-full"
        >
          {loading ? "Submitting..." : "Submit Answer"}
        </button>
      </div>
    </div>
  );
};

const AnswerCard = ({ answer, index, questionType, questionId, question }: { answer: Answer; index: number; questionType: number; questionId: number; question: Question & { id: number } }) => {
  const { address } = useAccount();
  
  // Check if current user is the one who submitted this answer
  const isMyAnswer = address && answer.hunter.toLowerCase() === address.toLowerCase();
  // Decode the encoded answer based on question type
  const decodedAnswer = decodeAnswer(answer.encodedAnswer, questionType);
  
  // Determine if this answer is the winner for finalized questions
  const isWinner = question.slotData.finalized && index === question.slotData.answerId;
  
  // Determine if this is a challenge answer using the byChallenger field
  const isChallengeAnswer = answer.byChallenger;
  
  // Try to get sources from backend, fallback to "No sources provided"
  const [sources, setSources] = useState<string>("No sources provided");
  
  useEffect(() => {
    // Fetch sources for this answer
    const fetchSources = async () => {
      try {
        const response = await fetch(`/api/sources?questionId=${questionId}&answerId=${index}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setSources(data.data.sources || "No sources provided");
          }
        }
      } catch (error) {
        console.error('Error fetching sources:', error);
      }
    };
    
    fetchSources();
  }, [questionId, index]);

  return (
    <div className={`border rounded-lg p-6 ${
      isWinner 
        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg' 
        : isChallengeAnswer
        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold theme-text-primary">Answer #{index + 1}</h3>
            {isMyAnswer && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                You
              </div>
            )}
            {isWinner && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Winner
              </div>
            )}
            {isChallengeAnswer && !isWinner && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Challenge
              </div>
            )}
          </div>
          <p className="text-sm theme-text-secondary mt-2">by {truncateAddress(answer.hunter)}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold theme-text-primary" title={formatBountyAmountExact(answer.totalVouched || BigInt(0))}>{formatVouchedAmount(answer.totalVouched || BigInt(0))}</p>
          <p className="text-sm theme-text-secondary">vouched</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <h4 className="font-medium mb-1 theme-text-primary">Answer</h4>
          <p className="theme-text-secondary">{decodedAnswer}</p>
        </div>
        
        <div>
          <h4 className="font-medium mb-1 theme-text-primary">Sources</h4>
          <div className="theme-text-secondary">{renderTextWithLinks(sources)}</div>
        </div>
      </div>
    </div>
  );
};

const VouchForm = ({ 
  answers, 
  onVouch, 
  loading 
}: { 
  answers: Answer[];
  onVouch: (answerId: number, amount: string) => void;
  loading: boolean;
}) => {
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [vouchAmount, setVouchAmount] = useState("");
  const [minVouchedAmount, setMinVouchedAmount] = useState<bigint>(BigInt(0));
  const [configLoading, setConfigLoading] = useState(true);

  // Fetch minimum vouched amount from contract
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'config',
          args: [],
        });
        const systemConfig = config[0];
        setMinVouchedAmount(systemConfig.minVouched);
      } catch (error) {
        console.error('Error fetching config:', error);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Validate vouch amount
  const isAmountValid = () => {
    if (!vouchAmount || parseFloat(vouchAmount) <= 0) return false;
    const amountInWei = parseEther(vouchAmount);
    return amountInWei >= minVouchedAmount;
  };

  const getAmountError = () => {
    if (!vouchAmount || parseFloat(vouchAmount) <= 0) return null;
    const amountInWei = parseEther(vouchAmount);
    if (amountInWei < minVouchedAmount) {
      return `Minimum vouch amount is ${formatEther(minVouchedAmount)} HYPE`;
    }
    return null;
  };

  const handleVouch = () => {
    if (selectedAnswerId !== null) {
      onVouch(selectedAnswerId, vouchAmount);
      setSelectedAnswerId(null);
      setVouchAmount("");
    }
  };

  return (
    <div className="card p-8 mb-8">
      <h2 className="text-2xl font-bold mb-6 theme-text-primary">Vouch for Answer</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 theme-text-primary">
            Select Answer
          </label>
          <select
            value={selectedAnswerId !== null ? selectedAnswerId.toString() : ""}
            onChange={(e) => setSelectedAnswerId(e.target.value ? Number(e.target.value) : null)}
            className="select-modern w-full"
          >
            <option value="">Choose an answer...</option>
            {answers.map((_, index) => (
              <option key={index} value={index}>
                Answer #{index + 1}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2 theme-text-primary">
            Vouch Amount (HYPE)
          </label>
          <input
            type="number"
            value={vouchAmount}
            onChange={(e) => setVouchAmount(e.target.value)}
            placeholder={configLoading ? "Loading..." : `Minimum: ${formatEther(minVouchedAmount)} HYPE`}
            step="0.01"
            min="0"
            className="input-modern w-full"
          />
          {getAmountError() && (
            <p className="text-sm text-red-600 mt-1">{getAmountError()}</p>
          )}
        </div>
        
        <button
          onClick={handleVouch}
          disabled={loading || selectedAnswerId === null || !vouchAmount || !isAmountValid()}
          className="button-primary w-full"
        >
          {loading ? "Vouching..." : "Vouch for Answer"}
        </button>
      </div>
    </div>
  );
};

const SuccessModal = ({ isOpen, onClose, message }: { isOpen: boolean; onClose: () => void; message: string }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all">
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Success!
          </h3>
          
          {/* Message */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {message}
          </p>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium py-3 px-6 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 transform hover:scale-105"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

// Main component
export default function QuestionDetailPage() {
  const params = useParams();
  const questionId = params.id as string;
  
  const [question, setQuestion] = useState<(Question & { id: number }) | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [rules, setRules] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingSources, setPendingSources] = useState<{ answer: string; sources: string } | null>(null);
 
  const [vouchSuccess, setVouchSuccess] = useState(false);
  const [challengeSuccess, setChallengeSuccess] = useState(false);
  const [isInChallengePeriod, setIsInChallengePeriod] = useState(false);
  const [isAfterChallengePeriod, setIsAfterChallengePeriod] = useState(false);
  const [isInSettlePeriod, setIsInSettlePeriod] = useState(false);
  const [isAfterReviewPeriod, setIsAfterReviewPeriod] = useState(false);
  const [isWithinReviewPeriod, setIsWithinReviewPeriod] = useState(false);
  const [isAfterHuntPeriod, setIsAfterHuntPeriod] = useState(false);
  const [mostVouchedAnsId, setMostVouchedAnsId] = useState<number>(0);
  const [settleSuccess, setSettleSuccess] = useState(false);
  const [finalizeSuccess, setFinalizeSuccess] = useState(false);
  const [isDAO, setIsDAO] = useState(false);
  const [challengePeriod, setChallengePeriod] = useState<number>(0);
  const [daoFee, setDaoFee] = useState<bigint>(BigInt(0));
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showOverrideSettleModal, setShowOverrideSettleModal] = useState(false);
  const [hunterRegistrationKey, setHunterRegistrationKey] = useState(0);
  
  // Track the address when transaction was submitted to prevent modal from showing after wallet change
  const transactionAddressRef = useRef<string | undefined>(undefined);
  
  const { address, isConnected } = useAccount();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  // Data fetching
  useEffect(() => {
    async function fetchQuestionData() {
      setDataLoading(true);
      try {
        const [questionData, answersData] = await Promise.all([
          readContract(publicClient, {
            address: factsContractAddress,
            abi: factsAbi,
            functionName: 'questions',
            args: [BigInt(questionId)],
          }),
          readContract(publicClient, {
            address: factsContractAddress,
            abi: factsAbi,
            functionName: 'getAnswers',
            args: [BigInt(questionId)],
          })
        ]);
        
        const mappedQuestion = { ...mapQuestionData(questionData), id: Number(questionId) };
        const mappedAnswers = mapAnswersData(answersData as Array<{ hunter: `0x${string}`; encodedAnswer: `0x${string}`; byChallenger: boolean; totalVouched: bigint }>);
        
        setQuestion(mappedQuestion);
        setAnswers(mappedAnswers);
        
        // Fetch rules from database
        try {
          const rulesData = await fetchQuestionRules(Number(questionId));
          setRules(rulesData?.rules || null);
        } catch (error) {
          console.warn("Error fetching rules (database may be unavailable):", error);
          setRules(null);
        }
        
        // Check challenge, settle, and review period status, owner, DAO status, and platform fees
        try {
          const [inChallengePeriod, afterChallengePeriod, inSettlePeriod, afterReviewPeriod, withinReviewPeriod, afterHuntPeriod, mostVouchedAnsId, contractOwner, configData, daoStatus, platformFeesData] = await Promise.all([
            readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'isWithinChallengePeriod',
              args: [BigInt(questionId)],
            }),
            readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'afterChallengePeriod',
              args: [BigInt(questionId)],
            }),
            readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'isWithinSettlePeriod',
              args: [BigInt(questionId)],
            }),
            readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'afterReviewPeriod',
              args: [BigInt(questionId)],
            }),
            readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'isWithinReviewPeriod',
              args: [BigInt(questionId)],
            }),
            readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'afterHuntPeriod',
              args: [BigInt(questionId)],
            }),
            readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'getMostVouchedAnsId',
              args: [BigInt(questionId)],
            }),
            readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'owner',
              args: [],
            }),
            readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'config',
              args: [],
            }),
            address ? readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'isDAO',
              args: [address as `0x${string}`],
            }) : Promise.resolve(false),
            readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'platformFees',
              args: [BigInt(questionId)],
            })
          ]);
          setIsInChallengePeriod(inChallengePeriod as boolean);
          setIsAfterChallengePeriod(afterChallengePeriod as boolean);
          setIsInSettlePeriod(inSettlePeriod as boolean);
          setIsAfterReviewPeriod(afterReviewPeriod as boolean);
          setIsWithinReviewPeriod(withinReviewPeriod as boolean);
          setIsAfterHuntPeriod(afterHuntPeriod as boolean);
          setMostVouchedAnsId(Number(mostVouchedAnsId));
          setIsDAO(daoStatus as boolean);
          
          // Extract challenge period from config and DAO fee from platform fees
          const systemConfig = configData[0];
          setChallengePeriod(Number(systemConfig.challengePeriod));
          setDaoFee((platformFeesData as readonly [bigint, bigint])[1]); // daoFee is the second element
        } catch (error) {
          console.error("Error checking periods and DAO status:", error);
          setIsInChallengePeriod(false);
          setIsAfterChallengePeriod(false);
          setIsInSettlePeriod(false);
          setIsAfterReviewPeriod(false);
          setIsWithinReviewPeriod(false);
          setIsAfterHuntPeriod(false);
          setMostVouchedAnsId(0);
          setIsDAO(false);
          setDaoFee(BigInt(0));
          setChallengePeriod(86400); // Default fallback
        }
        
      } catch (e) {
        console.error("Error fetching question data:", e);
        setError("Failed to fetch question data");
      } finally {
        setDataLoading(false);
      }
    }

    if (questionId) {
      fetchQuestionData();
    }
  }, [questionId, address]);

  // Reset modal state when wallet changes
  useEffect(() => {
    setShowSuccessModal(false);
    setSuccessMessage("");
    setError("");
    setPendingSources(null);
    setVouchSuccess(false);
    setChallengeSuccess(false);
    setSettleSuccess(false);
    setShowSettleModal(false);
  }, [address]);

  // Transaction success handling
  useEffect(() => {
    // Only show success modal if the address hasn't changed since transaction was submitted
    if (isSuccess && address === transactionAddressRef.current) {
      if (receipt && pendingSources) {
        // Extract answer ID from transaction receipt
        const answerId = extractAnswerIdFromReceipt(receipt);
        
        if (answerId !== null) {
          // Save sources with the real answer ID from contract
          const saveSources = async () => {
            try {
              const sourcesResponse = await saveSourcesToBackend(
                Number(questionId),
                answerId,
                pendingSources.answer,
                pendingSources.sources,
                address!
              );

              if (sourcesResponse.success) {
                setSuccessMessage("Answer submitted successfully! Sources have been saved to our database.");
              } else {
                setSuccessMessage("Answer submitted successfully! However, there was an issue saving sources to the database.");
              }
            } catch (error) {
              console.warn("Failed to save sources (database may be unavailable):", error);
              setSuccessMessage("Answer submitted successfully! However, there was an issue saving sources to the database.");
            }
            setShowSuccessModal(true);
            setError("");
            setPendingSources(null);
          };
          
          saveSources();
        } else {
          setSuccessMessage("Answer submitted successfully!");
          setShowSuccessModal(true);
          setError("");
          setPendingSources(null);
        }
      } else if (!pendingSources) {
        // Only show success modal if we don't have pending sources (to avoid duplicate modals)
        setSuccessMessage("Answer submitted successfully!");
        setShowSuccessModal(true);
        setError("");
      }
    }
  }, [isSuccess, receipt, pendingSources, questionId, address]);

  // Vouch success handling
  useEffect(() => {
    if (isSuccess && vouchSuccess && address === transactionAddressRef.current) {
      setSuccessMessage("Vouch submitted successfully! Your HYPE has been staked on this answer.");
      setShowSuccessModal(true);
      setError("");
      setVouchSuccess(false); // Reset vouch success flag
    }
  }, [isSuccess, vouchSuccess, address]);

  // Challenge success handling
  useEffect(() => {
    if (isSuccess && challengeSuccess && address === transactionAddressRef.current) {
      if (receipt && pendingSources) {
        // Extract answer ID from transaction receipt (try challenge first, then submit)
        const answerId = extractChallengeAnswerIdFromReceipt(receipt) || extractAnswerIdFromReceipt(receipt);
        
        if (answerId !== null) {
          // Save sources with the real answer ID from contract
          const saveSources = async () => {
            try {
              const sourcesResponse = await saveSourcesToBackend(
                Number(questionId),
                answerId,
                pendingSources.answer,
                pendingSources.sources,
                address!
              );

              if (sourcesResponse.success) {
                setSuccessMessage("Challenge submitted successfully! Sources have been saved to our database.");
              } else {
                setSuccessMessage("Challenge submitted successfully! However, there was an issue saving sources to the database.");
              }
            } catch (error) {
              console.warn("Failed to save challenge sources (database may be unavailable):", error);
              setSuccessMessage("Challenge submitted successfully! However, there was an issue saving sources to the database.");
            }
            setShowSuccessModal(true);
            setError("");
            setPendingSources(null);
          };
          
          saveSources();
        } else {
          setSuccessMessage("Challenge submitted successfully!");
          setShowSuccessModal(true);
          setError("");
          setPendingSources(null);
        }
      } else if (!pendingSources) {
        // Only show success modal if we don't have pending sources (to avoid duplicate modals)
        setSuccessMessage("Challenge submitted successfully!");
        setShowSuccessModal(true);
        setError("");
      }
      setChallengeSuccess(false); // Reset challenge success flag
    }
  }, [isSuccess, challengeSuccess, address, pendingSources, questionId, receipt]);

  // Settle success handling
  useEffect(() => {
    if (isSuccess && settleSuccess && address === transactionAddressRef.current) {
      setSuccessMessage("Question settled successfully!");
      setShowSuccessModal(true);
      setError("");
      setSettleSuccess(false); // Reset settle success flag
    }
  }, [isSuccess, settleSuccess, address]);

  // Finalize success handling
  useEffect(() => {
    if (isSuccess && finalizeSuccess && address === transactionAddressRef.current) {
      setSuccessMessage("Question finalized successfully!");
      setShowSuccessModal(true);
      setError("");
      setFinalizeSuccess(false); // Reset finalize success flag
    }
  }, [isSuccess, finalizeSuccess, address]);

  // Event handlers
  const handleSubmitAnswer = async (answer: string, sources: string) => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      // Store the sources for later saving with real answer ID
      setPendingSources({ answer: answer.trim(), sources });
      
      // Set the transaction address ref to track which wallet submitted the transaction
      transactionAddressRef.current = address;

      let encodedAnswer: `0x${string}`;
      
      if (question?.questionType === 0) {
        // Binary question: encode as uint (0 for No, 1 for Yes)
        const binaryValue = answer.trim().toLowerCase() === 'yes' ? 1 : 0;
        encodedAnswer = encodeAbiParameters(
          [{ type: 'uint256', name: 'answer' }],
          [BigInt(binaryValue)]
        );
      } else if (question?.questionType === 1) {
        // Number question: encode as uint
        const numberValue = parseInt(answer.trim());
        if (isNaN(numberValue)) {
          throw new Error("Please enter a valid number");
        }
        encodedAnswer = encodeAbiParameters(
          [{ type: 'uint256', name: 'answer' }],
          [BigInt(numberValue)]
        );
      } else {
        // OpenEnded question: encode as string
        encodedAnswer = encodeAbiParameters(
          [{ type: 'string', name: 'answer' }],
          [answer.trim()]
        );
      }

      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'submit',
        args: [BigInt(questionId), encodedAnswer],
      });
      
    } catch (e) {
      console.error("Error submitting answer:", e);
      setError(e instanceof Error ? e.message : "Failed to submit answer");
    } finally {
      setLoading(false);
    }
  };

  const handleVouch = async (answerId: number, amount: string) => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      // Set vouch success flag to track this transaction
      setVouchSuccess(true);
      
      // Set the transaction address ref to track which wallet submitted the transaction
      transactionAddressRef.current = address;
      
      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'vouch',
        args: [BigInt(questionId), Number(answerId)],
        value: parseEther(amount),
      });
    } catch (e) {
      console.error("Error vouching:", e);
      setError(e instanceof Error ? e.message : "Failed to vouch");
      setVouchSuccess(false); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  const handleChallenge = (challengeAnswer: string, challengeSources: string) => {
    // Store the challenge sources for later saving with real answer ID
    setPendingSources({ answer: challengeAnswer.trim(), sources: challengeSources });
    setChallengeSuccess(true); // Set flag to trigger success handling
  };

  const handleSettleClick = () => {
    // Set loading immediately when button is clicked
    setLoading(true);
    
    if (!isDAO) {
      // Non-DAO members call settle function directly without modal
      handleSettleDirect();
      return;
    }
    
    // If DAO member and no challenge is involved, call settle directly
    if (isAfterChallengePeriod && !question?.slotData.challenged) {
      handleSettleDirect();
      return;
    }
    
    // If DAO member and challenge is involved, show modal
    setLoading(false); // Reset loading since we're showing modal
    setShowSettleModal(true);
  };

  const handleSettleDirect = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError("");
    setSettleSuccess(true); // Set flag to track this transaction
    
    // Set the transaction address ref to track which wallet submitted the transaction
    transactionAddressRef.current = address;
    
    try {
      let answerId = 0;
      const challengeSucceeded = false;
      
      // If DAO member and no challenge involved, use the most vouched answer
      if (isDAO && isAfterChallengePeriod && !question?.slotData.challenged) {
        try {
          const mostVouchedAnsId = await readContract(publicClient, {
            address: factsContractAddress,
            abi: factsAbi,
            functionName: 'getMostVouchedAnsId',
            args: [BigInt(questionId)],
          });
          answerId = Number(mostVouchedAnsId);
        } catch (error) {
          console.error("Error getting most vouched answer:", error);
          // Fallback to first answer if contract call fails
          answerId = 0;
        }
      }
      
      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'settle',
        args: [
          BigInt(questionId),
          answerId,
          challengeSucceeded
        ],
      });
    } catch (e) {
      console.error("Error settling question:", e);
      setError(e instanceof Error ? e.message : "Failed to settle question");
      setSettleSuccess(false); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = (selectedAnswerId: number, challengeSucceeded: boolean) => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError("");
    setSettleSuccess(true); // Set flag to track this transaction
    
    // Set the transaction address ref to track which wallet submitted the transaction
    transactionAddressRef.current = address;
    
    try {
      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'settle',
        args: [
          BigInt(questionId),
          selectedAnswerId,
          challengeSucceeded
        ],
      });
    } catch (e) {
      console.error("Error settling question:", e);
      setError(e instanceof Error ? e.message : "Failed to settle question");
      setSettleSuccess(false); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideSettle = () => {
    // Show the override settle modal instead of calling contract directly
    setShowOverrideSettleModal(true);
  };

  const handleOverrideSettleSubmit = async (selectedAnswerId: number) => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError("");
    setSettleSuccess(true); // Set flag to track this transaction
    
    // Set the transaction address ref to track which wallet submitted the transaction
    transactionAddressRef.current = address;
    
    try {
      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'settle',
        args: [
          BigInt(questionId),
          selectedAnswerId,
          false // challengeSucceeded = false for override
        ],
      });
    } catch (e) {
      console.error("Error overriding settlement:", e);
      setError(e instanceof Error ? e.message : "Failed to override settlement");
      setSettleSuccess(false); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError("");
    setFinalizeSuccess(true); // Set flag to track this transaction
    
    // Set the transaction address ref to track which wallet submitted the transaction
    transactionAddressRef.current = address;
    
    try {
      writeContract({
        address: factsContractAddress as `0x${string}`,
        abi: factsAbi,
        functionName: 'finalize',
        args: [BigInt(questionId)],
      });
    } catch (e) {
      console.error("Error finalizing question:", e);
      setError(e instanceof Error ? e.message : "Failed to finalize question");
      setFinalizeSuccess(false); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  // Loading states
  if (!isConnected) {
    return (
      <div className="min-h-screen theme-bg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card p-8 text-center">
            <h1 className="text-2xl font-bold mb-4 theme-text-primary">Connect Your Wallet</h1>
            <p className="theme-text-secondary mb-6">
              Please connect your wallet to view and interact with questions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen theme-bg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card p-8 text-center">
            <div className="theme-text-primary">Loading question data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen theme-bg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card p-8 text-center">
            <h1 className="text-2xl font-bold mb-4 theme-text-primary">Question Not Found</h1>
                            <p className="theme-text-secondary">The question you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const isTransactionLoading = loading || isPending || isConfirming;

  return (
    <div className="min-h-screen theme-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <QuestionDetails 
          question={question} 
          rules={rules} 
          isDAO={isDAO}
          isInSettlePeriod={isInSettlePeriod}
          questionChallenged={question.slotData.challenged}
          isAfterChallengePeriod={isAfterChallengePeriod}
          isAfterReviewPeriod={isAfterReviewPeriod}
          isWithinReviewPeriod={isWithinReviewPeriod}
          isAfterHuntPeriod={isAfterHuntPeriod}
          mostVouchedAnsId={mostVouchedAnsId}
          challengePeriod={challengePeriod}
          daoFee={daoFee}
          onSettleClick={handleSettleClick}
          onOverrideSettle={handleOverrideSettle}
          onFinalize={handleFinalize}
        />
        
        {/* Hunter Status Check for Answer Submission - Only show during hunt period */}
        {Number(question.slotData.endHuntAt) > Math.floor(Date.now() / 1000) && (
          <HunterStatus 
            key={hunterRegistrationKey}
            fallback={
              <div className="card p-6 mb-8">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2 theme-text-primary">Hunter Registration Required</h3>
                  <p className="theme-text-secondary mb-4">
                    You need to register as a hunter to submit answers to this question.
                  </p>
                  <HunterRegistration onSuccess={() => {
                    // Force re-render of HunterStatus to show answer form
                    setHunterRegistrationKey(prev => prev + 1);
                  }} />
                </div>
              </div>
            }
          >
            <AnswerForm 
              onSubmit={handleSubmitAnswer}
              loading={isTransactionLoading}
              error={error}
              questionType={question.questionType}
              questionId={question.id}
            />
          </HunterStatus>
        )}

        {/* Hunt Period Ended Notice */}
        {Number(question.slotData.endHuntAt) <= Math.floor(Date.now() / 1000) && (
          <div className="card p-6 mb-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 theme-text-primary">Hunt Period Ended</h3>
              <p className="theme-text-secondary">
                The hunt period has ended. No new answers can be submitted. You can still vouch for existing answers until the challenge period begins.
              </p>
            </div>
          </div>
        )}

        <div className="card p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 theme-text-primary">Answers ({answers.length})</h2>
          
          {answers.length === 0 ? (
            <p className="theme-text-secondary">No answers yet. Be the first to answer!</p>
          ) : (
            <div className="space-y-6">
              {answers.map((answer, index) => (
                <AnswerCard 
                  key={index} 
                  answer={answer} 
                  index={index} 
                  questionType={question.questionType}
                  questionId={question.id}
                  question={question}
                />
              ))}
            </div>
          )}
        </div>

        {/* Vouching Form - Only show during hunt period */}
        {answers.length > 0 && Number(question.slotData.endHuntAt) > Math.floor(Date.now() / 1000) && (
          <VouchForm 
            answers={answers}
            onVouch={handleVouch}
            loading={isTransactionLoading}
          />
        )}

        {/* Challenge Form - Show during challenge period for multiple challengers */}
        {answers.length > 0 && isInChallengePeriod && (
          <ChallengeForm 
            questionId={question.id}
            questionType={question.questionType}
            answers={answers}
            onChallenge={handleChallenge}
            loading={isTransactionLoading}
          />
        )}

        {/* Rules Status Display */}
        {!rules && (
          <div className="card p-6 mb-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 theme-text-primary">Rules Information</h3>
              <p className="theme-text-secondary">
                No additional rules were specified for this question.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Rules are stored separately from the blockchain and may not be available if the database is temporarily unavailable.
              </p>
            </div>
          </div>
        )}

        {/* Challenge Status Display */}
        {question.slotData.challenged && (
          <div className="card p-6 mb-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 theme-text-primary">Challenge Status</h3>
              <p className="theme-text-secondary">
                {question.slotData.challengeSucceeded 
                  ? "Challenge was successful! The answer has been challenged."
                  : "Challenge was submitted and is being processed."
                }
              </p>
            </div>
          </div>
        )}


      </div>

      {/* Success Modal */}
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />

      {/* Settle Modal */}
      <SettleModal 
        isOpen={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        questionId={Number(questionId)}
        answers={answers}
        onSettle={handleSettle}
        loading={isTransactionLoading}
      />

      {/* Override Settle Modal */}
      <OverrideSettleModal 
        isOpen={showOverrideSettleModal}
        onClose={() => setShowOverrideSettleModal(false)}
        questionId={Number(questionId)}
        answers={answers}
        onOverrideSettle={handleOverrideSettleSubmit}
        loading={isTransactionLoading}
      />
    </div>
  );
}

// Settle Modal Component
const SettleModal = ({ 
  isOpen, 
  onClose, 
  questionId, 
  answers, 
  onSettle, 
  loading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  questionId: number;
  answers: Answer[];
  onSettle: (selectedAnswerId: number, challengeSucceeded: boolean) => void;
  loading: boolean;
}) => {
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [challengeSucceeded, setChallengeSucceeded] = useState<boolean>(false);

  const handleSubmit = () => {
    if (selectedAnswerId !== null) {
      onSettle(selectedAnswerId, challengeSucceeded);
      onClose();
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Settle Question
          </h3>
          <p className="text-gray-700 dark:text-gray-300">
            Select the winning answer and whether the challenge succeeded.
          </p>
        </div>

        <div className="space-y-4">
          {/* Challenge Success Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2 theme-text-primary">
              Challenge Result
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setChallengeSucceeded(false)}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all font-medium ${
                  !challengeSucceeded
                    ? "border-red-500 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 shadow-sm"
                    : "border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-500 dark:hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                }`}
              >
                Challenge Failed
              </button>
              <button
                type="button"
                onClick={() => setChallengeSucceeded(true)}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all font-medium ${
                  challengeSucceeded
                    ? "border-green-500 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 shadow-sm"
                    : "border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                }`}
              >
                Challenge Succeeded
              </button>
            </div>
          </div>

          {/* Select Answer */}
          <div>
            <label className="block text-sm font-medium mb-2 theme-text-primary">
              Select Winning Answer
            </label>
            <select
              value={selectedAnswerId !== null ? selectedAnswerId.toString() : ""}
              onChange={(e) => setSelectedAnswerId(e.target.value ? Number(e.target.value) : null)}
              className="select-modern w-full"
            >
              <option value="">Choose an answer...</option>
              {answers.map((answer, index) => (
                <option key={index} value={index}>
                  Answer #{index + 1} by {answer.hunter.slice(0, 6)}...{answer.hunter.slice(-4)}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 font-medium py-3 px-6 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-300 dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || selectedAnswerId === null}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium py-3 px-6 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Settling...
                </div>
              ) : (
                "Settle Question"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Override Settle Modal Component
const OverrideSettleModal = ({ 
  isOpen, 
  onClose, 
  questionId, 
  answers, 
  onOverrideSettle, 
  loading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  questionId: number;
  answers: Answer[];
  onOverrideSettle: (selectedAnswerId: number) => void;
  loading: boolean;
}) => {
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);

  const handleSubmit = () => {
    if (selectedAnswerId !== null) {
      onOverrideSettle(selectedAnswerId);
      onClose();
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Override Settlement
          </h3>
          <p className="text-gray-700 dark:text-gray-300">
            Select the final answer to override the settlement decision.
          </p>
        </div>

        <div className="space-y-4">
          {/* Select Answer */}
          <div>
            <label className="block text-sm font-medium mb-2 theme-text-primary">
              Select Final Answer
            </label>
            <select
              value={selectedAnswerId !== null ? selectedAnswerId.toString() : ""}
              onChange={(e) => setSelectedAnswerId(e.target.value ? Number(e.target.value) : null)}
              className="select-modern w-full"
            >
              <option value="">Choose an answer...</option>
              {answers.map((answer, index) => (
                <option key={index} value={index}>
                  Answer #{index + 1} by {answer.hunter.slice(0, 6)}...{answer.hunter.slice(-4)}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 font-medium py-3 px-6 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-300 dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || selectedAnswerId === null}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium py-3 px-6 rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Overriding...
                </div>
              ) : (
                "Override Settlement"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 