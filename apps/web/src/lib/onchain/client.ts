import { createPublicClient, createWalletClient, http, custom } from "viem";
import { celoAlfajores, celo } from "viem/chains";

// Chain configuration
export const SUPPORTED_CHAINS = {
    alfajores: celoAlfajores,
    celo: celo,
} as const;

export type SupportedChain = keyof typeof SUPPORTED_CHAINS;

// Default to Alfajores for development
export const DEFAULT_CHAIN = SUPPORTED_CHAINS.alfajores;

// Contract addresses (set after deployment)
export const CONTRACT_ADDRESSES = {
    alfajores: {
        poolVault: process.env.NEXT_PUBLIC_POOL_VAULT_ADDRESS as `0x${string}` | undefined,
        riskRules: process.env.NEXT_PUBLIC_RISK_RULES_ADDRESS as `0x${string}` | undefined,
        loanManager: process.env.NEXT_PUBLIC_LOAN_MANAGER_ADDRESS as `0x${string}` | undefined,
        cUSD: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1" as `0x${string}`,
    },
    celo: {
        poolVault: process.env.NEXT_PUBLIC_POOL_VAULT_ADDRESS as `0x${string}` | undefined,
        riskRules: process.env.NEXT_PUBLIC_RISK_RULES_ADDRESS as `0x${string}` | undefined,
        loanManager: process.env.NEXT_PUBLIC_LOAN_MANAGER_ADDRESS as `0x${string}` | undefined,
        cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`,
    },
};

// Create public client for reading chain state
export function getPublicClient(chain: SupportedChain = "alfajores") {
    return createPublicClient({
        chain: SUPPORTED_CHAINS[chain],
        transport: http(),
    });
}

// Create wallet client for transactions (browser only)
export function getWalletClient(chain: SupportedChain = "alfajores") {
    if (typeof window === "undefined" || !window.ethereum) {
        return null;
    }

    return createWalletClient({
        chain: SUPPORTED_CHAINS[chain],
        transport: custom(window.ethereum),
    });
}

// Get contract addresses for chain
export function getContractAddresses(chain: SupportedChain = "alfajores") {
    return CONTRACT_ADDRESSES[chain];
}
