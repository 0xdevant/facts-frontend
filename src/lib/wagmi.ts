import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { hyperevmTestnet } from "./contract";

export const config = getDefaultConfig({
  appName: "facts.hype",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [hyperevmTestnet],
  transports: {
    [hyperevmTestnet.id]: http("https://rpc.hyperliquid-testnet.xyz/evm"),
  },
  ssr: true,
});
