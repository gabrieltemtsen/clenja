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
// Contract addresses (set after deployment)
export const CONTRACT_ADDRESSES = {
    alfajores: {
        poolVault: process.env.NEXT_PUBLIC_CUSD_POOL_VAULT_ADDRESS as `0x${string}` | undefined, // Default to cUSD for backward compat
        riskRules: process.env.NEXT_PUBLIC_RISK_RULES_ADDRESS as `0x${string}` | undefined,
        loanManager: process.env.NEXT_PUBLIC_CUSD_LOAN_MANAGER_ADDRESS as `0x${string}` | undefined,
        cUSD: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1" as `0x${string}`,
        tokens: {
            cUSD: {
                address: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1" as `0x${string}`,
                vault: process.env.NEXT_PUBLIC_CUSD_POOL_VAULT_ADDRESS as `0x${string}` | undefined,
                manager: process.env.NEXT_PUBLIC_CUSD_LOAN_MANAGER_ADDRESS as `0x${string}` | undefined,
            },
            CELO: {
                address: "0xF194afDf50B03e69Bdc13a9900b4484137587146" as `0x${string}`,
                vault: process.env.NEXT_PUBLIC_CELO_POOL_VAULT_ADDRESS as `0x${string}` | undefined,
                manager: process.env.NEXT_PUBLIC_CELO_LOAN_MANAGER_ADDRESS as `0x${string}` | undefined,
            }
        }
    },
    celo: {
        poolVault: process.env.NEXT_PUBLIC_CUSD_POOL_VAULT_ADDRESS as `0x${string}` | undefined, // Default to cUSD
        riskRules: process.env.NEXT_PUBLIC_RISK_RULES_ADDRESS as `0x${string}` | undefined,
        loanManager: process.env.NEXT_PUBLIC_CUSD_LOAN_MANAGER_ADDRESS as `0x${string}` | undefined,
        cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`,
        tokens: {
            cUSD: {
                address: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`,
                vault: process.env.NEXT_PUBLIC_CUSD_POOL_VAULT_ADDRESS as `0x${string}` | undefined,
                manager: process.env.NEXT_PUBLIC_CUSD_LOAN_MANAGER_ADDRESS as `0x${string}` | undefined,
            },
            CELO: {
                address: "0x471EcE3750Da237f93b8E339c536989b8978a438" as `0x${string}`,
                vault: process.env.NEXT_PUBLIC_CELO_POOL_VAULT_ADDRESS as `0x${string}` | undefined,
                manager: process.env.NEXT_PUBLIC_CELO_LOAN_MANAGER_ADDRESS as `0x${string}` | undefined,
            }
        }
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
    if (typeof window === "undefined" || !(window as any).ethereum) {
        return null;
    }

    return createWalletClient({
        chain: SUPPORTED_CHAINS[chain],
        transport: custom((window as any).ethereum),
    });
}

// Get contract addresses for chain
export function getContractAddresses(chain: SupportedChain = "alfajores") {
    return CONTRACT_ADDRESSES[chain];
}
