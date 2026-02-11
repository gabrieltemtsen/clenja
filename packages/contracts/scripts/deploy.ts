
import { createPublicClient, createWalletClient, getAddress, http, formatEther, parseEther } from "viem";
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

    // 0. Setup Registry
    let identityRegistryAddress;
    if (chain.id === 42220) { // Celo Mainnet
        console.log("0️⃣ Using Official ERC-8004 Registry (Mainnet)...");
        identityRegistryAddress = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
    } else {
        console.log("0️⃣ Deploying MockIdentityRegistry (Testnet)...");
        const MockIdentityRegistryArtifact = loadArtifact("MockIdentityRegistry");
        identityRegistryAddress = await deployContract("MockIdentityRegistry", MockIdentityRegistryArtifact, []);
    }
    console.log("   Registry:", identityRegistryAddress, "\n");

    // 1. Deploy MockVerifier (Simulating SelfClaw for now, even on Mainnet for Hackathon demo)
    console.log("1️⃣ Deploying MockVerifier...");

    const mockVerifierAddress = await deployContract("MockVerifier", MockVerifierArtifact, [deployerAddress]);
    console.log("");

    // 2. Deploy RiskRules (Shared)
    console.log("2️⃣ Deploying RiskRules (Shared)...");
    const riskRulesConfig = {
        maxBorrowerBps: 500n,          // 5% max per borrower
        maxUtilizationBps: 8000n,       // 80% max utilization
        maxLoanDuration: 90n * 24n * 60n * 60n, // 90 days
        minAprBps: 500n,                // 5% min APR
        maxAprBps: 3000n,               // 30% max APR
        minLoanAmount: parseEther("1"),    // 1 Token minimum
        maxLoanAmount: parseEther("10000"), // 10,000 Token maximum
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

    // --- Helper to deploy Ecosystem (Vault + LoanManager) ---
    async function deployEcosystem(tokenName: string, tokenAddress: string) {
        console.log(`--- Deploying ${tokenName} Ecosystem ---`);

        // Deploy Vault
        console.log(`   Deploying PoolVault (${tokenName})...`);
        const poolVaultAddress = await deployContract(`PoolVault_${tokenName}`, PoolVaultArtifact, [tokenAddress, deployerAddress]);

        // Deploy LoanManager
        console.log(`   Deploying LoanManager (${tokenName})...`);
        const agentFeeBps = 1000n; // 10%
        const agentTreasury = deployerAddress;

        const loanManagerAddress = await deployContract(`LoanManager_${tokenName}`, LoanManagerArtifact, [
            tokenAddress,
            poolVaultAddress,
            riskRulesAddress,
            deployerAddress,
            agentTreasury,
            agentFeeBps,
        ]);

        // Config Vault
        console.log(`   Configuring PoolVault (${tokenName})...`);
        const setLoanManagerHash = await walletClient.writeContract({
            address: poolVaultAddress,
            abi: PoolVaultArtifact.abi,
            functionName: "setLoanManager",
            args: [loanManagerAddress],
        });
        await publicClient.waitForTransactionReceipt({ hash: setLoanManagerHash });
        console.log(`   ✅ ${tokenName} Ecosystem Ready\n`);

        return { poolVault: poolVaultAddress, loanManager: loanManagerAddress };
    }

    // 3. Deploy cUSD Ecosystem
    const CUSD_ADDRESS = chain.id === 42220
        ? "0x765DE816845861e75A25fCA122bb6898B8B1282a" // Mainnet
        : (process.env.CUSD_ADDRESS || "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"); // Alfajores

    const cUSDEcosystem = await deployEcosystem("cUSD", CUSD_ADDRESS);

    // 4. Deploy CELO Ecosystem
    // CELO (Native Token wrapper or ERC20 compatible address)
    const CELO_ADDRESS = chain.id === 42220
        ? getAddress("0x471EcE3750Da237f93b8E339c536989b8978a438") // Mainnet CELO
        : "0xF194afDf50B03e69Bdc13a9900b4484137587146"; // Alfajores CELO

    const celoEcosystem = await deployEcosystem("CELO", CELO_ADDRESS);

    // Summary
    console.log("=".repeat(60));
    console.log("✅ Deployment Complete! (Mainnet / Multi-Token)\n");
    console.log("Shared Contracts:");
    console.log("  IdentityRegistry:", identityRegistryAddress);
    console.log("  RiskRules:", riskRulesAddress);
    console.log("  Verifier:", mockVerifierAddress);
    console.log("\ncUSD Ecosystem:");
    console.log("  Token:", CUSD_ADDRESS);
    console.log("  PoolVault:", cUSDEcosystem.poolVault);
    console.log("  LoanManager:", cUSDEcosystem.loanManager);
    console.log("\nCELO Ecosystem:");
    console.log("  Token:", CELO_ADDRESS);
    console.log("  PoolVault:", celoEcosystem.poolVault);
    console.log("  LoanManager:", celoEcosystem.loanManager);
    console.log("=".repeat(60));

    // Env file hints
    console.log("\n📋 Add these to your apps/web/.env.local:");
    console.log(`NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=${identityRegistryAddress}`);
    console.log(`NEXT_PUBLIC_RISK_RULES_ADDRESS=${riskRulesAddress}`);
    console.log(`NEXT_PUBLIC_CUSD_POOL_VAULT_ADDRESS=${cUSDEcosystem.poolVault}`);
    console.log(`NEXT_PUBLIC_CUSD_LOAN_MANAGER_ADDRESS=${cUSDEcosystem.loanManager}`);
    console.log(`NEXT_PUBLIC_CELO_POOL_VAULT_ADDRESS=${celoEcosystem.poolVault}`);
    console.log(`NEXT_PUBLIC_CELO_LOAN_MANAGER_ADDRESS=${celoEcosystem.loanManager}`);

    return {};
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
