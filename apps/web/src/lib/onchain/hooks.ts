"use client";

import { useState, useEffect, useCallback } from "react";
import { formatEther, parseEther, type Address } from "viem";
import { getPublicClient, getWalletClient, getContractAddresses, type SupportedChain } from "./client";
import { poolVaultAbi, loanManagerAbi, erc20Abi } from "./abis";

// ============ Wallet Connection ============

export function useWallet() {
    const [address, setAddress] = useState<Address | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const connect = useCallback(async () => {
        if (typeof window === "undefined" || !window.ethereum) {
            setError("Please install a wallet like MetaMask");
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            }) as Address[];

            if (accounts.length > 0) {
                setAddress(accounts[0]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to connect");
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        setAddress(null);
    }, []);

    // Listen for account changes
    useEffect(() => {
        if (typeof window === "undefined" || !window.ethereum) return;

        const handleAccountsChanged = (accounts: Address[]) => {
            if (accounts.length === 0) {
                setAddress(null);
            } else {
                setAddress(accounts[0]);
            }
        };

        window.ethereum.on("accountsChanged", handleAccountsChanged);
        return () => {
            window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
        };
    }, []);

    return { address, isConnecting, error, connect, disconnect };
}

// ============ Pool Stats ============

export interface PoolStats {
    totalAssets: bigint;
    availableLiquidity: bigint;
    outstandingLoans: bigint;
    utilizationBps: bigint;
    totalShares: bigint;
}

export function usePoolStats(chain: SupportedChain = "alfajores") {
    const [stats, setStats] = useState<PoolStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        const addresses = getContractAddresses(chain);
        if (!addresses.poolVault) {
            setError("Pool vault address not configured");
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const client = getPublicClient(chain);

            const [totalAssets, availableLiquidity, outstandingLoans, utilizationBps, totalShares] =
                await Promise.all([
                    client.readContract({ address: addresses.poolVault, abi: poolVaultAbi, functionName: "totalAssets" }),
                    client.readContract({ address: addresses.poolVault, abi: poolVaultAbi, functionName: "availableLiquidity" }),
                    client.readContract({ address: addresses.poolVault, abi: poolVaultAbi, functionName: "outstandingLoans" }),
                    client.readContract({ address: addresses.poolVault, abi: poolVaultAbi, functionName: "utilizationBps" }),
                    client.readContract({ address: addresses.poolVault, abi: poolVaultAbi, functionName: "totalShares" }),
                ]);

            setStats({
                totalAssets: totalAssets as bigint,
                availableLiquidity: availableLiquidity as bigint,
                outstandingLoans: outstandingLoans as bigint,
                utilizationBps: utilizationBps as bigint,
                totalShares: totalShares as bigint,
            });
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch pool stats");
        } finally {
            setIsLoading(false);
        }
    }, [chain]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { stats, isLoading, error, refresh };
}

// ============ User Balance & Shares ============

export function useUserBalance(address: Address | null, chain: SupportedChain = "alfajores") {
    const [cUSDBalance, setCUSDBalance] = useState<bigint>(0n);
    const [shares, setShares] = useState<bigint>(0n);
    const [shareValue, setShareValue] = useState<bigint>(0n);
    const [isLoading, setIsLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!address) return;

        const addresses = getContractAddresses(chain);
        if (!addresses.poolVault) return;

        try {
            setIsLoading(true);
            const client = getPublicClient(chain);

            const [balance, userShares] = await Promise.all([
                client.readContract({ address: addresses.cUSD, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
                client.readContract({ address: addresses.poolVault, abi: poolVaultAbi, functionName: "shares", args: [address] }),
            ]);

            setCUSDBalance(balance as bigint);
            setShares(userShares as bigint);

            if ((userShares as bigint) > 0n) {
                const value = await client.readContract({
                    address: addresses.poolVault,
                    abi: poolVaultAbi,
                    functionName: "convertToAssets",
                    args: [userShares as bigint],
                });
                setShareValue(value as bigint);
            } else {
                setShareValue(0n);
            }
        } catch (err) {
            console.error("Failed to fetch user balance:", err);
        } finally {
            setIsLoading(false);
        }
    }, [address, chain]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { cUSDBalance, shares, shareValue, isLoading, refresh };
}

// ============ Deposit ============

export function useDeposit(chain: SupportedChain = "alfajores") {
    const [isApproving, setIsApproving] = useState(false);
    const [isDepositing, setIsDepositing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    const deposit = useCallback(async (amount: bigint, receiver: Address) => {
        const addresses = getContractAddresses(chain);
        if (!addresses.poolVault) {
            setError("Pool vault not configured");
            return;
        }

        const walletClient = getWalletClient(chain);
        if (!walletClient) {
            setError("Wallet not connected");
            return;
        }

        setError(null);
        setTxHash(null);

        try {
            // Get account
            const [account] = await walletClient.getAddresses();

            // Approve cUSD
            setIsApproving(true);
            const approveTx = await walletClient.writeContract({
                address: addresses.cUSD,
                abi: erc20Abi,
                functionName: "approve",
                args: [addresses.poolVault, amount],
                account,
            });

            // Wait for approval
            const publicClient = getPublicClient(chain);
            await publicClient.waitForTransactionReceipt({ hash: approveTx });
            setIsApproving(false);

            // Deposit
            setIsDepositing(true);
            const depositTx = await walletClient.writeContract({
                address: addresses.poolVault,
                abi: poolVaultAbi,
                functionName: "deposit",
                args: [amount, receiver],
                account,
            });

            setTxHash(depositTx);
            await publicClient.waitForTransactionReceipt({ hash: depositTx });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Deposit failed");
        } finally {
            setIsApproving(false);
            setIsDepositing(false);
        }
    }, [chain]);

    return { deposit, isApproving, isDepositing, error, txHash };
}

// ============ Withdraw ============

export function useWithdraw(chain: SupportedChain = "alfajores") {
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    const withdraw = useCallback(async (amount: bigint, receiver: Address, owner: Address) => {
        const addresses = getContractAddresses(chain);
        if (!addresses.poolVault) {
            setError("Pool vault not configured");
            return;
        }

        const walletClient = getWalletClient(chain);
        if (!walletClient) {
            setError("Wallet not connected");
            return;
        }

        setError(null);
        setTxHash(null);

        try {
            setIsWithdrawing(true);
            const [account] = await walletClient.getAddresses();

            const tx = await walletClient.writeContract({
                address: addresses.poolVault,
                abi: poolVaultAbi,
                functionName: "withdraw",
                args: [amount, receiver, owner],
                account,
            });

            setTxHash(tx);
            const publicClient = getPublicClient(chain);
            await publicClient.waitForTransactionReceipt({ hash: tx });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Withdrawal failed");
        } finally {
            setIsWithdrawing(false);
        }
    }, [chain]);

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

export function useUserLoans(address: Address | null, chain: SupportedChain = "alfajores") {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!address) return;

        const addresses = getContractAddresses(chain);
        if (!addresses.loanManager) return;

        try {
            setIsLoading(true);
            const client = getPublicClient(chain);

            // Get loan IDs for borrower
            const loanIds = await client.readContract({
                address: addresses.loanManager,
                abi: loanManagerAbi,
                functionName: "borrowerLoans",
                args: [address],
            }) as bigint[];

            // Fetch each loan
            const loanPromises = loanIds.map(async (id) => {
                const loan = await client.readContract({
                    address: addresses.loanManager!,
                    abi: loanManagerAbi,
                    functionName: "getLoan",
                    args: [id],
                }) as [Address, bigint, bigint, bigint, bigint, bigint, bigint, boolean, boolean];

                return {
                    id,
                    borrower: loan[0],
                    principal: loan[1],
                    aprBps: loan[2],
                    startTime: loan[3],
                    duration: loan[4],
                    principalRepaid: loan[5],
                    interestPaid: loan[6],
                    active: loan[7],
                    disbursed: loan[8],
                };
            });

            const fetchedLoans = await Promise.all(loanPromises);
            setLoans(fetchedLoans);
        } catch (err) {
            console.error("Failed to fetch loans:", err);
        } finally {
            setIsLoading(false);
        }
    }, [address, chain]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { loans, isLoading, refresh };
}

export function useRepayLoan(chain: SupportedChain = "alfajores") {
    const [isRepaying, setIsRepaying] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    const repay = useCallback(async (loanId: bigint, amount: bigint) => {
        const addresses = getContractAddresses(chain);
        if (!addresses.loanManager) {
            setError("Loan manager not configured");
            return;
        }

        const walletClient = getWalletClient(chain);
        if (!walletClient) {
            setError("Wallet not connected");
            return;
        }

        setError(null);
        setTxHash(null);

        try {
            const [account] = await walletClient.getAddresses();
            const publicClient = getPublicClient(chain);

            // Approve cUSD
            setIsApproving(true);
            const approveTx = await walletClient.writeContract({
                address: addresses.cUSD,
                abi: erc20Abi,
                functionName: "approve",
                args: [addresses.loanManager, amount],
                account,
            });
            await publicClient.waitForTransactionReceipt({ hash: approveTx });
            setIsApproving(false);

            // Repay
            setIsRepaying(true);
            const tx = await walletClient.writeContract({
                address: addresses.loanManager,
                abi: loanManagerAbi,
                functionName: "repay",
                args: [loanId, amount],
                account,
            });

            setTxHash(tx);
            await publicClient.waitForTransactionReceipt({ hash: tx });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Repayment failed");
        } finally {
            setIsApproving(false);
            setIsRepaying(false);
        }
    }, [chain]);

    return { repay, isRepaying, isApproving, error, txHash };
}

// ============ Helpers ============

export function formatCUSD(amount: bigint): string {
    return `$${parseFloat(formatEther(amount)).toFixed(2)}`;
}

export function formatPercent(bps: bigint): string {
    return `${(Number(bps) / 100).toFixed(2)}%`;
}
