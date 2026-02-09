"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet, usePoolStats, formatCUSD, formatPercent } from "@/lib/onchain";

export default function Home() {
  const { address, isConnecting, connect, disconnect } = useWallet();
  const { stats, isLoading } = usePoolStats();

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 md:py-32">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live on Celo Alfajores
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Cooperative Micro-Lending
            <span className="block mt-2 bg-gradient-to-r from-green-400 to-yellow-300 bg-clip-text text-transparent">
              Powered by Community
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Non-custodial lending pools where lenders earn yield and borrowers access fair credit.
            No intermediaries; just smart contracts on Celo.
          </p>


          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
            {!address ? (
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            ) : (
              <>
                <Link href="/deposit" className="btn-primary text-center">
                  Deposit & Earn
                </Link>
                <Link href="/borrow" className="btn-secondary text-center">
                  Borrow Funds
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-6 md:p-8">
            <h2 className="text-lg font-medium text-gray-400 mb-6 text-center">Pool Statistics</h2>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <span className="spinner text-green-400" style={{ width: 32, height: 32 }} />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="stat-card">
                  <div className="stat-value">{formatCUSD(stats.totalAssets)}</div>
                  <div className="stat-label">Total Value Locked</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{formatCUSD(stats.availableLiquidity)}</div>
                  <div className="stat-label">Available Liquidity</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{formatCUSD(stats.outstandingLoans)}</div>
                  <div className="stat-label">Outstanding Loans</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{formatPercent(stats.utilizationBps)}</div>
                  <div className="stat-label">Utilization</div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Pool not configured. Contract addresses needed.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Lenders Deposit</h3>
              <p className="text-gray-400 text-sm">
                Deposit cUSD into the pool and earn yield from loan interest.
                Your funds are always non-custodial.
              </p>
            </div>

            <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="w-12 h-12 rounded-lg bg-yellow-400/20 flex items-center justify-center mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Borrowers Verify</h3>
              <p className="text-gray-400 text-sm">
                Complete verification through SelfClaw to unlock borrowing.
                Fair access for qualified borrowers.
              </p>
            </div>

            <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Cooperative Lending</h3>
              <p className="text-gray-400 text-sm">
                AI agent assists with optimal loan terms.
                Deterministic rules ensure fair lending.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Wallet Status Footer - Managed by RainbowKit */}
    </main>
  );
}
