"use client";

import { useState } from "react";
import Link from "next/link";
import { parseEther, formatEther } from "viem";
import { useWallet, useUserLoans, useRepayLoan, formatCUSD, getPublicClient, getContractAddresses } from "@/lib/onchain";
import type { Loan } from "@/lib/onchain/hooks";
import { loanManagerAbi } from "@/lib/onchain/abis";

export default function RepayPage() {
    const { address, connect, isConnecting } = useWallet();
    const { loans, isLoading: loansLoading, refresh } = useUserLoans(address);
    const { repay, isRepaying, isApproving, error: repayError, txHash } = useRepayLoan();

    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [amount, setAmount] = useState("");

    const activeLoans = loans.filter(l => l.active && l.disbursed);

    const handleRepay = async () => {
        if (!selectedLoan || !amount) return;

        const amountWei = parseEther(amount);
        await repay(selectedLoan.id, amountWei);

        if (!repayError) {
            setAmount("");
            refresh();
        }
    };

    const isProcessing = isApproving || isRepaying;

    return (
        <main className="min-h-screen px-4 py-12">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
                        ← Back to Home
                    </Link>
                    <h1 className="text-3xl font-bold">Repay Loans</h1>
                    <p className="text-gray-400 mt-2">
                        Repay your outstanding loans to build credit.
                    </p>
                </div>

                {!address ? (
                    <div className="glass-card p-8 text-center">
                        <p className="text-gray-400 mb-6">Connect your wallet to view loans</p>
                        <button
                            onClick={connect}
                            disabled={isConnecting}
                            className="btn-primary"
                        >
                            {isConnecting ? "Connecting..." : "Connect Wallet"}
                        </button>
                    </div>
                ) : loansLoading ? (
                    <div className="glass-card p-8 text-center">
                        <span className="spinner text-green-400" style={{ width: 32, height: 32 }} />
                        <p className="text-gray-400 mt-4">Loading your loans...</p>
                    </div>
                ) : activeLoans.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <div className="text-4xl mb-4">🎉</div>
                        <p className="text-gray-400 mb-6">You have no active loans</p>
                        <Link href="/borrow" className="btn-primary inline-block">
                            Request a Loan
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Loan List */}
                        <div className="space-y-4 mb-6">
                            {activeLoans.map((loan) => (
                                <LoanCard
                                    key={loan.id.toString()}
                                    loan={loan}
                                    isSelected={selectedLoan?.id === loan.id}
                                    onSelect={() => setSelectedLoan(loan)}
                                />
                            ))}
                        </div>

                        {/* Repay Form */}
                        {selectedLoan && (
                            <div className="glass-card p-6 animate-fade-in">
                                <h2 className="text-lg font-medium mb-4">Repay Loan #{selectedLoan.id.toString()}</h2>

                                <LoanDetails loan={selectedLoan} />

                                <div className="mt-4">
                                    <label className="block text-sm text-gray-400 mb-2">Repayment Amount</label>
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
                                            onClick={() => {
                                                const remaining = selectedLoan.principal - selectedLoan.principalRepaid;
                                                setAmount(formatEther(remaining));
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-400 hover:text-green-300"
                                        >
                                            FULL
                                        </button>
                                    </div>
                                </div>

                                {repayError && (
                                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                        {repayError}
                                    </div>
                                )}

                                {txHash && (
                                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                                        Repayment submitted!{" "}
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
                                    onClick={handleRepay}
                                    disabled={!amount || isProcessing || parseFloat(amount) <= 0}
                                    className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                                >
                                    {isApproving ? (
                                        <>
                                            <span className="spinner" />
                                            Approving...
                                        </>
                                    ) : isRepaying ? (
                                        <>
                                            <span className="spinner" />
                                            Repaying...
                                        </>
                                    ) : (
                                        "Repay"
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}

function LoanCard({ loan, isSelected, onSelect }: { loan: Loan; isSelected: boolean; onSelect: () => void }) {
    const remaining = loan.principal - loan.principalRepaid;
    const progress = Number(loan.principalRepaid) / Number(loan.principal) * 100;

    return (
        <button
            onClick={onSelect}
            className={`glass-card p-4 w-full text-left transition-all ${isSelected ? "border-green-500/50 bg-green-500/5" : ""
                }`}
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <span className="text-sm text-gray-400">Loan #{loan.id.toString()}</span>
                    <div className="text-lg font-bold">{formatCUSD(loan.principal)}</div>
                </div>
                <div className="text-right">
                    <span className="text-sm text-gray-400">{(Number(loan.aprBps) / 100).toFixed(1)}% APR</span>
                    <div className="text-sm text-green-400">{formatCUSD(remaining)} remaining</div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-green-500 to-yellow-400"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="text-xs text-gray-500 mt-1">{progress.toFixed(0)}% repaid</div>
        </button>
    );
}

function LoanDetails({ loan }: { loan: Loan }) {
    const remaining = loan.principal - loan.principalRepaid;
    const [interest, setInterest] = useState<bigint>(0n);

    // Fetch accrued interest
    useState(() => {
        (async () => {
            const addresses = getContractAddresses();
            if (!addresses.loanManager) return;

            const client = getPublicClient();
            const accrued = await client.readContract({
                address: addresses.loanManager,
                abi: loanManagerAbi,
                functionName: "accruedInterest",
                args: [loan.id],
            });
            setInterest(accrued as bigint);
        })();
    });

    return (
        <div className="p-4 bg-black/30 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-gray-400">Original Principal</span>
                <span>{formatCUSD(loan.principal)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-gray-400">Principal Repaid</span>
                <span className="text-green-400">{formatCUSD(loan.principalRepaid)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-gray-400">Remaining Principal</span>
                <span>{formatCUSD(remaining)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-gray-400">Accrued Interest</span>
                <span className="text-yellow-400">{formatCUSD(interest)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-700">
                <span className="text-gray-400">Total Owed</span>
                <span className="text-green-400">{formatCUSD(remaining + interest)}</span>
            </div>
        </div>
    );
}
