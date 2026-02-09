import { NextResponse } from "next/server";

// x402 paywall configuration
const X402_PRICE_CUSD = "0.10"; // $0.10 per underwriting request

export async function POST(request: Request) {
    // Check for x402 payment header
    const paymentHeader = request.headers.get("X-Payment-Proof");

    if (!paymentHeader) {
        // Return 402 Payment Required with payment instructions
        return NextResponse.json(
            {
                error: "Payment Required",
                price: X402_PRICE_CUSD,
                currency: "cUSD",
                paymentAddress: process.env.CLENJA_TREASURY_ADDRESS || "0x0000000000000000000000000000000000000000",
                message: "This endpoint requires a payment of $0.10 cUSD. Include payment proof in X-Payment-Proof header.",
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

    // In production, verify the payment proof here
    // For now, accept any proof for demo purposes

    const body = await request.json();
    const { borrower, amount, durationDays } = body;

    if (!borrower || !amount || !durationDays) {
        return NextResponse.json(
            { success: false, error: "Missing required fields: borrower, amount, durationDays" },
            { status: 400 }
        );
    }

    // Generate underwriting recommendation
    // In production, this would analyze borrower history, pool state, etc.
    const baseApr = 10;
    const riskAdjustment = Math.random() * 5; // Mock risk assessment
    const recommendedApr = Math.min(30, Math.max(5, baseApr + riskAdjustment));

    const interest = (amount * (recommendedApr / 100) * (durationDays / 365));
    const totalRepayment = amount + interest;

    const underwriting = {
        borrower,
        requestedAmount: amount.toFixed(2),
        durationDays,
        recommendation: "APPROVE",
        recommendedAprPercent: recommendedApr.toFixed(2),
        estimatedInterest: interest.toFixed(2),
        totalRepayment: totalRepayment.toFixed(2),
        maxApprovedAmount: Math.min(amount, 5000).toFixed(2), // Cap at 5k for demo
        riskScore: (70 + Math.random() * 25).toFixed(0), // Mock score 70-95
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Valid 24h
    };

    return NextResponse.json({
        success: true,
        data: underwriting,
    });
}
