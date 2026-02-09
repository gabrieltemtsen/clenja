"use client";

import { useState } from "react";
import Link from "next/link";
import { parseEther } from "viem";
import { useWallet, usePoolStats, useUserBalance, formatCUSD, formatPercent, getPublicClient, getContractAddresses } from "@/lib/onchain";
import { loanManagerAbi } from "@/lib/onchain/abis";

export default function BorrowPage() {
    const { address, connect, isConnecting } = useWallet();
    const { stats } = usePoolStats();
    const { cUSDBalance } = useUserBalance(address);

    const [amount, setAmount] = useState("");
    const [duration, setDuration] = useState("30"); // days
    const [apr, setApr] = useState("12"); // percent
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Calculate estimated interest
    const estimatedInterest = amount && duration && apr
        ? (parseFloat(amount) * (parseFloat(apr) / 100) * (parseFloat(duration) / 365)).toFixed(2)
        : "0.00";

    const handleSubmit = async () => {
        if (!address || !amount) return;

        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const { getWalletClient } = await import("@/lib/onchain/client");
            const walletClient = getWalletClient();
            const addresses = getContractAddresses();

            if (!walletClient || !addresses.loanManager) {
                throw new Error("Wallet not connected or contracts not configured");
            }

            const [account] = await walletClient.getAddresses();
            const publicClient = getPublicClient();

            // Request loan
            const tx = await walletClient.writeContract({
                address: addresses.loanManager,
                abi: loanManagerAbi,
                functionName: "requestLoan",
                args: [
                    parseEther(amount),
                    BigInt(parseInt(duration) * 24 * 60 * 60), // Convert days to seconds
                    BigInt(parseFloat(apr) * 100), // Convert percent to basis points
                    "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
                ],
                account,
            });

            await publicClient.waitForTransactionReceipt({ hash: tx });
            setSuccess("Loan request submitted! Awaiting approval.");
            setAmount("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to request loan");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen px-4 py-12">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
                        ← Back to Home
                    </Link>
                    <h1 className="text-3xl font-bold">Request a Loan</h1>
                    <p className="text-gray-400 mt-2">
                        Borrow cUSD from the community pool at fair rates.
                    </p>
                </div>

                {!address ? (
                    <div className="glass-card p-8 text-center">
                        <p className="text-gray-400 mb-6">Connect your wallet to borrow</p>
                        <button
                            onClick={connect}
                            disabled={isConnecting}
                            className="btn-primary"
                        >
                            {isConnecting ? "Connecting..." : "Connect Wallet"}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Verification Status */}
                        <div className="glass-card p-6 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <span className="text-xl">✅</span>
                                </div>
                                <div>
                                    <div className="font-medium">Verified Borrower</div>
                                    <div className="text-sm text-gray-400">Your identity has been verified</div>
                                </div>
                            </div>
                        </div>

                        {/* Loan Form */}
                        <div className="glass-card p-6">
                            <div className="space-y-5">
                                {/* Amount */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Loan Amount (cUSD)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="100.00"
                                        className="input-field"
                                        disabled={isSubmitting}
                                    />
                                    <div className="text-sm text-gray-500 mt-1">
                                        Min: $10 · Max: $10,000 · Pool Available: {stats ? formatCUSD(stats.availableLiquidity) : "--"}
                                    </div>
                                </div>

                                {/* Duration */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Duration (Days)</label>
                                    <select
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="input-field"
                                        disabled={isSubmitting}
                                    >
                                        <option value="7">7 days</option>
                                        <option value="14">14 days</option>
                                        <option value="30">30 days</option>
                                        <option value="60">60 days</option>
                                        <option value="90">90 days</option>
                                    </select>
                                </div>

                                {/* APR */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">APR (%)</label>
                                    <input
                                        type="number"
                                        value={apr}
                                        onChange={(e) => setApr(e.target.value)}
                                        placeholder="12"
                                        className="input-field"
                                        disabled={isSubmitting}
                                        min="5"
                                        max="30"
                                        step="0.5"
                                    />
                                    <div className="text-sm text-gray-500 mt-1">
                                        Min: 5% · Max: 30%
                                    </div>
                                </div>
                            </div>

                            {/* Loan Summary */}
                            {amount && (
                                <div className="mt-6 p-4 bg-black/30 rounded-lg space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Principal</span>
                                        <span>${amount}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Est. Interest</span>
                                        <span>${estimatedInterest}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-700">
                                        <span className="text-gray-400">Total Repayment</span>
                                        <span className="text-green-400">
                                            ${(parseFloat(amount) + parseFloat(estimatedInterest)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                                    {success}
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={!amount || isSubmitting || parseFloat(amount) < 10}
                                className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Request Loan"
                                )}
                            </button>
                        </div>

                        {/* Info Cards */}
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="glass-card p-4 text-center">
                                <div className="text-xl font-bold text-green-400">5-30%</div>
                                <div className="text-xs text-gray-500">APR Range</div>
                            </div>
                            <div className="glass-card p-4 text-center">
                                <div className="text-xl font-bold text-yellow-400">90 days</div>
                                <div className="text-xs text-gray-500">Max Duration</div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
