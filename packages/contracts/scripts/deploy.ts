import hre from "hardhat";
import { formatEther, parseEther } from "viem";

/**
 * Deploy all Clenja contracts to the network
 * 
 * Usage: pnpm --filter contracts run deploy:alfajores
 * 
 * Environment variables:
 * - ALFAJORES_RPC_URL: Celo Alfajores RPC URL
 * - PRIVATE_KEY: Deployer private key
 */
async function main() {
    console.log("🚀 Deploying Clenja contracts...\n");

    // Get signers
    const [deployer] = await hre.network.provider.getWalletClients();
    const deployerAddress = deployer.account.address;

    console.log("Deployer:", deployerAddress);

    const publicClient = await hre.network.provider.getPublicClient();
    const balance = await publicClient.getBalance({ address: deployerAddress });
    console.log("Balance:", formatEther(balance), "CELO\n");

    // For testnet, we'll use a mock cUSD address or deploy a mock ERC20
    // In production, use the actual cUSD address on Celo
    const CUSD_ADDRESS = process.env.CUSD_ADDRESS || "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"; // Alfajores cUSD
    console.log("Using cUSD address:", CUSD_ADDRESS, "\n");

    // 1. Deploy MockVerifier
    console.log("1️⃣ Deploying MockVerifier...");
    const mockVerifier = await hre.viem.deployContract("MockVerifier", [deployerAddress]);
    console.log("   MockVerifier deployed to:", mockVerifier.address, "\n");

    // 2. Deploy PoolVault
    console.log("2️⃣ Deploying PoolVault...");
    const poolVault = await hre.viem.deployContract("PoolVault", [CUSD_ADDRESS, deployerAddress]);
    console.log("   PoolVault deployed to:", poolVault.address, "\n");

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

    const riskRules = await hre.viem.deployContract("RiskRules", [
        deployerAddress,
        mockVerifier.address,
        riskRulesConfig.maxBorrowerBps,
        riskRulesConfig.maxUtilizationBps,
        riskRulesConfig.maxLoanDuration,
        riskRulesConfig.minAprBps,
        riskRulesConfig.maxAprBps,
        riskRulesConfig.minLoanAmount,
        riskRulesConfig.maxLoanAmount,
        riskRulesConfig.requireVerified,
    ]);
    console.log("   RiskRules deployed to:", riskRules.address, "\n");

    // 4. Deploy LoanManager
    console.log("4️⃣ Deploying LoanManager...");
    const agentFeeBps = 1000n; // 10% of interest goes to agent
    const agentTreasury = deployerAddress; // Use deployer as treasury for now

    const loanManager = await hre.viem.deployContract("LoanManager", [
        CUSD_ADDRESS,
        poolVault.address,
        riskRules.address,
        deployerAddress,
        agentTreasury,
        agentFeeBps,
    ]);
    console.log("   LoanManager deployed to:", loanManager.address, "\n");

    // 5. Configure PoolVault to use LoanManager
    console.log("5️⃣ Configuring PoolVault...");
    const hash = await poolVault.write.setLoanManager([loanManager.address]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("   LoanManager set on PoolVault ✅\n");

    // Summary
    console.log("=".repeat(60));
    console.log("✅ Deployment Complete!\n");
    console.log("Contract Addresses:");
    console.log("  MockVerifier:", mockVerifier.address);
    console.log("  PoolVault:", poolVault.address);
    console.log("  RiskRules:", riskRules.address);
    console.log("  LoanManager:", loanManager.address);
    console.log("\nConfiguration:");
    console.log("  cUSD Address:", CUSD_ADDRESS);
    console.log("  Agent Fee:", Number(agentFeeBps) / 100, "% of interest");
    console.log("  Max Borrower:", Number(riskRulesConfig.maxBorrowerBps) / 100, "% of pool");
    console.log("  Max Utilization:", Number(riskRulesConfig.maxUtilizationBps) / 100, "%");
    console.log("=".repeat(60));

    // Return addresses for use in seed script
    return {
        mockVerifier: mockVerifier.address,
        poolVault: poolVault.address,
        riskRules: riskRules.address,
        loanManager: loanManager.address,
        cUSD: CUSD_ADDRESS,
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
