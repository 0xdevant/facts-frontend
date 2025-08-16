import { createPublicClient, http } from "viem";
import { defineChain } from "viem";
import { factsAbi } from "./abis/Facts";
import { iERC20Abi } from "./abis/IERC20";

export const factsContractAddress =
  "0x25C8Cc18bA28310087729a355FF884e4058f08f9";

export const hyperevmTestnet = defineChain({
  id: 998,
  name: "Hyperliquid EVM Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "HYPE",
    symbol: "HYPE",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.hyperliquid-testnet.xyz/evm"],
    },
  },
  blockExplorers: {
    default: {
      name: "Purrsec (testnet)",
      url: "https://testnet.purrsec.com/",
      apiUrl: "https://api.parsec.finance/api/",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 13051,
    },
  },
});

export const publicClient = createPublicClient({
  chain: hyperevmTestnet,
  transport: http(),
});

export { factsAbi, iERC20Abi };
