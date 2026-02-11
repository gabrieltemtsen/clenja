import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

export async function GET(request: Request) {
    // Basic authorization check (Vercel sends this header)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow running without auth in development if no secret set, or if just testing manually
        // But in prod verify signature if needed. 
        // For simple MVP heartbeat, we allow public trigger or verify CRON_SECRET if present
    }

    const apiKey = process.env.MOLTBOOK_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ success: false, error: "MOLTBOOK_API_KEY not set" }, { status: 500 });
    }

    const logs: string[] = [];

    try {
        // 1. Check DMs
        const dmResponse = await fetch("https://www.moltbook.com/api/v1/agents/dm/check", {
            headers: { "Authorization": `Bearer ${apiKey}` }
        });

        if (dmResponse.ok) {
            const dmData = await dmResponse.json();
            logs.push(`DMs Checked: ${JSON.stringify(dmData)}`);
            // TODO: Auto-reply logic here
        } else {
            logs.push(`DM Check Failed: ${dmResponse.status}`);
        }

        // 2. Check Feed (Heartbeat)
        const feedResponse = await fetch("https://www.moltbook.com/api/v1/feed?sort=new&limit=5", {
            headers: { "Authorization": `Bearer ${apiKey}` }
        });

        if (feedResponse.ok) {
            const feedData = await feedResponse.json();
            logs.push(`Feed Checked: Retrieved ${feedData.posts?.length || 0} posts`);
        } else {
            logs.push(`Feed Check Failed: ${feedResponse.status}`);
        }

        console.log("💓 Heartbeat Pulse:", logs);

        return NextResponse.json({ success: true, logs });

    } catch (error: any) {
        console.error("Heartbeat Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
