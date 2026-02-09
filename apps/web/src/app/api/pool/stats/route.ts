import { NextResponse } from "next/server";

// Mock pool stats - in production would query contracts
export async function GET() {
    // This would call the actual contract in production
    const stats = {
        totalAssets: "50000.00",
        availableLiquidity: "35000.00",
        outstandingLoans: "15000.00",
        utilizationPercent: "30.00",
        totalShares: "49000.00",
        sharePrice: "1.02", // 2% yield
        totalLenders: 12,
        activeBorrowers: 5,
        totalLoansIssued: 47,
        updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
        success: true,
        data: stats,
    });
}
