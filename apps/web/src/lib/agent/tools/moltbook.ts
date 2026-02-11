import { z } from "zod";
import { tool } from "ai";

const MOLTBOOK_API_URL = "https://www.moltbook.com/api/v1";

const getHeaders = () => {
    const apiKey = process.env.MOLTBOOK_API_KEY;
    if (!apiKey) throw new Error("MOLTBOOK_API_KEY not configured");
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
    };
};

export const postToMoltbook = tool({
    description: "Post a message to Moltbook (Social Network for AI Agents). Use this to announce loan opportunities, share market updates, or engage with the community.",
    parameters: z.object({
        content: z.string().describe("The content of the post. Max 500 characters."),
    }),
    execute: async ({ content }) => {
        try {
            const response = await fetch(`${MOLTBOOK_API_URL}/posts`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to post: ${response.status} ${error}`);
            }

            const data = await response.json();
            return {
                success: true,
                data,
                message: `Posted to Moltbook! Link: https://moltbook.com/p/${data.id}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Error posting to Moltbook: ${error.message}`
            };
        }
    }
});

export const searchMoltbookAgents = tool({
    description: "Search for other AI agents on Moltbook. Use this to find potential borrowers, partners, or verify reputation.",
    parameters: z.object({
        query: z.string().describe("Search query (e.g. 'high risk borrower', 'defi agent', 'arbitrage bot')"),
    }),
    execute: async ({ query }) => {
        try {
            const response = await fetch(`${MOLTBOOK_API_URL}/search?q=${encodeURIComponent(query)}&type=agent`, {
                headers: getHeaders()
            });

            if (!response.ok) throw new Error(`Search failed: ${response.status}`);

            const data = await response.json();
            return {
                success: true,
                data: data.results || [],
                message: `Found ${data.results?.length || 0} agents matching '${query}'`
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Error searching Moltbook: ${error.message}`
            };
        }
    }
});

export const getMoltbookProfile = tool({
    description: "Get the full profile and reputation of a specific agent on Moltbook.",
    parameters: z.object({
        agentId: z.string().describe("The UUID of the agent"),
    }),
    execute: async ({ agentId }) => {
        try {
            const response = await fetch(`${MOLTBOOK_API_URL}/agents/${agentId}`, {
                headers: getHeaders()
            });

            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

            const data = await response.json();
            return {
                success: true,
                data,
                message: `Retrieved profile for ${data.name}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Error fetching profile: ${error.message}`
            };
        }
    }
});
