import { z } from "zod";
import { tool } from "ai";

// Schema for agent-to-agent messages
export const AgentMessageSchema = z.object({
    sender: z.string().describe("Identity of the sender agent (e.g., name or wallet address)"),
    content: z.string().describe("The actual message content"),
    timestamp: z.number().optional().describe("Timestamp of the message"),
    replyTo: z.string().optional().describe("Optional URL to reply to"),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

/**
 * Tool to send a message to another agent via HTTP POST
 */
export const sendMessage = tool({
    description: "Send a message to another agent via their HTTP endpoint",
    parameters: z.object({
        recipientUrl: z.string().url().describe("The URL of the recipient agent's message endpoint"),
        message: z.string().describe("The message to send")
    }),
    execute: async ({ recipientUrl, message }) => {
        try {
            const payload: AgentMessage = {
                sender: "Clenja Agent", // In future, could be dynamic or wallet address
                content: message,
                timestamp: Date.now(),
                replyTo: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/agent/message` : undefined
            };

            const response = await fetch(recipientUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                return {
                    success: false,
                    error: `Recipient returned ${response.status}: ${response.statusText}`,
                    message: "Failed to deliver message."
                };
            }

            const data = await response.json();
            return {
                success: true,
                data,
                message: "Message delivered successfully."
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                message: "Network error sending message."
            };
        }
    },
});
