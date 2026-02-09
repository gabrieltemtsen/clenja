import { z } from "zod";
import { tool } from "ai";
import { formatEther } from "viem";

// Pool statistics tool
export const getPoolStats = tool({
    description: "Get current Clenja lending pool statistics including total value locked, available liquidity, outstanding loans, and utilization rate",
    parameters: z.object({}),
    execute: async () => {
        // In production, this would call the actual contract
        // For now, return mock data that would come from the pool
        const mockStats = {
            totalAssets: "50000.00",
            availableLiquidity: "35000.00",
            outstandingLoans: "15000.00",
            utilizationPercent: "30.00",
            totalLenders: 12,
            activeBorrowers: 5,
        };

        return {
            success: true,
            data: mockStats,
            message: `Pool has $${mockStats.totalAssets} TVL with ${mockStats.utilizationPercent}% utilization. $${mockStats.availableLiquidity} available for new loans.`,
        };
    },
} as any);

// Quote loan terms tool
export const quoteLoan = tool({
    description: "Get a quote for a loan with estimated interest and recommended terms based on the borrower's request",
    parameters: z.object({
        amount: z.number().describe("Loan amount in cUSD (e.g., 100 for $100)"),
        durationDays: z.number().describe("Loan duration in days (7-90)"),
    }),
    execute: async ({ amount, durationDays }: { amount: number, durationDays: number }) => {
        // Validate inputs
        if (amount < 10 || amount > 10000) {
            return {
                success: false,
                error: "Loan amount must be between $10 and $10,000",
            };
        }

        if (durationDays < 7 || durationDays > 90) {
            return {
                success: false,
                error: "Duration must be between 7 and 90 days",
            };
        }

        // Calculate recommended APR based on amount and duration
        // Higher amounts and longer durations = slightly higher APR
        const baseApr = 10; // 10% base
        const amountFactor = (amount / 10000) * 2; // Up to 2% for max amount
        const durationFactor = (durationDays / 90) * 3; // Up to 3% for max duration
        const recommendedApr = Math.min(30, Math.max(5, baseApr + amountFactor + durationFactor));

        // Calculate interest
        const interest = (amount * (recommendedApr / 100) * (durationDays / 365));
        const totalRepayment = amount + interest;
        const agentFee = interest * 0.1; // 10% of interest

        return {
            success: true,
            data: {
                principal: amount.toFixed(2),
                durationDays,
                recommendedAprPercent: recommendedApr.toFixed(2),
                estimatedInterest: interest.toFixed(2),
                totalRepayment: totalRepayment.toFixed(2),
                agentFee: agentFee.toFixed(2),
                lenderYield: (interest - agentFee).toFixed(2),
            },
            message: `For a $${amount} loan over ${durationDays} days at ${recommendedApr.toFixed(1)}% APR: you'll repay $${totalRepayment.toFixed(2)} (principal + $${interest.toFixed(2)} interest).`,
        };
    },
} as any);

// Check borrower eligibility tool
export const checkEligibility = tool({
    description: "Check if a wallet address is eligible to borrow from the Clenja pool (verification status and borrowing capacity)",
    parameters: z.object({
        walletAddress: z.string().describe("The borrower's Ethereum wallet address"),
    }),
    execute: async ({ walletAddress }: { walletAddress: string }) => {
        // Validate address format
        if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            return {
                success: false,
                error: "Invalid wallet address format",
            };
        }

        // Mock verification check - in production would call verifier contract
        const isVerified = true; // Assume verified for demo
        const maxBorrowAmount = 500; // 5% of mock 10k pool
        const currentBorrowed = 0;
        const availableToBorrow = maxBorrowAmount - currentBorrowed;

        return {
            success: true,
            data: {
                walletAddress,
                isVerified,
                maxBorrowAmount: maxBorrowAmount.toFixed(2),
                currentBorrowed: currentBorrowed.toFixed(2),
                availableToBorrow: availableToBorrow.toFixed(2),
            },
            message: isVerified
                ? `Wallet is verified and can borrow up to $${availableToBorrow.toFixed(2)}.`
                : "Wallet is not verified. Complete verification through SelfClaw to enable borrowing.",
        };
    },
} as any);

// Get active loans tool
export const getActiveLoans = tool({
    description: "Get all active loans for a wallet address including repayment status and amounts owed",
    parameters: z.object({
        walletAddress: z.string().describe("The borrower's wallet address"),
    }),
    execute: async ({ walletAddress }: { walletAddress: string }) => {
        if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            return {
                success: false,
                error: "Invalid wallet address format",
            };
        }

        // Mock loans - in production would query contract
        const mockLoans = [
            {
                id: "1",
                principal: "100.00",
                aprPercent: "12.00",
                startDate: "2024-01-15",
                dueDate: "2024-02-14",
                principalRepaid: "50.00",
                interestPaid: "0.50",
                remainingPrincipal: "50.00",
                accruedInterest: "0.82",
                totalOwed: "50.82",
            },
        ];

        if (mockLoans.length === 0) {
            return {
                success: true,
                data: { loans: [] },
                message: "No active loans found for this wallet.",
            };
        }

        return {
            success: true,
            data: { loans: mockLoans },
            message: `Found ${mockLoans.length} active loan(s). Total owed: $${mockLoans.reduce((sum, l) => sum + parseFloat(l.totalOwed), 0).toFixed(2)}.`,
        };
    },
} as any);

// Calculate repayment tool
export const calculateRepayment = tool({
    description: "Calculate the exact repayment amount needed to fully close a loan, including all accrued interest",
    parameters: z.object({
        loanId: z.string().describe("The loan ID to calculate repayment for"),
    }),
    execute: async ({ loanId }: { loanId: string }) => {
        // Mock calculation - in production would call contract
        const loan = {
            id: loanId,
            remainingPrincipal: "50.00",
            accruedInterest: "0.82",
            totalToClose: "50.82",
        };

        return {
            success: true,
            data: loan,
            message: `Loan #${loanId} requires $${loan.totalToClose} to fully close ($${loan.remainingPrincipal} principal + $${loan.accruedInterest} interest).`,
        };
    },
} as any);

// Export all tools
export const agentTools = {
    getPoolStats,
    quoteLoan,
    checkEligibility,
    getActiveLoans,
    calculateRepayment,
};
