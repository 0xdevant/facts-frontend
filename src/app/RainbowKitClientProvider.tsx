"use client";
import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { RainbowKitProvider, ConnectButton, lightTheme, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { readContract } from 'viem/actions';
import { config } from '@/lib/wagmi';
import { factsContractAddress, factsAbi, publicClient } from '@/lib/contract';
import '@rainbow-me/rainbowkit/styles.css';

function ThemeToggle({ onThemeChange }: { onThemeChange: (isDark: boolean) => void }) {
  // Simple theme toggle using localStorage and html class
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);
  
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      onThemeChange(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      onThemeChange(true);
    }
  };
  
  return (
    <button
      onClick={toggleTheme}
      className="button-secondary"
      aria-label="Toggle dark mode"
      type="button"
    >
      🌓
    </button>
  );
}

// Create a client
const queryClient = new QueryClient();

function Header({ isDarkMode, onThemeChange }: { isDarkMode: boolean; onThemeChange: (isDark: boolean) => void }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const { isConnected, address } = useAccount();

  // Check if user is owner
  useEffect(() => {
    async function checkOwner() {
      if (!isConnected || !address) {
        setIsOwner(false);
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
      }
    }

    checkOwner();
  }, [isConnected, address]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-200 theme-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <img 
              src={isDarkMode ? "/logo_type_white.svg" : "/logo_type_black.svg"} 
              alt="facts.hype" 
              className="h-8 w-auto"
            />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/ask" className="theme-text-primary hover:text-cyan-500 transition-colors">
              Ask Question
            </Link>
            <Link href="/questions" className="theme-text-primary hover:text-cyan-500 transition-colors">
              Browse Questions
            </Link>
            {isConnected && (
              <Link href="/dashboard" className="theme-text-primary hover:text-cyan-500 transition-colors">
                Dashboard
              </Link>
            )}
            {isOwner && (
              <Link href="/admin" className="theme-text-primary hover:text-red-500 transition-colors font-medium">
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="[&_.rainbow-kit-connect-button]:!text-sm [&_.rainbow-kit-connect-button]:!px-3 [&_.rainbow-kit-connect-button]:!py-2 [&_.rainbow-kit-connect-button]:!h-9 md:[&_.rainbow-kit-connect-button]:!text-base md:[&_.rainbow-kit-connect-button]:!px-4 md:[&_.rainbow-kit-connect-button]:!py-2 md:[&_.rainbow-kit-connect-button]:!h-10">
              <ConnectButton />
            </div>
            <div className="hidden md:block">
              <ThemeToggle onThemeChange={onThemeChange} />
            </div>
            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-md theme-text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle mobile menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
            <nav className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/ask"
                className="block px-3 py-2 rounded-md text-base font-medium theme-text-primary hover:text-cyan-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Ask Question
              </Link>
              <Link
                href="/questions"
                className="block px-3 py-2 rounded-md text-base font-medium theme-text-primary hover:text-cyan-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Browse Questions
              </Link>
              {isConnected && (
                <Link
                  href="/dashboard"
                  className="block px-3 py-2 rounded-md text-base font-medium theme-text-primary hover:text-cyan-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              {isOwner && (
                <Link
                  href="/admin"
                  className="block px-3 py-2 rounded-md text-base font-medium theme-text-primary hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-700 mt-2 pt-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <div className="px-3 py-2">
                  <ThemeToggle onThemeChange={onThemeChange} />
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default function RainbowKitClientProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('theme');
      setIsDarkMode(theme === 'dark');
    }
  }, []);

  const handleThemeChange = (isDark: boolean) => {
    setIsDarkMode(isDark);
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={isDarkMode ? darkTheme() : lightTheme()}
          modalSize="compact"
          locale="en-US"
        >
          <Header isDarkMode={isDarkMode} onThemeChange={handleThemeChange} />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 