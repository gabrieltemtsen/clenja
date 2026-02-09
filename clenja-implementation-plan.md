# Clenja — Implementation Plan (AI-Agent Ready)
**Goal:** Ship a non-custodial cooperative micro‑lending + payments agent on Celo with great UX, real transactions, and monetization via x402, plus optional Paycrest off‑ramp.

This plan is written so an IDE agent (Codex or similar) can “cook” from an empty repo using **standard quickstart commands** (no hand‑creating boilerplate), while keeping dependencies current by relying on official scaffolds (`create-next-app`, Hardhat init, etc.).

---

## 1) Target MVP (what must exist in the demo)
### User-facing flows (MiniPay-first UX)
1. **Deposit** cUSD → receive vault shares.
2. **Borrow** (SelfClaw verified) → agent proposes terms → onchain disbursement if rules pass.
3. **Repay** → repayment auto-splits principal + interest; agent takes fee **from interest only**.
4. **Withdraw** cUSD from vault.
5. **Cash out** (optional) → Paycrest off‑ramp order + webhook status updates.

### Safety promise (“nobody can run away with money”)
- Lender funds sit in **PoolVault** contract.
- Only **LoanManager** can move funds out for loans, constrained by **RiskRules**.
- Admin controls are minimal and time-locked or limited to parameter changes (caps, fee bps).

### Monetization (x402)
- x402 paywalls **value actions** (not simple viewing):
  - underwriting/term proposal (`/api/loan/underwrite`)
  - trust packet (`/api/trust/packet`)
  - off‑ramp order creation (`/api/offramp/create`) — if Paycrest enabled

---

## 2) Tech stack (recommended)
- **Monorepo:** pnpm workspaces
- **Web/App:** Next.js (TypeScript) + Tailwind + Vercel AI SDK
- **Contracts:** Hardhat + OpenZeppelin
- **Chain interaction:** viem (preferred)
- **Agent onchain tooling:** GOAT toolkit (Celo-recommended)
- **Payments:** thirdweb x402 (server + client)
- **Verification:** SelfClaw (gate borrowers)
- **Off-ramp:** Paycrest (optional but strong UX)

---

## 3) Official docs to keep open
- Celo: Build with AI overview: https://docs.celo.org/build-on-celo/build-with-ai/overview
- Celo: AI tools list: https://docs.celo.org/build-on-celo/build-with-ai/tools
- Celo: Build with GOAT (example): https://docs.celo.org/build-on-celo/build-with-ai/build-with-goat/send-token-agent
- MiniPay overview: https://docs.celo.org/build-on-celo/build-on-minipay/overview
- MiniPay quickstart: https://docs.celo.org/build-on-celo/build-on-minipay/quickstart
- thirdweb x402: https://portal.thirdweb.com/x402
- x402 server: https://portal.thirdweb.com/x402/server
- x402 client: https://portal.thirdweb.com/x402/client
- ERC‑8004 contracts: https://github.com/erc-8004/erc-8004-contracts
- SelfClaw: https://github.com/mbarbosa30/SelfClaw
- Paycrest docs: https://docs.paycrest.io/introduction

---

## 4) Repo initialization (no manual boilerplate)
> Assumes you start from an empty Git repo named `clenja`.

### 4.1 Prereqs (local)
- Node.js **LTS** (use `nvm install --lts` if needed)
- pnpm (recommended): `corepack enable` then `corepack prepare pnpm@latest --activate`

### 4.2 Create workspace root
**Commands**
```bash
git clone <YOUR_EMPTY_REPO_URL> clenja
cd clenja

# Use pnpm workspaces
pnpm init -y

# Create workspace folders
mkdir -p apps packages docs
```

Create a minimal workspace config (small file, acceptable to write by hand):
- `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 4.3 Scaffold Next.js app (standard generator)
```bash
cd apps
pnpm dlx create-next-app@latest web --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
cd web
pnpm add ai viem zod
```

> Notes:
- `ai` = Vercel AI SDK package name
- `viem` = wallet + contract calls
- `zod` = strict schema validation for tool outputs + API contracts

### 4.4 Scaffold Hardhat project (standard init)
```bash
cd ../../packages
mkdir contracts
cd contracts
pnpm init -y
pnpm add -D hardhat @nomicfoundation/hardhat-toolbox typescript ts-node dotenv
pnpm add @openzeppelin/contracts
pnpm dlx hardhat@latest init
```

Choose:
- “Create a TypeScript project” if prompted.

### 4.5 Optional: create `packages/sdk` (thin TS wrapper)
```bash
cd ../
mkdir sdk
cd sdk
pnpm init -y
pnpm add viem zod
pnpm add -D typescript
```

---

## 5) Standard structure (what the agent should maintain)
### 5.1 Contracts package
`packages/contracts/contracts/`
- `PoolVault.sol`
- `LoanManager.sol`
- `RiskRules.sol`
- `interfaces/IVerification.sol`

`scripts/`
- `deploy.ts`
- `seed.ts` (demo helpers)

`test/`
- `poolvault.test.ts`
- `loans.test.ts`
- `rules.test.ts`

### 5.2 Web app package
`apps/web/src/`
- `app/` routes (UI)
- `app/api/` route handlers
- `lib/agent/` tools + agent runner
- `lib/onchain/` viem clients + contract wrappers
- `lib/payments/` x402 helpers
- `lib/paycrest/` Paycrest client + webhook verification
- `components/` UI

---

## 6) Contract specs (MVP-grade, testable)
### 6.1 PoolVault (non-custodial vault)
**Minimum functions**
- `deposit(uint256 assets, address receiver) returns (uint256 shares)`
- `withdraw(uint256 assets, address receiver, address owner) returns (uint256 sharesBurned)`
- `convertToShares(uint256 assets) view returns (uint256)`
- `convertToAssets(uint256 shares) view returns (uint256)`
- `setLoanManager(address lm)` (onlyOwner, one-time or guarded)
- `fundLoan(uint256 loanId, address borrower, uint256 amount)` (onlyLoanManager)

**Events**
- `Deposit(caller, owner, assets, shares)`
- `Withdraw(caller, receiver, owner, assets, shares)`
- `LoanFunded(loanId, borrower, amount)`
- `RepaymentObserved(loanId, amount)` (optional)

### 6.2 RiskRules (deterministic guardrails)
**Config values**
- `maxBorrowerBps` (e.g. 500 = 5% of pool)
- `maxUtilizationBps` (e.g. 8000 = 80%)
- `maxLoanDuration`
- `minAprBps`, `maxAprBps`
- `requireVerifiedBorrower`
- `verifier` (SelfClaw adapter)

**Function**
- `validateNewLoan(borrower, principal, duration, aprBps, poolAssets, poolOutstanding) view returns (bool ok, string reason)`

### 6.3 LoanManager (loan lifecycle + interest split)
**Loan struct**
- borrower, principal, principalRepaid, aprBps, startTime, duration, lastPaymentTime, active

**Minimum functions**
- `requestLoan(principal, duration, aprBps, metadataHash) returns (loanId)`
- `approveAndDisburse(loanId)` (checks rules → calls vault.fundLoan)
- `repay(loanId, amount)` (transferFrom borrower → vault; compute interest since last pay; take agent fee from interest only)
- `closeLoan(loanId)`

**Agent fee**
- `agentFeeBps` (e.g. 1000 = 10% of interest)
- `agentTreasury`

**Events**
- `LoanRequested(loanId, borrower, principal, duration, aprBps, metadataHash)`
- `LoanDisbursed(loanId, borrower, principal)`
- `LoanRepaid(loanId, borrower, amount, interestPortion, principalPortion, agentFee)`
- `LoanClosed(loanId)`

**Interest math (simple + explainable)**
- linear interest accrued between payments:
  - `interest = remainingPrincipal * aprBps/10000 * elapsedSeconds / 365 days`

---

## 7) Web/API plan (tool-calling agent, best UX)
### 7.1 Pages (minimum)
- `/` landing + connect
- `/deposit`
- `/borrow`
- `/repay`
- `/withdraw`
- `/cashout` (Paycrest optional)
- `/agent` (chat UX)

### 7.2 API routes
#### Free routes
- `GET /api/pool/stats`
- `GET /api/loan/:id`

#### x402 paid routes (revenue)
- `POST /api/loan/underwrite`
  - input: borrower address, amount, duration
  - output: recommended apr, max amount, repayment schedule, eligibility
- `POST /api/trust/packet`
  - output: SelfClaw verification status + repayment history summary
- `POST /api/offramp/create` (if Paycrest enabled)
  - output: off-ramp order id + status URL

#### Paycrest webhook
- `POST /api/offramp/webhook`
  - verify signature/secret, update local db status, return 200

### 7.3 Agent tool registry (Vercel AI SDK + GOAT style)
Define tools with strict schemas:
- `getPoolStats`
- `quoteLoan`
- `requestLoan`
- `approveAndDisburse`
- `repayLoan`
- `createOfframpOrder`
- `getOfframpStatus`

---

## 8) Sequenced build milestones (ship order)
### Milestone 1 (Day 1–2): skeletons + connectivity
- Next.js UI scaffolding, routes, basic layout
- Hardhat project compiles, deploy script placeholder
- viem client can read chain ID + balances

**Acceptance**
- `pnpm -r dev` runs web
- `pnpm --filter contracts test` runs default test

### Milestone 2 (Day 2–5): core contracts + tests
- Implement PoolVault + LoanManager + RiskRules
- Unit tests for shares, rule enforcement, repayments

**Acceptance**
- local deployment + seed script can:
  - deposit from 3 lenders
  - create + disburse 1 loan
  - repay twice and close
  - agent fee collected

### Milestone 3 (Day 5–7): UX flows wired to contracts
- Deposit/borrow/repay/withdraw pages interact with contracts via viem
- Clean error handling + transaction states

**Acceptance**
- full happy-path through UI on testnet

### Milestone 4 (Day 7–10): SelfClaw gating + x402 monetization
- Borrow flow checks verification
- Implement x402 paywall on underwriting endpoint
- Agent chat calls tools and guides user

**Acceptance**
- unpaid calls get 402
- paid calls succeed and return results

### Milestone 5 (Day 10–13): Paycrest off-ramp (optional but strong)
- Create order + webhook status updates
- Cashout UI

**Acceptance**
- cashout creates an order and status updates appear

### Milestone 6 (Day 13–15): polish + demo
- demo script + screenshots + short video
- verify contracts + finalize docs

---

## 9) “High priority features” (strict)
1. PoolVault deposit/withdraw + share accounting
2. LoanManager lifecycle + interest split + agent fee
3. RiskRules enforcement (caps + utilization)
4. Borrower verification gate (SelfClaw)
5. Clean mobile-first UX (happy path)
6. x402 underwriting paywall
7. Seed script for demo

Optional but valuable:
- Paycrest off-ramp
- ERC-8004 reputation/validation events (if time)

---

## 10) Commands cheat sheet (for the IDE agent)
### Install all
```bash
pnpm -r install
```

### Run web
```bash
pnpm --filter web dev
```

### Compile contracts
```bash
pnpm --filter contracts run compile
```

### Test contracts
```bash
pnpm --filter contracts test
```

### Deploy (Alfajores)
```bash
pnpm --filter contracts run deploy:alfajores
```

---

## 11) Environment variables templates
### `apps/web/.env.local`
- `NEXT_PUBLIC_RPC_URL=`
- `NEXT_PUBLIC_CHAIN_ID=`
- `NEXT_PUBLIC_POOL_VAULT_ADDRESS=`
- `NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=`
- `NEXT_PUBLIC_RISK_RULES_ADDRESS=`
- `PAYCREST_API_KEY=` (optional)
- `PAYCREST_WEBHOOK_SECRET=` (optional)
- `X402_RECEIVER_ADDRESS=`
- `X402_SIGNER_KEY=` (server-side only)

### `packages/contracts/.env`
- `RPC_URL=`
- `PRIVATE_KEY=`
- `VERIFY_API_KEY=` (optional)

---

## 12) Security notes (keep it realistic)
- No upgradeable proxies in MVP (reduces complexity).
- Parameter changes limited and emitted via events.
- Consider a “pause” circuit breaker on LoanManager only (optional).

---

## 13) Demo script (2 minutes)
1. Lender A/B/C deposit cUSD into PoolVault.
2. Borrower passes SelfClaw check.
3. Agent runs paid underwriting (x402) and proposes terms.
4. Borrower accepts → requestLoan + approveAndDisburse.
5. Borrower repays twice → show interest split + agent fee.
6. Lender withdraws; (optional) uses Paycrest cashout.

---

# End
If you follow this plan, you’ll have a clean, standard scaffolded project with a strong safety story and visible real-world payments utility.
