import { NextResponse } from "next/server";

// Mock loans database - in production would query contracts
const MOCK_LOANS: Record<string, {
    id: string;
    borrower: string;
    principal: string;
    aprPercent: string;
    startTime: string;
    duration: string;
    principalRepaid: string;
    interestPaid: string;
    active: boolean;
    disbursed: boolean;
    dueDate: string;
    totalOwed: string;
}> = {
    "1": {
        id: "1",
        borrower: "0x1234567890123456789012345678901234567890",
        principal: "100.00",
        aprPercent: "12.00",
        startTime: "2024-01-15T10:00:00Z",
        duration: "30",
        principalRepaid: "50.00",
        interestPaid: "0.50",
        active: true,
        disbursed: true,
        dueDate: "2024-02-14T10:00:00Z",
        totalOwed: "50.82",
    },
    "2": {
        id: "2",
        borrower: "0x2345678901234567890123456789012345678901",
        principal: "500.00",
        aprPercent: "15.00",
        startTime: "2024-01-20T14:00:00Z",
        duration: "60",
        principalRepaid: "0.00",
        interestPaid: "0.00",
        active: true,
        disbursed: true,
        dueDate: "2024-03-20T14:00:00Z",
        totalOwed: "512.33",
    },
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const loan = MOCK_LOANS[id];

    if (!loan) {
        return NextResponse.json(
            { success: false, error: "Loan not found" },
            { status: 404 }
        );
    }

    return NextResponse.json({
        success: true,
        data: loan,
    });
}
