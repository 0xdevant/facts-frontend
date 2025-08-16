"use client";
import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { RainbowKitProvider, ConnectButton, lightTheme, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
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
                <nav className="hidden md:flex items-center space-x-6">
                  <Link href="/ask" className="theme-text-primary hover:text-cyan-500 transition-colors">
                    Ask Question
                  </Link>
                  <Link href="/questions" className="theme-text-primary hover:text-cyan-500 transition-colors">
                    Browse Questions
                  </Link>
                  <Link href="/dashboard" className="theme-text-primary hover:text-cyan-500 transition-colors">
                    Dashboard
                  </Link>
                </nav>
                <div className="flex items-center gap-3">
                  <ConnectButton />
                  <ThemeToggle onThemeChange={handleThemeChange} />
                </div>
              </div>
            </div>
          </header>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 