import hre from "hardhat";
import { formatEther, parseEther } from "viem";

/**
 * Seed script demonstrating full Clenja flow:
 * 1. 3 lenders deposit cUSD
 * 2. Borrower gets verified
 * 3. Borrower requests loan
 * 4. Owner approves and disburses
 * 5. Borrower repays twice
 * 6. Loan closes, agent fee collected
 * 
 * Usage: pnpm --filter contracts run seed:alfajores
 */

// Contract addresses (update after deployment)
const ADDRESSES = {
    mockVerifier: process.env.MOCK_VERIFIER_ADDRESS || "",
    poolVault: process.env.POOL_VAULT_ADDRESS || "",
    riskRules: process.env.RISK_RULES_ADDRESS || "",
    loanManager: process.env.LOAN_MANAGER_ADDRESS || "",
    cUSD: process.env.CUSD_ADDRESS || "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
};

async function main() {
    console.log("🌱 Running Clenja Seed Script...\n");

    // Verify all addresses are set
    for (const [name, addr] of Object.entries(ADDRESSES)) {
        if (!addr) {
            throw new Error(`Missing ${name} address. Please set environment variables.`);
        }
    }

    // Get clients
    const [owner, lender1, lender2, lender3, borrower] = await hre.network.provider.getWalletClients();
    const publicClient = await hre.network.provider.getPublicClient();

    console.log("Accounts:");
    console.log("  Owner:   ", owner.account.address);
    console.log("  Lender1: ", lender1.account.address);
    console.log("  Lender2: ", lender2.account.address);
    console.log("  Lender3: ", lender3.account.address);
    console.log("  Borrower:", borrower.account.address);
    console.log("");

    // Get contract instances
    const mockVerifier = await hre.viem.getContractAt("MockVerifier", ADDRESSES.mockVerifier as `0x${string}`);
    const poolVault = await hre.viem.getContractAt("PoolVault", ADDRESSES.poolVault as `0x${string}`);
    const loanManager = await hre.viem.getContractAt("LoanManager", ADDRESSES.loanManager as `0x${string}`);
    const cUSD = await hre.viem.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", ADDRESSES.cUSD as `0x${string}`);

    // Helper to wait for tx
    const waitTx = async (hash: `0x${string}`) => {
        await publicClient.waitForTransactionReceipt({ hash });
    };

    // === PHASE 1: Lenders Deposit ===
    console.log("=".repeat(60));
    console.log("📥 PHASE 1: Lenders Deposit cUSD");
    console.log("=".repeat(60));

    const depositAmount = parseEther("1000"); // $1000 each

    // Lender 1 deposits
    console.log("\nLender 1 depositing $1000...");
    let hash = await cUSD.write.approve([ADDRESSES.poolVault as `0x${string}`, depositAmount], { account: lender1.account });
    await waitTx(hash);
    const vaultWithLender1 = await hre.viem.getContractAt("PoolVault", ADDRESSES.poolVault as `0x${string}`, { client: { wallet: lender1 } });
    hash = await vaultWithLender1.write.deposit([depositAmount, lender1.account.address]);
    await waitTx(hash);
    console.log("  ✅ Lender 1 deposited");

    // Lender 2 deposits
    console.log("\nLender 2 depositing $1000...");
    hash = await cUSD.write.approve([ADDRESSES.poolVault as `0x${string}`, depositAmount], { account: lender2.account });
    await waitTx(hash);
    const vaultWithLender2 = await hre.viem.getContractAt("PoolVault", ADDRESSES.poolVault as `0x${string}`, { client: { wallet: lender2 } });
    hash = await vaultWithLender2.write.deposit([depositAmount, lender2.account.address]);
    await waitTx(hash);
    console.log("  ✅ Lender 2 deposited");

    // Lender 3 deposits
    console.log("\nLender 3 depositing $1000...");
    hash = await cUSD.write.approve([ADDRESSES.poolVault as `0x${string}`, depositAmount], { account: lender3.account });
    await waitTx(hash);
    const vaultWithLender3 = await hre.viem.getContractAt("PoolVault", ADDRESSES.poolVault as `0x${string}`, { client: { wallet: lender3 } });
    hash = await vaultWithLender3.write.deposit([depositAmount, lender3.account.address]);
    await waitTx(hash);
    console.log("  ✅ Lender 3 deposited");

    // Check pool stats
    const totalAssets = await poolVault.read.totalAssets();
    console.log("\n📊 Pool Status:");
    console.log("  Total Assets:     $" + formatEther(totalAssets));
    console.log("  Available:        $" + formatEther(await poolVault.read.availableLiquidity()));

    // === PHASE 2: Verify Borrower ===
    console.log("\n" + "=".repeat(60));
    console.log("✅ PHASE 2: Verify Borrower (SelfClaw)");
    console.log("=".repeat(60));

    console.log("\nSetting borrower as verified...");
    hash = await mockVerifier.write.setVerified([borrower.account.address, true]);
    await waitTx(hash);
    console.log("  ✅ Borrower verified");

    // === PHASE 3: Request Loan ===
    console.log("\n" + "=".repeat(60));
    console.log("💰 PHASE 3: Borrower Requests Loan");
    console.log("=".repeat(60));

    const loanPrincipal = parseEther("100");  // $100 loan
    const loanDuration = 30n * 24n * 60n * 60n; // 30 days
    const loanAprBps = 1200n; // 12% APR
    const metadataHash = "0x0000000000000000000000000000000000000000000000000000000000000001" as `0x${string}`;

    console.log("\nBorrower requesting $100 loan at 12% APR for 30 days...");
    const loanManagerWithBorrower = await hre.viem.getContractAt("LoanManager", ADDRESSES.loanManager as `0x${string}`, { client: { wallet: borrower } });
    hash = await loanManagerWithBorrower.write.requestLoan([loanPrincipal, loanDuration, loanAprBps, metadataHash]);
    await waitTx(hash);
    console.log("  ✅ Loan requested (ID: 1)");

    // === PHASE 4: Approve and Disburse ===
    console.log("\n" + "=".repeat(60));
    console.log("🏦 PHASE 4: Owner Approves and Disburses");
    console.log("=".repeat(60));

    const borrowerBalanceBefore = await cUSD.read.balanceOf([borrower.account.address]);

    console.log("\nOwner approving and disbursing loan...");
    hash = await loanManager.write.approveAndDisburse([1n]);
    await waitTx(hash);

    const borrowerBalanceAfter = await cUSD.read.balanceOf([borrower.account.address]);
    console.log("  ✅ Loan disbursed");
    console.log("  Borrower received: $" + formatEther(borrowerBalanceAfter - borrowerBalanceBefore));

    console.log("\n📊 Pool Status After Disbursement:");
    console.log("  Total Assets:      $" + formatEther(await poolVault.read.totalAssets()));
    console.log("  Outstanding Loans: $" + formatEther(await poolVault.read.outstandingLoans()));
    console.log("  Available:         $" + formatEther(await poolVault.read.availableLiquidity()));
    console.log("  Utilization:       " + Number(await poolVault.read.utilizationBps()) / 100 + "%");

    // === PHASE 5: Repayments ===
    console.log("\n" + "=".repeat(60));
    console.log("💸 PHASE 5: Borrower Makes Repayments");
    console.log("=".repeat(60));

    // First repayment: $50
    const repayment1 = parseEther("50");
    console.log("\nFirst repayment: $50...");

    // Borrower approves cUSD for repayment
    const cUSDWithBorrower = await hre.viem.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", ADDRESSES.cUSD as `0x${string}`, { client: { wallet: borrower } });
    hash = await cUSDWithBorrower.write.approve([ADDRESSES.loanManager as `0x${string}`, repayment1]);
    await waitTx(hash);

    hash = await loanManagerWithBorrower.write.repay([1n, repayment1]);
    await waitTx(hash);
    console.log("  ✅ First repayment complete");

    let loan = await loanManager.read.getLoan([1n]);
    console.log("  Principal Repaid: $" + formatEther(loan.principalRepaid));
    console.log("  Interest Paid:    $" + formatEther(loan.interestPaid));

    // Second repayment: remaining balance
    const totalOwed = await loanManager.read.totalOwed([1n]);
    console.log("\nSecond repayment: $" + formatEther(totalOwed) + " (remaining balance)...");

    hash = await cUSDWithBorrower.write.approve([ADDRESSES.loanManager as `0x${string}`, totalOwed]);
    await waitTx(hash);

    hash = await loanManagerWithBorrower.write.repay([1n, totalOwed]);
    await waitTx(hash);
    console.log("  ✅ Second repayment complete");

    loan = await loanManager.read.getLoan([1n]);
    console.log("  Principal Repaid: $" + formatEther(loan.principalRepaid));
    console.log("  Interest Paid:    $" + formatEther(loan.interestPaid));

    // === PHASE 6: Close Loan ===
    console.log("\n" + "=".repeat(60));
    console.log("🔒 PHASE 6: Close Loan & Check Agent Fee");
    console.log("=".repeat(60));

    console.log("\nClosing loan...");
    hash = await loanManagerWithBorrower.write.closeLoan([1n]);
    await waitTx(hash);
    console.log("  ✅ Loan closed");

    const agentFees = await loanManager.read.totalAgentFees();
    console.log("\n📊 Final Stats:");
    console.log("  Total Agent Fees Collected: $" + formatEther(agentFees));
    console.log("  Pool Total Assets:          $" + formatEther(await poolVault.read.totalAssets()));
    console.log("  Pool Outstanding Loans:     $" + formatEther(await poolVault.read.outstandingLoans()));

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Seed Script Complete!");
    console.log("=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
