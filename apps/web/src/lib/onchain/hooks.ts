"use client";

import { useState, useCallback, useEffect } from "react";
import { formatEther, type Address, erc20Abi } from "viem";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getContractAddresses, type SupportedChain } from "./client";
import { poolVaultAbi, loanManagerAbi } from "./abis";

// ============ Wallet Connection ============

export function useWallet() {
    const { address, isConnected, isConnecting } = useAccount();
    const { openConnectModal } = useConnectModal();

    // Wrapper for connect to match previous interface, but uses RainbowKit modal
    const connect = useCallback(() => {
        if (openConnectModal) {
            openConnectModal();
        }
    }, [openConnectModal]);

    // Disconnect is handled by RainbowKit UI usually, but we can expose it if needed via useDisconnect
    // For now, matching the interface
    const disconnect = useCallback(() => {
        // No-op, let RainbowKit handle it via UI
    }, []);

    return {
        address,
        isConnecting,
        isConnected,
        error: null, // Wagmi handles errors in its UI mostly
        connect,
        disconnect
    };
}

// ============ Pool Stats ============

export interface PoolStats {
    totalAssets: bigint;
    availableLiquidity: bigint;
    outstandingLoans: bigint;
    utilizationBps: bigint;
    totalShares: bigint;
}

export function usePoolStats(chain: SupportedChain = "celo") {
    // We default to Celo Mainnet logic if not specified, but Wagmi handles chain via provider
    // Note: getContractAddresses depends on "chain" which might be different from connected chain.
    // Ideally we should use the chain form Wagmi or passed in arg.
    const addresses = getContractAddresses(chain);

    const { data: totalAssets } = useReadContract({
        address: addresses.poolVault,
        abi: poolVaultAbi,
        functionName: "totalAssets",
        query: { refetchInterval: 10000 }
    });

    const { data: availableLiquidity } = useReadContract({
        address: addresses.poolVault,
        abi: poolVaultAbi,
        functionName: "availableLiquidity",
        query: { refetchInterval: 10000 }
    });

    const { data: outstandingLoans } = useReadContract({
        address: addresses.poolVault,
        abi: poolVaultAbi,
        functionName: "outstandingLoans",
        query: { refetchInterval: 10000 }
    });

    const { data: utilizationBps } = useReadContract({
        address: addresses.poolVault,
        abi: poolVaultAbi,
        functionName: "utilizationBps",
        query: { refetchInterval: 10000 }
    });

    const { data: totalShares } = useReadContract({
        address: addresses.poolVault,
        abi: poolVaultAbi,
        functionName: "totalShares",
        query: { refetchInterval: 10000 }
    });

    const stats: PoolStats | null = (totalAssets !== undefined && availableLiquidity !== undefined &&
        outstandingLoans !== undefined && utilizationBps !== undefined &&
        totalShares !== undefined)
        ? {
            totalAssets: totalAssets as bigint,
            availableLiquidity: availableLiquidity as bigint,
            outstandingLoans: outstandingLoans as bigint,
            utilizationBps: utilizationBps as bigint,
            totalShares: totalShares as bigint,
        }
        : null;

    return {
        stats,
        isLoading: !stats,
        error: null,
        refresh: () => { } // Wagmi handles refreshing via refetchInterval or query invalidation
    };
}

// ============ User Balance & Shares ============

export function useUserBalance(address: Address | null | undefined, chain: SupportedChain = "celo") {
    const addresses = getContractAddresses(chain);

    const { data: cUSDBalance, refetch: refetchBalance } = useReadContract({
        address: addresses.cUSD,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: { enabled: !!address, refetchInterval: 10000 }
    });

    const { data: shares, refetch: refetchShares } = useReadContract({
        address: addresses.poolVault,
        abi: poolVaultAbi,
        functionName: "shares",
        args: address ? [address] : undefined,
        query: { enabled: !!address, refetchInterval: 10000 }
    });

    const { data: shareValue, refetch: refetchShareValue } = useReadContract({
        address: addresses.poolVault,
        abi: poolVaultAbi,
        functionName: "convertToAssets",
        args: shares ? [shares] : undefined,
        query: { enabled: !!shares && (shares > 0n) }
    });

    const refresh = useCallback(() => {
        refetchBalance();
        refetchShares();
        refetchShareValue();
    }, [refetchBalance, refetchShares, refetchShareValue]);

    return {
        cUSDBalance: (cUSDBalance as bigint) || 0n,
        shares: (shares as bigint) || 0n,
        shareValue: (shareValue as bigint) || 0n,
        isLoading: false,
        refresh
    };
}

// ============ Deposit ============

export function useDeposit(chain: SupportedChain = "celo") {
    const addresses = getContractAddresses(chain);
    const { writeContractAsync, isPending: isWritePending } = useWriteContract();
    const [txHash, setTxHash] = useState<string | null>(null);
    const [isApproving, setIsApproving] = useState(false);
    const [isDepositing, setIsDepositing] = useState(false);

    // Watch transaction
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash as `0x${string}`,
    });

    const deposit = useCallback(async (amount: bigint, receiver: Address) => {
        if (!addresses.poolVault) throw new Error("Pool vault not configured");

        try {
            // 1. Approve
            setIsApproving(true);
            const approveHash = await writeContractAsync({
                address: addresses.cUSD,
                abi: erc20Abi,
                functionName: "approve",
                args: [addresses.poolVault, amount],
            });
            // We need to wait for approval receipt before depositing
            // Ideally we'd have a separate wait here, but for now we'll rely on the UI or optimistically proceed/wait
            // actually we should wait. 
            // Since we can't easily wait inside this callback without a publicClient, 
            // we should probably split this or use a publicClient.
            // But let's assume we can just fire the second tx after the first? No, nonce issues.
            // We need public client to wait.
        } catch (err) {
            console.error(err);
            throw err;
        } finally {
            setIsApproving(false);
        }
    }, [addresses, writeContractAsync]);

    // Refactored Deposit Hook using Wagmi safely
    // Since we need to wait for approval, we should probably just return the write functions 
    // and let the UI handle the 2-step process or use a custom implementation with publicClient
    // Let's use the publicClient to wait.

    return useDepositImplementation(chain);
}

function useDepositImplementation(chain: SupportedChain) {
    const addresses = getContractAddresses(chain);
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();
    const [status, setStatus] = useState<"idle" | "approving" | "depositing" | "success" | "error">("idle");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const deposit = useCallback(async (amount: bigint, receiver: Address) => {
        if (!addresses.poolVault || !publicClient) return;

        setStatus("approving");
        setError(null);

        try {
            // 1. Approve
            const approveHash = await writeContractAsync({
                address: addresses.cUSD,
                abi: erc20Abi,
                functionName: "approve",
                args: [addresses.poolVault, amount],
            });

            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            // 2. Deposit
            setStatus("depositing");
            const depositHash = await writeContractAsync({
                address: addresses.poolVault,
                abi: poolVaultAbi,
                functionName: "deposit",
                args: [amount, receiver],
            });

            setTxHash(depositHash);
            await publicClient.waitForTransactionReceipt({ hash: depositHash });
            setStatus("success");
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Transaction failed");
            setStatus("error");
        }
    }, [addresses, publicClient, writeContractAsync]);

    return {
        deposit,
        isApproving: status === "approving",
        isDepositing: status === "depositing", // covers waiting for receipt
        error,
        txHash
    };
}

// ============ Withdraw ============

export function useWithdraw(chain: SupportedChain = "celo") {
    const addresses = getContractAddresses(chain);
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const withdraw = useCallback(async (amount: bigint, receiver: Address, owner: Address) => {
        if (!addresses.poolVault || !publicClient) return;

        setIsWithdrawing(true);
        setError(null);
        setTxHash(null);

        try {
            const hash = await writeContractAsync({
                address: addresses.poolVault,
                abi: poolVaultAbi,
                functionName: "withdraw",
                args: [amount, receiver, owner],
            });

            setTxHash(hash);
            await publicClient.waitForTransactionReceipt({ hash });
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Withdrawal failed");
        } finally {
            setIsWithdrawing(false);
        }
    }, [addresses, publicClient, writeContractAsync]);

    return { withdraw, isWithdrawing, error, txHash };
}

// ============ Loan Operations ============

export interface Loan {
    id: bigint;
    borrower: Address;
    principal: bigint;
    aprBps: bigint;
    startTime: bigint;
    duration: bigint;
    principalRepaid: bigint;
    interestPaid: bigint;
    active: boolean;
    disbursed: boolean;
}

export function useUserLoans(address: Address | null | undefined, chain: SupportedChain = "celo") {
    const addresses = getContractAddresses(chain);
    const publicClient = usePublicClient();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // We can't easily use useReadContract for dynamic array of structs unless we have a multicall helper
    // So we'll keep the manual fetch logic but use publicClient from Wagmi

    const refresh = useCallback(async () => {
        if (!address || !addresses.loanManager || !publicClient) return;

        try {
            setIsLoading(true);

            // Fetch total loan count
            const count = await publicClient.readContract({
                address: addresses.loanManager,
                abi: loanManagerAbi,
                functionName: "loanCount",
            }) as bigint;

            if (count === 0n) {
                setLoans([]);
                return;
            }

            // Fetch all loans and filter (inefficient but works for MVP)
            // In production, use The Graph or an indexer
            const loanPromises = [];
            for (let i = 1n; i <= count; i++) {
                loanPromises.push(publicClient.readContract({
                    address: addresses.loanManager!,
                    abi: loanManagerAbi,
                    functionName: "loans", // "loans" mapping, not getLoan (struct access might be different)
                    args: [i],
                }));
            }

            const results = await Promise.all(loanPromises);

            const userLoans = results
                .map((loanData: any, index) => {
                    // Map result to Loan object
                    // Solc mapping returns tuple values, not struct object usually
                    // mapping(uint256 => Loan) public loans;
                    // Returns: (borrower, principal, principalRepaid, interestPaid, aprBps, startTime, duration, lastPaymentTime, metadataHash, active, disbursed)
                    return {
                        id: BigInt(index + 1),
                        borrower: loanData[0],
                        principal: loanData[1],
                        principalRepaid: loanData[2],
                        interestPaid: loanData[3],
                        aprBps: loanData[4],
                        startTime: loanData[6], // Skip startTime? No, wait. 
                        // Struct: borrower, principal, principalRepaid, interestPaid, aprBps, startTime, duration, lastPaymentTime, metadataHash, active, disbursed
                        // Indices: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
                        duration: loanData[6],
                        active: loanData[9],
                        disbursed: loanData[10],
                    };
                })
                .filter(loan => loan.borrower.toLowerCase() === address.toLowerCase());

            // Fix mapping indices:
            // 0: borrower
            // 1: principal
            // 2: principalRepaid
            // 3: interestPaid
            // 4: aprBps
            // 5: startTime
            // 6: duration
            // 7: lastPaymentTime
            // 8: metadataHash
            // 9: active
            // 10: disbursed

            const mappedLoans = results.map((loanData: any, index) => ({
                id: BigInt(index + 1),
                borrower: loanData[0],
                principal: loanData[1],
                principalRepaid: loanData[2],
                interestPaid: loanData[3],
                aprBps: loanData[4],
                startTime: loanData[5],
                duration: loanData[6],
                active: loanData[9],
                disbursed: loanData[10],
            })).filter(l => l.borrower.toLowerCase() === address.toLowerCase());

            setLoans(mappedLoans);
        } catch (err) {
            console.error("Failed to fetch loans:", err);
        } finally {
            setIsLoading(false);
        }
    }, [address, addresses, publicClient]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { loans, isLoading, refresh };
}

export function useRepayLoan(chain: SupportedChain = "celo") {
    const addresses = getContractAddresses(chain);
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();
    const [status, setStatus] = useState<"idle" | "approving" | "repaying" | "success" | "error">("idle");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const repay = useCallback(async (loanId: bigint, amount: bigint) => {
        if (!addresses.loanManager || !publicClient) return;

        setStatus("approving");
        setError(null);
        setTxHash(null);

        try {
            // 1. Approve
            const approveHash = await writeContractAsync({
                address: addresses.cUSD,
                abi: erc20Abi,
                functionName: "approve",
                args: [addresses.loanManager, amount],
            });
            await publicClient.waitForTransactionReceipt({ hash: approveHash });

            // 2. Repay
            setStatus("repaying");
            const repayHash = await writeContractAsync({
                address: addresses.loanManager,
                abi: loanManagerAbi,
                functionName: "repay",
                args: [loanId, amount],
            });

            setTxHash(repayHash);
            await publicClient.waitForTransactionReceipt({ hash: repayHash });
            setStatus("success");
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Repayment failed");
            setStatus("error");
        }
    }, [addresses, publicClient, writeContractAsync]);

    return {
        repay,
        isApproving: status === "approving",
        isRepaying: status === "repaying",
        error,
        txHash
    };
}

// ============ Helpers ============

export function formatCUSD(amount: bigint): string {
    return `$${parseFloat(formatEther(amount)).toFixed(2)}`;
}

export function formatPercent(bps: bigint): string {
    return `${(Number(bps) / 100).toFixed(2)}%`;
}
