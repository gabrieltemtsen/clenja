import { createPublicClient, createWalletClient, http, formatEther, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores, celo } from "viem/chains";
import { readFileSync } from "fs";
import { join } from "path";

// Load dotenv
import "dotenv/config";

/**
 * Deploy all Clenja contracts to the network
 * 
 * Usage: pnpm --filter contracts run deploy:alfajores
 * 
 * Environment variables:
 * - ALFAJORES_RPC_URL: Celo Alfajores RPC URL
 * - PRIVATE_KEY: Deployer private key
 */

// Load contract artifacts
function loadArtifact(name: string) {
    const artifactPath = join(process.cwd(), "artifacts/contracts", name + ".sol", name + ".json");
    return JSON.parse(readFileSync(artifactPath, "utf-8"));
}

async function main() {
    console.log("🚀 Deploying Clenja contracts...\n");

    // Setup from env
    const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
        throw new Error("PRIVATE_KEY not set in environment");
    }

    const network = process.env.NETWORK || "alfajores";
    const chain = network === "celo" ? celo : celoAlfajores;
    const rpcUrl = network === "celo"
        ? process.env.CELO_RPC_URL
        : process.env.ALFAJORES_RPC_URL || "https://alfajores-forno.celo-testnet.org";

    console.log("Network:", chain.name);
    console.log("RPC:", rpcUrl, "\n");

    // Create clients
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl),
    });
    const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
    });

    const deployerAddress = account.address;
    console.log("Deployer:", deployerAddress);

    const balance = await publicClient.getBalance({ address: deployerAddress });
    console.log("Balance:", formatEther(balance), "CELO\n");

    // For testnet, we'll use a mock cUSD address or deploy a mock ERC20
    // In production, use the actual cUSD address on Celo
    const CUSD_ADDRESS = process.env.CUSD_ADDRESS || "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"; // Alfajores cUSD
    console.log("Using cUSD address:", CUSD_ADDRESS, "\n");

    // Load artifacts
    const MockVerifierArtifact = loadArtifact("MockVerifier");
    const PoolVaultArtifact = loadArtifact("PoolVault");
    const RiskRulesArtifact = loadArtifact("RiskRules");
    const LoanManagerArtifact = loadArtifact("LoanManager");

    // Helper to deploy contract
    async function deployContract(name: string, artifact: { abi: any; bytecode: `0x${string}` }, args: any[]) {
        console.log(`   Deploying ${name}...`);
        const hash = await walletClient.deployContract({
            abi: artifact.abi,
            bytecode: artifact.bytecode as `0x${string}`,
            args,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (!receipt.contractAddress) {
            throw new Error(`Failed to deploy ${name}`);
        }
        console.log(`   ${name} deployed to: ${receipt.contractAddress}`);
        return receipt.contractAddress;
    }

    // 1. Deploy MockVerifier
    console.log("1️⃣ Deploying MockVerifier...");
    const mockVerifierAddress = await deployContract("MockVerifier", MockVerifierArtifact, [deployerAddress]);
    console.log("");

    // 2. Deploy PoolVault
    console.log("2️⃣ Deploying PoolVault...");
    const poolVaultAddress = await deployContract("PoolVault", PoolVaultArtifact, [CUSD_ADDRESS, deployerAddress]);
    console.log("");

    // 3. Deploy RiskRules with reasonable defaults
    console.log("3️⃣ Deploying RiskRules...");
    const riskRulesConfig = {
        maxBorrowerBps: 500n,          // 5% max per borrower
        maxUtilizationBps: 8000n,       // 80% max utilization
        maxLoanDuration: 90n * 24n * 60n * 60n, // 90 days
        minAprBps: 500n,                // 5% min APR
        maxAprBps: 3000n,               // 30% max APR
        minLoanAmount: parseEther("10"),   // $10 minimum
        maxLoanAmount: parseEther("10000"), // $10,000 maximum
        requireVerified: true,
    };

    const riskRulesAddress = await deployContract("RiskRules", RiskRulesArtifact, [
        deployerAddress,
        mockVerifierAddress,
        riskRulesConfig.maxBorrowerBps,
        riskRulesConfig.maxUtilizationBps,
        riskRulesConfig.maxLoanDuration,
        riskRulesConfig.minAprBps,
        riskRulesConfig.maxAprBps,
        riskRulesConfig.minLoanAmount,
        riskRulesConfig.maxLoanAmount,
        riskRulesConfig.requireVerified,
    ]);
    console.log("");

    // 4. Deploy LoanManager
    console.log("4️⃣ Deploying LoanManager...");
    const agentFeeBps = 1000n; // 10% of interest goes to agent
    const agentTreasury = deployerAddress; // Use deployer as treasury for now

    const loanManagerAddress = await deployContract("LoanManager", LoanManagerArtifact, [
        CUSD_ADDRESS,
        poolVaultAddress,
        riskRulesAddress,
        deployerAddress,
        agentTreasury,
        agentFeeBps,
    ]);
    console.log("");

    // 5. Configure PoolVault to use LoanManager
    console.log("5️⃣ Configuring PoolVault...");
    const setLoanManagerHash = await walletClient.writeContract({
        address: poolVaultAddress,
        abi: PoolVaultArtifact.abi,
        functionName: "setLoanManager",
        args: [loanManagerAddress],
    });
    await publicClient.waitForTransactionReceipt({ hash: setLoanManagerHash });
    console.log("   LoanManager set on PoolVault ✅\n");

    // Summary
    console.log("=".repeat(60));
    console.log("✅ Deployment Complete!\n");
    console.log("Contract Addresses:");
    console.log("  MockVerifier:", mockVerifierAddress);
    console.log("  PoolVault:", poolVaultAddress);
    console.log("  RiskRules:", riskRulesAddress);
    console.log("  LoanManager:", loanManagerAddress);
    console.log("\nConfiguration:");
    console.log("  cUSD Address:", CUSD_ADDRESS);
    console.log("  Agent Fee:", Number(agentFeeBps) / 100, "% of interest");
    console.log("  Max Borrower:", Number(riskRulesConfig.maxBorrowerBps) / 100, "% of pool");
    console.log("  Max Utilization:", Number(riskRulesConfig.maxUtilizationBps) / 100, "%");
    console.log("=".repeat(60));

    console.log("\n📋 Add these to your apps/web/.env.local:");
    console.log(`NEXT_PUBLIC_POOL_VAULT_ADDRESS=${poolVaultAddress}`);
    console.log(`NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=${loanManagerAddress}`);
    console.log(`NEXT_PUBLIC_RISK_RULES_ADDRESS=${riskRulesAddress}`);

    // Return addresses for use in seed script
    return {
        mockVerifier: mockVerifierAddress,
        poolVault: poolVaultAddress,
        riskRules: riskRulesAddress,
        loanManager: loanManagerAddress,
        cUSD: CUSD_ADDRESS,
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
