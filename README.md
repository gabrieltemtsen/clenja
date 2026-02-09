# Clenja - Cooperative Micro-Lending on Celo

A non-custodial cooperative micro-lending platform powered by smart contracts and AI agents.

## Features

- 🏦 **Non-Custodial Pool**: Lenders deposit cUSD and earn yield from loan interest
- 🤖 **AI Agent**: Get loan quotes, check eligibility, and track loans via chat
- ⚡ **x402 Monetization**: Premium APIs with crypto micropayments
- 🔒 **Verified Borrowers**: SelfClaw integration for identity verification
- 📊 **Deterministic Rules**: Transparent lending guardrails in smart contracts

## Project Structure

```
clenja/
├── apps/
│   └── web/              # Next.js 16 frontend
│       ├── src/app/      # Pages and API routes
│       └── src/lib/      # Shared libraries
├── packages/
│   └── contracts/        # Solidity smart contracts
│       ├── contracts/    # Core contracts
│       └── scripts/      # Deploy and seed scripts
└── pnpm-workspace.yaml   # Monorepo config
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- A wallet with Celo Alfajores testnet cUSD

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd clenja

# Install dependencies
pnpm install

# Copy environment files
cp apps/web/.env.example apps/web/.env.local
cp packages/contracts/.env.example packages/contracts/.env
```

### Environment Variables

**Web App (`apps/web/.env.local`)**
```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_POOL_VAULT_ADDRESS=0x...
NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_RISK_RULES_ADDRESS=0x...
CLENJA_TREASURY_ADDRESS=0x...
```

**Contracts (`packages/contracts/.env`)**
```
ALFAJORES_RPC_URL=https://alfajores-forno.celo-testnet.org
CELO_RPC_URL=https://forno.celo.org
PRIVATE_KEY=0x...
CUSD_ADDRESS=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
```

### Deploy Contracts (Alfajores)

```bash
cd packages/contracts
pnpm run deploy:alfajores
```

### Run the Web App

```bash
cd apps/web
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Contracts

| Contract | Description |
|----------|-------------|
| `PoolVault.sol` | Non-custodial ERC20 vault with share accounting |
| `RiskRules.sol` | Deterministic lending guardrails |
| `LoanManager.sol` | Loan lifecycle, interest, and agent fees |
| `MockVerifier.sol` | Test verification contract |

## API Routes

| Endpoint | Type | Description |
|----------|------|-------------|
| `GET /api/pool/stats` | Free | Pool TVL, utilization |
| `GET /api/loan/[id]` | Free | Loan details |
| `POST /api/chat` | Free | AI agent chat |
| `POST /api/loan/underwrite` | x402 ($0.10) | Loan recommendation |
| `POST /api/trust/packet` | x402 ($0.25) | Verification + history |

## Agent Tools

The AI agent can:
- Get pool statistics
- Quote loan terms with interest calculations
- Check borrower eligibility
- List active loans
- Calculate repayment amounts

## Demo Flow

1. **Connect Wallet** on the landing page
2. **Deposit** cUSD to become a lender
3. **Borrow** (after verification) to get a loan
4. **Chat** with the agent for assistance
5. **Repay** loans to build credit
6. **Withdraw** your deposits plus yield

## Development

```bash
# Run all workspaces
pnpm dev

# Build contracts
pnpm --filter contracts compile

# Run web app
pnpm --filter web dev
```

## License

MIT

## Team

Built for Celo hackathon 2024
