"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { readContract } from "viem/actions";
import { factsContractAddress, factsAbi, publicClient } from "@/lib/contract";



function StatsSection() {
  const [stats, setStats] = useState({
    questionsAsked: 0,
    answersSubmitted: 0,
    totalVouches: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        
        // Get number of questions
        const numQuestions = await readContract(publicClient, {
          address: factsContractAddress,
          abi: factsAbi,
          functionName: 'getNumOfQuestions',
          args: [],
        });

        let totalAnswers = 0;
        let totalVouches = 0;

        // Loop through all questions to get answers and vouches
        for (let i = 0; i < Number(numQuestions); i++) {
          try {
            // Get answers for this question
            const answers = await readContract(publicClient, {
              address: factsContractAddress,
              abi: factsAbi,
              functionName: 'getAnswers',
              args: [BigInt(i)],
            });

            const answersArray = answers as Array<{ hunter: `0x${string}`; encodedAnswer: `0x${string}`; byChallenger: boolean; totalVouched: bigint }>;
            totalAnswers += answersArray.length;

            // Sum up total vouches for all answers in this question
            for (const answer of answersArray) {
              totalVouches += Number(answer.totalVouched) / Math.pow(10, 18);
            }
          } catch (error) {
            // Question might not exist, continue
            continue;
          }
        }

        setStats({
          questionsAsked: Number(numQuestions),
          answersSubmitted: totalAnswers,
          totalVouches: totalVouches,
        });
        } catch {
    console.error("Error fetching stats");
  } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="card p-6 text-center">
        <div className="text-3xl font-bold text-cyan-600 mb-2">
          {loading ? "..." : stats.questionsAsked}
        </div>
        <div className="transition-colors duration-200 theme-text-secondary">Questions Asked</div>
      </div>
      <div className="card p-6 text-center">
        <div className="text-3xl font-bold text-blue-600 mb-2">
          {loading ? "..." : stats.answersSubmitted}
        </div>
        <div className="transition-colors duration-200 theme-text-secondary">Answers Submitted</div>
      </div>
      <div className="card p-6 text-center">
        <div className="text-3xl font-bold text-purple-600 mb-2">
          {loading ? "..." : stats.totalVouches.toFixed(2)}
        </div>
        <div className="transition-colors duration-200 theme-text-secondary">Total Vouches (HYPE)</div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen transition-colors duration-200 theme-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <div className="mb-6">
              <img 
                src="/logo.svg" 
                alt="facts.hype" 
                className="w-20 h-20 mx-auto"
              />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-[#35f0b3]">
              facts.hype
            </h1>
            <p className="text-xl max-w-2xl mx-auto leading-relaxed transition-colors duration-200 theme-text-secondary">
              A decentralized and actually fair market resolution system to provide crowd-sourced verification of real-world events for DApps to build on top of i.e. an open-source alternative to UMA on HyperLiquid.
            </p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Link href="/ask" className="group">
            <div className="card p-8 h-full transition-all duration-300 group-hover:scale-105">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-6 shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 transition-colors duration-200 theme-text-primary">Ask a Question</h3>
              <p className="mb-6 transition-colors duration-200 theme-text-secondary">
                Submit questions with bounties and let the community find the answers.
                Choose from binary, number, or open-ended formats.
              </p>
              <div className="button-primary inline-flex items-center">
                Start Asking
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          <Link href="/questions" className="group">
            <div className="card p-8 h-full transition-all duration-300 group-hover:scale-105">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center mb-6 shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 transition-colors duration-200 theme-text-primary">Browse Questions</h3>
              <p className="mb-6 transition-colors duration-200 theme-text-secondary">
                Explore existing questions, submit answers, and vouch for the best responses.
                Earn rewards for contributing to the knowledge base.
              </p>
              <div className="button-primary inline-flex items-center">
                Explore Questions
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats Section */}
        <StatsSection />
      </div>
    </div>
  );
}
