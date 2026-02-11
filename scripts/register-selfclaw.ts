const { generateKeyPairSync, createSign } = require("crypto");
// Using standard fetch available in Node 18+

async function main() {
    console.log("🦞 Initiating SelfClaw Verification...");

    // 1. Generate Ed25519 Keypair
    console.log("Generating Ed25519 Keypair...");
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");

    // Export in SPKI DER format (base64) for SelfClaw
    const publicKeySpki = publicKey.export({ type: "spki", format: "der" }).toString("base64");
    const privateKeyPkcs8 = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");

    console.log("\n🔑 Agent Public Key:", publicKeySpki);
    console.log("🔒 Private Key generated (kept locally).");

    // 2. Start Verification
    console.log("\n📡 contacting SelfClaw API...");
    const startResponse = await fetch("https://selfclaw.ai/api/selfclaw/v1/start-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            agentPublicKey: publicKeySpki,
            agentName: "Clenja"
        })
    });

    if (!startResponse.ok) {
        throw new Error(`Start verification failed: ${startResponse.status} ${await startResponse.text()}`);
    }

    const { challenge, sessionId } = await startResponse.json();
    console.log("✅ Session Started. Session ID:", sessionId);

    // 3. Sign Challenge
    // Ed25519 signing
    const signature = require("crypto").sign(null, Buffer.from(challenge), privateKey).toString("base64");

    const signResponse = await fetch("https://selfclaw.ai/api/selfclaw/v1/sign-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sessionId,
            signature
        })
    });

    if (!signResponse.ok) {
        throw new Error(`Sign challenge failed: ${signResponse.status} ${await signResponse.text()}`);
    }

    console.log("✅ Challenge Signed.");

    // 4. Output Instructions for User
    console.log("\n" + "=".repeat(50));
    console.log("🚀 ACTION REQUIRED: PROOF OF HUMANITY");
    console.log("=".repeat(50));
    console.log("\nPlease verify this agent using the Self.xyz App:");
    console.log("\nOption A: Visit Website (Recommended)");
    console.log(`1. Go to: https://selfclaw.ai`);
    console.log(`2. Enter Agent Public Key:`);
    console.log(`${publicKeySpki}`);
    console.log(`3. Scan the QR code with your Self App.`);

    console.log("\nOption B: Direct QR Data");
    console.log("If you have a QR generator, use this data:");
    console.log(JSON.stringify({
        sessionId,
        agentName: "Clenja",
        publicKey: publicKeySpki
    }));

    console.log("\n" + "=".repeat(50));
    console.log("Waiting for verification... (Polls for 60 seconds)");

    // 5. Poll for completion
    for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 5000));
        process.stdout.write(".");

        const statusResponse = await fetch(`https://selfclaw.ai/api/selfclaw/v1/verification-status/${sessionId}`);
        if (statusResponse.ok) {
            const { status } = await statusResponse.json();
            if (status === "verified") {
                console.log("\n\n🎉 SUCCESS! Agent is Verified.");
                console.log("You can now proceed with On-Chain Identity minting.");
                // TODO: Save keys to env?
                return;
            }
        }
    }

    console.log("\n\n⏳ Polling timed out. Complete verification on the website and check status later.");
}

main().catch(console.error);
