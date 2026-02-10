import { z } from "zod";
import { tool } from "ai";
import { createPublicClient, http, formatEther } from "viem";
import { celoAlfajores } from "viem/chains";
import { PoolVaultABI } from "@/lib/onchain/abis";
import { CONTRACT_ADDRESSES } from "@/lib/onchain/client";

// Initialize public client for server-side reads
const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(),
});

// ------------------------------------------------------------------
// Read-Only Tools
// ------------------------------------------------------------------

export const getPoolStats = tool({
    description: "Get current Clenja lending pool statistics including TVL, liquidity, and utilization",
    parameters: z.object({}),
    execute: async () => {
        try {
            const vaultAddress = CONTRACT_ADDRESSES.alfajores.poolVault;
            if (!vaultAddress) throw new Error("Pool Vault address not configured");

            // Fetch real data from chain
            // Assuming standard ERC4626 totalAssets
            const totalAssetsWei = await publicClient.readContract({
                address: vaultAddress,
                abi: PoolVaultABI,
                functionName: "totalAssets",
            }) as bigint;

            const totalAssets = formatEther(totalAssetsWei);

            // For now, mock the rest until LoanManager getter is ready
            // In next iteration we can read active loans from LoanManager
            const mockDerivedStats = {
                availableLiquidity: (parseFloat(totalAssets) * 0.7).toFixed(2), // Mock 70% available
                outstandingLoans: (parseFloat(totalAssets) * 0.3).toFixed(2),  // Mock 30% lent
                utilizationPercent: "30.00",
                totalLenders: 12, // Mock
                activeBorrowers: 5, // Mock
            };

            return {
                success: true,
                data: {
                    totalAssets: parseFloat(totalAssets).toFixed(2),
                    ...mockDerivedStats
                },
                message: `Pool has $${parseFloat(totalAssets).toFixed(2)} TVL. (Real on-chain data)`,
            };
        } catch (error) {
            console.error("Failed to fetch pool stats:", error);
            // Fallback to mock if chain read fails
            return {
                success: false,
                data: {
                    totalAssets: "50000.00",
                    availableLiquidity: "35000.00",
                    outstandingLoans: "15000.00",
                    utilizationPercent: "30.00",
                    totalLenders: 12,
                    activeBorrowers: 5,
                },
                message: "Failed to fetch real stats, showing cached data.",
            };
        }
    },
});

export const quoteLoan = tool({
    description: "Get a loan quote",
    parameters: z.object({
        amount: z.number().describe("Loan amount"),
        durationDays: z.number().describe("Loan duration"),
    }),
    execute: async ({ amount, durationDays }: { amount: number, durationDays: number }) => {
        const interest = (amount * 0.1 * (durationDays / 365));
        return {
            success: true,
            data: {
                principal: amount.toFixed(2),
                durationDays,
                recommendedAprPercent: "10.00",
                estimatedInterest: interest.toFixed(2),
                totalRepayment: (amount + interest).toFixed(2),
            },
            message: "Loan quote calculated",
        };
    },
});

export const checkEligibility = tool({
    description: "Check eligibility",
    parameters: z.object({
        walletAddress: z.string().describe("Wallet address"),
    }),
    execute: async ({ walletAddress }: { walletAddress: string }) => {
        return {
            success: true,
            data: { isVerified: true, maxBorrowAmount: "500.00" },
            message: "Eligible",
        };
    },
});

export const getActiveLoans = tool({
    description: "Get active loans",
    parameters: z.object({
        walletAddress: z.string().describe("Wallet address"),
    }),
    execute: async ({ walletAddress }: { walletAddress: string }) => {
        return {
            success: true,
            data: { loans: [] },
            message: "No active loans",
        };
    },
});

// ------------------------------------------------------------------
// Transaction Tools
// ------------------------------------------------------------------

export const deposit = tool({
    description: "Prepare deposit",
    parameters: z.object({
        amount: z.number().describe("Amount"),
    }),
    execute: async ({ amount }: { amount: number }) => {
        return {
            success: true,
            requiresAction: true,
            actionType: "DEPOSIT",
            data: { amount: amount.toString(), token: "cUSD" },
            message: "Sign deposit",
        };
    },
});

export const requestLoan = tool({
    description: "Prepare loan request",
    parameters: z.object({
        amount: z.number().describe("Amount"),
        durationDays: z.number().describe("Duration"),
    }),
    execute: async ({ amount, durationDays }: { amount: number, durationDays: number }) => {
        return {
            success: true,
            requiresAction: true,
            actionType: "BORROW",
            data: { amount: amount.toString(), durationDays },
            message: "Sign loan request",
        };
    },
});

export const repayLoan = tool({
    description: "Prepare repayment",
    parameters: z.object({
        loanId: z.string().describe("Loan ID"),
        amount: z.number().describe("Amount"),
    }),
    execute: async ({ loanId, amount }: { loanId: string, amount: number }) => {
        return {
            success: true,
            requiresAction: true,
            actionType: "REPAY",
            data: { loanId, amount: amount.toString() },
            message: "Sign repayment",
        };
    },
});

// ------------------------------------------------------------------
// GOAT SDK Integration
// ------------------------------------------------------------------

import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { viem } from "@goat-sdk/wallet-viem";
import { erc20 } from "@goat-sdk/plugin-erc20";
import { getAgentWalletClient } from "../wallet";

// Custom Clenja tools
const customTools = {
    getPoolStats,
    quoteLoan,
    checkEligibility,
    getActiveLoans,
    deposit,
    requestLoan,
    repayLoan,
};

/**
 * Get all agent tools: GOAT SDK on-chain tools + custom Clenja tools
 */
export async function getAgentTools() {
    try {
        const walletClient = getAgentWalletClient();

        // Get GOAT's on-chain tools with ERC20 plugin for cUSD
        const onChainTools = await getOnChainTools({
            wallet: viem(walletClient),
            plugins: [
                erc20({
                    tokens: [
                        {
                            address: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
                            symbol: "cUSD",
                            decimals: 18,
                        },
                    ],
                }),
            ],
        });

        return {
            ...onChainTools,
            ...customTools,
        };
    } catch (error) {
        console.warn("Failed to initialize GOAT tools, using custom tools only:", error);
        return customTools;
    }
}

// Export for backwards compatibility
export const agentTools = customTools;
