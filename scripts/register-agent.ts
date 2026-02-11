import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import { readFileSync } from "fs";
import { join } from "path";
import "dotenv/config";

// Simplified ABI for our mock registry
const MockIdentityRegistryABI = [
    {
        "inputs": [{ "internalType": "address", "name": "agentWallet", "type": "address" }],
        "name": "registerAgent",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "agentWallet", "type": "address" }],
        "name": "getAgentId",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

async function main() {
    console.log("🤖 Registering Agent with MockIdentityRegistry...\n");

    const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
    if (!privateKey) throw new Error("PRIVATE_KEY not set");

    // Use deployed address from env, or fallback to Mainnet if not set
    const registryAddress = (process.env.MOCK_IDENTITY_REGISTRY_ADDRESS || process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS) as `0x${string}`;
    if (!registryAddress) throw new Error("Registry Address not set in env (NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS)");

    const account = privateKeyToAccount(privateKey);
    const chain = process.env.NEXT_PUBLIC_RPC_URL?.includes("alfajores") ? celoAlfajores : celoAlfajores; // Defaulting to Alfajores type for safety, but RPC decides. 
    // Ideally import { celo } from "viem/chains" if migrating fully.

    // For this specific task, let's trust the RPC URL provided in env
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://forno.celo.org";

    const client = createWalletClient({
        account,
        chain: undefined, // Let transport decide
        transport: http(rpcUrl)
    });
    const publicClient = createPublicClient({
        chain: undefined,
        transport: http(rpcUrl)
    });

    console.log("Agent Wallet:", account.address);
    console.log("Registry:", registryAddress);

    // Check if already registered
    const existingId = await publicClient.readContract({
        address: registryAddress,
        abi: MockIdentityRegistryABI,
        functionName: "getAgentId",
        args: [account.address]
    });

    if (existingId > 0n) {
        console.log(`\n✅ Agent already registered! Agent ID: ${existingId}`);
        return;
    }

    // Register
    console.log("Registering...");
    const hash = await client.writeContract({
        address: registryAddress,
        abi: MockIdentityRegistryABI,
        functionName: "registerAgent",
        args: [account.address]
    });

    console.log("Tx Hash:", hash);
    await publicClient.waitForTransactionReceipt({ hash });

    // Confirm
    const newId = await publicClient.readContract({
        address: registryAddress,
        abi: MockIdentityRegistryABI,
        functionName: "getAgentId",
        args: [account.address]
    });

    console.log(`\n🎉 Agent Registered Successfully! Agent ID: ${newId}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
