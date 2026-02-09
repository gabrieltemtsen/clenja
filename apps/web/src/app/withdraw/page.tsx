"use client";

import { useState } from "react";
import Link from "next/link";
import { parseEther } from "viem";
import { useWallet, usePoolStats, useUserBalance, useWithdraw, formatCUSD } from "@/lib/onchain";

export default function WithdrawPage() {
    const { address, connect, isConnecting } = useWallet();
    const { stats, refresh: refreshStats } = usePoolStats();
    const { cUSDBalance, shares, shareValue, refresh: refreshBalance } = useUserBalance(address);
    const { withdraw, isWithdrawing, error, txHash } = useWithdraw();

    const [amount, setAmount] = useState("");

    const handleWithdraw = async () => {
        if (!address || !amount) return;

        try {
            const amountWei = parseEther(amount);
            await withdraw(amountWei, address, address);
            setAmount("");
            refreshStats();
            refreshBalance();
        } catch (err) {
            console.error(err);
        }
    };

    const handleMaxClick = () => {
        if (shareValue > 0n) {
            setAmount((Number(shareValue) / 1e18).toString());
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
                    <h1 className="text-3xl font-bold">Withdraw cUSD</h1>
                    <p className="text-gray-400 mt-2">
                        Withdraw your deposited cUSD plus any earned yield.
                    </p>
                </div>

                {!address ? (
                    <div className="glass-card p-8 text-center">
                        <p className="text-gray-400 mb-6">Connect your wallet to withdraw</p>
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
                                    <div className="text-sm text-gray-500">Withdrawable</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">
                                        {(Number(shares) / 1e18).toFixed(2)}
                                    </div>
                                    <div className="text-sm text-gray-500">Pool Shares</div>
                                </div>
                            </div>
                        </div>

                        {/* Withdraw Form */}
                        <div className="glass-card p-6">
                            <label className="block text-sm text-gray-400 mb-2">Amount to Withdraw</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="input-field pr-20"
                                    disabled={isWithdrawing}
                                />
                                <button
                                    onClick={handleMaxClick}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-400 hover:text-green-300"
                                >
                                    MAX
                                </button>
                            </div>

                            <div className="text-sm text-gray-500 mt-2">
                                Available: {formatCUSD(shareValue)}
                            </div>

                            {/* Warning if low liquidity */}
                            {stats && amount && parseFloat(amount) > Number(stats.availableLiquidity) / 1e18 && (
                                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                                    ⚠️ Requested amount exceeds available liquidity
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
                                onClick={handleWithdraw}
                                disabled={!amount || isWithdrawing || parseFloat(amount) <= 0 || shareValue === 0n}
                                className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
                            >
                                {isWithdrawing ? (
                                    <>
                                        <span className="spinner" />
                                        Withdrawing...
                                    </>
                                ) : (
                                    "Withdraw"
                                )}
                            </button>
                        </div>

                        {/* Pool Info */}
                        {stats && (
                            <div className="glass-card p-6 mt-6">
                                <h2 className="text-sm text-gray-400 mb-4">Pool Liquidity</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Available to Withdraw</span>
                                        <span>{formatCUSD(stats.availableLiquidity)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Locked in Loans</span>
                                        <span>{formatCUSD(stats.outstandingLoans)}</span>
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
