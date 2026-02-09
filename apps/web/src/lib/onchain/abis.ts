// PoolVault ABI - Non-custodial ERC20 vault
export const poolVaultAbi = [
    // Events
    { type: "event", name: "Deposit", inputs: [{ name: "sender", type: "address", indexed: true }, { name: "owner", type: "address", indexed: true }, { name: "assets", type: "uint256" }, { name: "shares", type: "uint256" }] },
    { type: "event", name: "Withdraw", inputs: [{ name: "sender", type: "address", indexed: true }, { name: "receiver", type: "address", indexed: true }, { name: "owner", type: "address", indexed: true }, { name: "assets", type: "uint256" }, { name: "shares", type: "uint256" }] },
    { type: "event", name: "LoanFunded", inputs: [{ name: "loanId", type: "uint256", indexed: true }, { name: "borrower", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
    { type: "event", name: "RepaymentReceived", inputs: [{ name: "loanId", type: "uint256", indexed: true }, { name: "principal", type: "uint256" }, { name: "interest", type: "uint256" }] },

    // Read functions
    { type: "function", name: "asset", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
    { type: "function", name: "totalAssets", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "totalShares", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "outstandingLoans", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "availableLiquidity", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "utilizationBps", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "shares", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "convertToAssets", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "convertToShares", inputs: [{ name: "assets", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "previewDeposit", inputs: [{ name: "assets", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "previewWithdraw", inputs: [{ name: "assets", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },

    // Write functions
    { type: "function", name: "deposit", inputs: [{ name: "assets", type: "uint256" }, { name: "receiver", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" },
    { type: "function", name: "withdraw", inputs: [{ name: "assets", type: "uint256" }, { name: "receiver", type: "address" }, { name: "owner", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" },
] as const;

// LoanManager ABI - Loan lifecycle management
export const loanManagerAbi = [
    // Events
    { type: "event", name: "LoanRequested", inputs: [{ name: "loanId", type: "uint256", indexed: true }, { name: "borrower", type: "address", indexed: true }, { name: "principal", type: "uint256" }, { name: "duration", type: "uint256" }, { name: "aprBps", type: "uint256" }] },
    { type: "event", name: "LoanDisbursed", inputs: [{ name: "loanId", type: "uint256", indexed: true }, { name: "borrower", type: "address", indexed: true }, { name: "principal", type: "uint256" }] },
    { type: "event", name: "LoanRepaid", inputs: [{ name: "loanId", type: "uint256", indexed: true }, { name: "principalPaid", type: "uint256" }, { name: "interestPaid", type: "uint256" }] },
    { type: "event", name: "LoanClosed", inputs: [{ name: "loanId", type: "uint256", indexed: true }] },

    // Read functions
    { type: "function", name: "loans", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "borrower", type: "address" }, { name: "principal", type: "uint256" }, { name: "aprBps", type: "uint256" }, { name: "startTime", type: "uint256" }, { name: "duration", type: "uint256" }, { name: "principalRepaid", type: "uint256" }, { name: "interestPaid", type: "uint256" }, { name: "active", type: "bool" }, { name: "disbursed", type: "bool" }], stateMutability: "view" },
    { type: "function", name: "getLoan", inputs: [{ name: "loanId", type: "uint256" }], outputs: [{ name: "borrower", type: "address" }, { name: "principal", type: "uint256" }, { name: "aprBps", type: "uint256" }, { name: "startTime", type: "uint256" }, { name: "duration", type: "uint256" }, { name: "principalRepaid", type: "uint256" }, { name: "interestPaid", type: "uint256" }, { name: "active", type: "bool" }, { name: "disbursed", type: "bool" }], stateMutability: "view" },
    { type: "function", name: "nextLoanId", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "accruedInterest", inputs: [{ name: "loanId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "totalOwed", inputs: [{ name: "loanId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "totalAgentFees", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "borrowerLoans", inputs: [{ name: "borrower", type: "address" }], outputs: [{ type: "uint256[]" }], stateMutability: "view" },

    // Write functions
    { type: "function", name: "requestLoan", inputs: [{ name: "principal", type: "uint256" }, { name: "duration", type: "uint256" }, { name: "aprBps", type: "uint256" }, { name: "metadataHash", type: "bytes32" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" },
    { type: "function", name: "repay", inputs: [{ name: "loanId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "closeLoan", inputs: [{ name: "loanId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

// RiskRules ABI - Lending guardrails
export const riskRulesAbi = [
    { type: "function", name: "validateNewLoan", inputs: [{ name: "borrower", type: "address" }, { name: "principal", type: "uint256" }, { name: "duration", type: "uint256" }, { name: "aprBps", type: "uint256" }, { name: "poolAssets", type: "uint256" }, { name: "poolOutstanding", type: "uint256" }], outputs: [{ name: "ok", type: "bool" }, { name: "reason", type: "string" }], stateMutability: "view" },
    { type: "function", name: "maxBorrowerBps", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "maxUtilizationBps", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "maxLoanDuration", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "minAprBps", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "maxAprBps", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "minLoanAmount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "maxLoanAmount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "requireVerifiedBorrower", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
] as const;

// Standard ERC20 ABI
export const erc20Abi = [
    { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
    { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
    { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
    { type: "function", name: "totalSupply", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
    { type: "function", name: "transfer", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
    { type: "function", name: "transferFrom", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
] as const;
