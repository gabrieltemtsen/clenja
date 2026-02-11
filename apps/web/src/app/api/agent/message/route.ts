import { NextResponse } from "next/server";
import { AgentMessageSchema } from "@/lib/agent/communication";

/**
 * Endpoint for other agents to send messages to Clenja
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate the incoming message
        const validation = AgentMessageSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: "Invalid message format", details: validation.error.format() },
                { status: 400 }
            );
        }

        const message = validation.data;

        // Log the received message (for hackathon demo purpose)
        console.log("📨 RECEIVED AGENT MESSAGE:", message);

        // TODO: Emitting an event or storing this in a DB would happen here
        // For now, we just acknowledge receipt

        return NextResponse.json({
            success: true,
            message: "Message received",
            timestamp: Date.now()
        });
    } catch (error) {
        console.error("Error processing agent message:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
