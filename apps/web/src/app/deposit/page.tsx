"use client";

import { useState } from "react";
import Link from "next/link";
import { parseEther } from "viem";
import { useWallet, usePoolStats, useUserBalance, useDeposit, formatCUSD } from "@/lib/onchain";

export default function DepositPage() {
    const { address, connect, isConnecting } = useWallet();
    const { stats, refresh: refreshStats } = usePoolStats();
    const { cUSDBalance, shares, shareValue, refresh: refreshBalance } = useUserBalance(address);
    const { deposit, isApproving, isDepositing, error, txHash } = useDeposit();

    const [amount, setAmount] = useState("");

    const handleDeposit = async () => {
        if (!address || !amount) return;

        try {
            const amountWei = parseEther(amount);
            await deposit(amountWei, address);
            setAmount("");
            refreshStats();
            refreshBalance();
        } catch (err) {
            console.error(err);
        }
    };

    const handleMaxClick = () => {
        if (cUSDBalance > 0n) {
            setAmount((Number(cUSDBalance) / 1e18).toString());
        }
    };

    const isProcessing = isApproving || isDepositing;

    return (
        <main className="min-h-screen px-4 py-12">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
                        ← Back to Home
                    </Link>
                    <h1 className="text-3xl font-bold">Deposit cUSD</h1>
                    <p className="text-gray-400 mt-2">
                        Deposit cUSD into the lending pool to earn yield from borrower interest.
                    </p>
                </div>

                {!address ? (
                    <div className="glass-card p-8 text-center">
                        <p className="text-gray-400 mb-6">Connect your wallet to deposit</p>
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
                        {/* Your Position */}
                        <div className="glass-card p-6 mb-6">
                            <h2 className="text-sm text-gray-400 mb-4">Your Position</h2>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <div className="text-2xl font-bold text-green-400">
                                        {formatCUSD(shareValue)}
                                    </div>
                                    <div className="text-sm text-gray-500">Deposited Value</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">
                                        {formatCUSD(cUSDBalance)}
                                    </div>
                                    <div className="text-sm text-gray-500">cUSD Balance</div>
                                </div>
                            </div>
                        </div>

                        {/* Deposit Form */}
                        <div className="glass-card p-6">
                            <label className="block text-sm text-gray-400 mb-2">Amount to Deposit</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="input-field pr-20"
                                    disabled={isProcessing}
                                />
                                <button
                                    onClick={handleMaxClick}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-400 hover:text-green-300"
                                >
                                    MAX
                                </button>
                            </div>

                            <div className="text-sm text-gray-500 mt-2">
                                Available: {formatCUSD(cUSDBalance)}
                            </div>

                            {/* Preview */}
                            {amount && stats && (
                                <div className="mt-4 p-4 bg-black/30 rounded-lg">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">You will receive</span>
                                        <span>≈ {amount} shares</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-2">
                                        <span className="text-gray-400">Current APY</span>
                                        <span className="text-green-400">~8-12%</span>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {txHash && (
                                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                                    Transaction submitted!{" "}
                                    <a
                                        href={`https://alfajores.celoscan.io/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline"
                                    >
                                        View on Explorer
                                    </a>
                                </div>
                            )}

                            <button
                                onClick={handleDeposit}
                                disabled={!amount || isProcessing || parseFloat(amount) <= 0}
                                className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
                            >
                                {isApproving ? (
                                    <>
                                        <span className="spinner" />
                                        Approving cUSD...
                                    </>
                                ) : isDepositing ? (
                                    <>
                                        <span className="spinner" />
                                        Depositing...
                                    </>
                                ) : (
                                    "Deposit"
                                )}
                            </button>
                        </div>

                        {/* Pool Info */}
                        {stats && (
                            <div className="glass-card p-6 mt-6">
                                <h2 className="text-sm text-gray-400 mb-4">Pool Info</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Total Deposits</span>
                                        <span>{formatCUSD(stats.totalAssets)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Available Liquidity</span>
                                        <span>{formatCUSD(stats.availableLiquidity)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Utilization</span>
                                        <span>{(Number(stats.utilizationBps) / 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
