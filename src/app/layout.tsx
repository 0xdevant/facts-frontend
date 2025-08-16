import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import RainbowKitClientProvider from "./RainbowKitClientProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "facts.hype",
  description: "Ask questions, get answers, earn rewards",
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RainbowKitClientProvider>
          {children}
        </RainbowKitClientProvider>
      </body>
    </html>
  );
}
