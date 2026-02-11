import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores, celo } from "viem/chains";
import "dotenv/config";

const MockIdentityRegistryABI = [
    {
        "inputs": [{ "internalType": "address", "name": "to", "type": "address" }],
        "name": "mint",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
        "name": "balanceOf",
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
    // Determine chain based on RPC or env
    const isMainnet = process.env.NEXT_PUBLIC_RPC_URL?.includes("forno.celo.org") || process.env.NETWORK === "celo";
    const chain = isMainnet ? celo : celoAlfajores;

    // For this specific task, let's trust the RPC URL provided in env
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || (isMainnet ? "https://forno.celo.org" : "https://alfajores-forno.celo-testnet.org");

    console.log("Using Chain:", chain.name);
    console.log("RPC:", rpcUrl);

    const client = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl)
    });
    const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl)
    });

    console.log("Agent Wallet:", account.address);
    console.log("Registry:", registryAddress);

    // Probe
    try {
        const name = await publicClient.readContract({
            address: registryAddress,
            abi: MockIdentityRegistryABI,
            functionName: "name",
        });
        console.log("Contract Name:", name);

        const symbol = await publicClient.readContract({
            address: registryAddress,
            abi: MockIdentityRegistryABI,
            functionName: "symbol",
        });
        console.log("Contract Symbol:", symbol);

        // Register (Mint)
        console.log("Registering (Minting)...");
        try {
            const hash = await client.writeContract({
                address: registryAddress,
                abi: MockIdentityRegistryABI,
                functionName: "mint",
                args: [account.address]
            });

            console.log("Tx Hash:", hash);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log("Mint successful!");
        } catch (e) {
            console.error("Mint failed:", e);
            // Fallback or exit
            return;
        }

        const balance = await publicClient.readContract({
            address: registryAddress,
            abi: MockIdentityRegistryABI,
            functionName: "balanceOf",
            args: [account.address]
        });
        console.log("Agent Balance:", balance.toString());

    } catch (e) {
        console.error("Probe failed:", e);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
