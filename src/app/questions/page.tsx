"use client";
import { useEffect, useState } from 'react';
import { readContract } from 'viem/actions';
import { factsContractAddress, factsAbi, publicClient } from '@/lib/contract';
import Link from "next/link";

// Types
interface Question {
  questionType: number;
  description: string;
  seeker: `0x${string}`;
  bountyToken: `0x${string}`;
  bountyAmount: bigint;
  slotData: {
    startHuntAt: number;
    endHuntAt: number;
    answerId: number;
    overthrownAnswerId: number;
    challenged: boolean;
    challengeSucceeded: boolean;
    overridden: boolean;
    finalized: boolean;
  };
}

// Utility functions
const mapQuestionData = (questionData: readonly [number, `0x${string}`, string, `0x${string}`, bigint, { startHuntAt: bigint; endHuntAt: bigint; answerId: number; overthrownAnswerId: number; challenged: boolean; challengeSucceeded: boolean; overridden: boolean; finalized: boolean }], id: number): Question & { id: number } => {
  return {
    id,
    questionType: questionData[0],
    seeker: questionData[1],
    description: questionData[2],
    bountyToken: questionData[3],
    bountyAmount: questionData[4],
    slotData: {
      startHuntAt: Number(questionData[5].startHuntAt),
      endHuntAt: Number(questionData[5].endHuntAt),
      answerId: questionData[5].answerId,
      overthrownAnswerId: questionData[5].overthrownAnswerId,
      challenged: questionData[5].challenged,
      challengeSucceeded: questionData[5].challengeSucceeded,
      overridden: questionData[5].overridden,
      finalized: questionData[5].finalized,
    }
  };
};

const getQuestionTypeLabel = (type: number): string => {
  switch (type) {
    case 0: return "Binary";
    case 1: return "Number";
    default: return "Open Ended";
  }
};

const getQuestionTypeColor = (type: number): string => {
  switch (type) {
    case 0: return "from-purple-500 to-purple-600";
    case 1: return "from-blue-500 to-blue-600";
    default: return "from-green-500 to-green-600";
  }
};

const getQuestionStatus = (question: Question & { id: number }, challengePeriodSeconds: number): { status: string; color: string } => {
  const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
  
  if (question.slotData.finalized) {
    return { status: "Finalized", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" };
  }
  
  if (question.slotData.overridden) {
    return { status: "Reviewed", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" };
  }
  
  if (question.slotData.challenged) {
    return { status: "Challenged", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" };
  }
  
  // Check if challenge period is over (endHuntAt + challenge period)
  const challengePeriodEnd = question.slotData.endHuntAt + challengePeriodSeconds;
  
  if (now > challengePeriodEnd) {
    return { status: "Settling", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
  }
  
  // Check if hunt period is over but challenge period is still active
  if (now > question.slotData.endHuntAt) {
    return { status: "Challenge Period", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
  }
  
  // Hunt period is still active
  return { status: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
};

const formatDate = (timestamp: number | undefined): string => {
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
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date unavailable';
  }
};

const formatBountyAmount = (amount: bigint): string => {
  if (amount === BigInt(0)) return 'No bounty';
  const inEther = Number(amount) / Math.pow(10, 18);
  return `${inEther.toFixed(2)} HYPE`;
};

const formatBountyAmountExact = (amount: bigint): string => {
  if (amount === BigInt(0)) return 'No bounty';
  const inEther = Number(amount) / Math.pow(10, 18);
  return `${inEther} HYPE`;
};

const truncateAddress = (address: string | undefined | null): string => {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};



// Components
const StatusBadge = ({ question, challengePeriod }: { question: Question & { id: number }; challengePeriod: number }) => {
  const { status, color } = getQuestionStatus(question, challengePeriod);
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      <div className={`w-2 h-2 rounded-full ${
        status === "Finalized" ? "bg-gray-500" :
        status === "Reviewed" ? "bg-purple-500" :
        status === "Challenged" ? "bg-orange-500" :
        status === "Settling" ? "bg-yellow-500" :
        status === "Challenge Period" ? "bg-blue-500" :
        "bg-green-500"
      }`}></div>
      {status}
    </div>
  );
};

const TypeBadge = ({ type }: { type: number }) => (
  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getQuestionTypeColor(type)} text-white`}>
    {getQuestionTypeLabel(type)}
  </div>
);

const QuestionCard = ({ question, challengePeriod }: { question: Question & { id: number }; challengePeriod: number }) => (
  <div className="card p-6 hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-3">
          <TypeBadge type={question.questionType} />
          <StatusBadge question={question} challengePeriod={challengePeriod} />
        </div>
        
        <h3 className="text-lg font-semibold theme-text-primary mb-2 line-clamp-2">
          {question.description}
        </h3>
        
        {/* <p className="text-sm theme-text-secondary mb-4">
          {truncateText(question.description, 150)}
        </p> */}
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mb-4">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <p className="text-xs theme-text-secondary">Bounty</p>
          <p className="text-sm font-medium theme-text-primary" title={formatBountyAmountExact(question.bountyAmount)}>
            {formatBountyAmount(question.bountyAmount)}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <p className="text-xs theme-text-secondary">Seeker</p>
          <p className="text-sm font-medium theme-text-primary">{truncateAddress(question.seeker)}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-xs theme-text-secondary">Hunt Period</p>
          <div className="text-sm font-medium theme-text-primary">
            <div>{formatDate(question.slotData.startHuntAt)} - {formatDate(question.slotData.endHuntAt)}</div>
          </div>
        </div>
      </div>
    </div>
    
    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="text-sm theme-text-secondary">
        Question #{question.id}
      </div>
      <Link 
        href={`/questions/${question.id}`} 
        className={`px-6 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
          question.slotData.finalized 
            ? "bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-gray-200 border-2 border-gray-400 dark:border-gray-600 hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-600 dark:hover:to-gray-500 shadow-sm"
            : getQuestionStatus(question, challengePeriod).status === "Settling"
            ? "bg-gradient-to-r from-yellow-200 to-yellow-300 dark:from-yellow-700 dark:to-yellow-600 text-yellow-900 dark:text-yellow-200 border-2 border-yellow-400 dark:border-yellow-600 hover:from-yellow-300 hover:to-yellow-400 dark:hover:from-yellow-600 dark:hover:to-yellow-500 shadow-sm"
            : "button-primary"
        }`}
      >
        {question.slotData.finalized ? "View Results" : 
         getQuestionStatus(question, challengePeriod).status === "Settling" ? "View Status" : "View & Answer"}
      </Link>
    </div>
  </div>
);

const EmptyState = ({ error }: { error: string }) => (
  <div className="card p-12 text-center">
    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-xl font-semibold theme-text-primary mb-2">
      {error ? "Error Loading Questions" : "No Questions Yet"}
    </h3>
    <p className="theme-text-secondary mb-6">
      {error ? "There was an issue loading the questions." : "Be the first to ask a question and start earning rewards!"}
    </p>
    <Link href="/ask" className="button-primary px-6 py-3">
      Ask Your First Question
    </Link>
  </div>
);

const LoadingState = () => (
  <div className="card p-12 text-center">
    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </div>
    <h3 className="text-xl font-semibold theme-text-primary mb-2">Loading Questions</h3>
    <p className="theme-text-secondary">Fetching the latest questions from the blockchain...</p>
  </div>
);

// Main component
export default function QuestionsPage() {
  const [questions, setQuestions] = useState<(Question & { id: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [challengePeriod, setChallengePeriod] = useState<number>(0);

  useEffect(() => {
    async function fetchQuestions() {
      setLoading(true);
      setError("");
      
      try {
        // Fetch contract config to get challenge period
        const config = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'config',
        });
        
        const systemConfig = config[0]; // First element is systemConfig
        const challengePeriodSeconds = Number(systemConfig.challengePeriod);
        setChallengePeriod(challengePeriodSeconds);
        
        // Find the actual number of questions by checking incrementally
        let maxQuestionId = -1;
        const maxAttempts = 20; // Try up to 20 questions to find the actual count
        
        for (let i = 0; i < maxAttempts; i++) {
          try {
            await readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'questions',
              args: [BigInt(i)],
            });
            maxQuestionId = i;
          } catch (error) {
            // Question doesn't exist, we've found the end
            break;
          }
        }
        
        if (maxQuestionId === -1) {
          console.warn("No questions found in contract");
          setQuestions([]);
          setQuestionCount(0);
          return;
        }
        
        // Now fetch all valid questions
        const questionPromises = Array.from({ length: maxQuestionId + 1 }, (_, i) => 
          readContract(publicClient, {
            address: factsContractAddress,
            abi: factsAbi,
            functionName: 'questions',
            args: [BigInt(i)],
          }).then((result) => {
            return { result, index: i };
          }).catch((error) => {
            console.error(`Failed to fetch question ${i}:`, error);
            return null;
          })
        );

        const results = await Promise.all(questionPromises);
        
        const validQuestions = results
          .filter((item): item is { result: readonly [number, `0x${string}`, string, `0x${string}`, bigint, { startHuntAt: bigint; endHuntAt: bigint; answerId: number; overthrownAnswerId: number; challenged: boolean; challengeSucceeded: boolean; overridden: boolean; finalized: boolean }]; index: number } => item !== null)
          .map(({ result, index }) => {
            const questionData = mapQuestionData(result, index);
            return questionData;
          });

        setQuestions(validQuestions);
        setQuestionCount(validQuestions.length);
        
      } catch (e) {
        console.error("Error fetching questions:", e);
        setError("Failed to fetch questions");
      } finally {
        setLoading(false);
      }
    }

    fetchQuestions();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen theme-bg">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <LoadingState />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold theme-text-primary mb-2">Browse Questions</h1>
              <p className="theme-text-secondary">Discover questions and earn rewards by providing answers</p>
            </div>
            <Link href="/ask" className="button-primary px-6 py-3">
              Ask Question
            </Link>
          </div>
          
          <div className="flex items-center gap-4 text-sm theme-text-secondary">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
              <span>{questionCount} questions found</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full"></div>
              <span>Active rewards available</span>
            </div>
          </div>
        </div>

        {/* Questions Grid */}
        {questions.length === 0 ? (
          <EmptyState error={error} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {questions.map((question) => (
              <QuestionCard key={question.id} question={question} challengePeriod={challengePeriod} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 