import { NextResponse } from "next/server";

// x402 paywall configuration
const X402_PRICE_CUSD = "0.25"; // $0.25 per trust packet

export async function POST(request: Request) {
    // Check for x402 payment header
    const paymentHeader = request.headers.get("X-Payment-Proof");

    if (!paymentHeader) {
        return NextResponse.json(
            {
                error: "Payment Required",
                price: X402_PRICE_CUSD,
                currency: "cUSD",
                paymentAddress: process.env.CLENJA_TREASURY_ADDRESS || "0x0000000000000000000000000000000000000000",
                message: "This endpoint requires a payment of $0.25 cUSD. Include payment proof in X-Payment-Proof header.",
            },
            {
                status: 402,
                headers: {
                    "X-Price": X402_PRICE_CUSD,
                    "X-Currency": "cUSD",
                },
            }
        );
    }

    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
        return NextResponse.json(
            { success: false, error: "Missing required field: walletAddress" },
            { status: 400 }
        );
    }

    // Generate trust packet with verification status and history
    // In production, this would query verification contracts and loan history
    const trustPacket = {
        walletAddress,
        verification: {
            isVerified: true,
            provider: "SelfClaw",
            verifiedAt: "2024-01-10T12:00:00Z",
            level: "STANDARD",
        },
        loanHistory: {
            totalLoans: 3,
            repaidOnTime: 3,
            defaulted: 0,
            totalBorrowed: "750.00",
            totalRepaid: "785.50",
        },
        trustScore: 85,
        creditLimit: "1000.00",
        poolParticipation: {
            totalDeposited: "0.00",
            currentShares: "0.00",
            earnedYield: "0.00",
        },
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Valid 7 days
    };

    return NextResponse.json({
        success: true,
        data: trustPacket,
    });
}
