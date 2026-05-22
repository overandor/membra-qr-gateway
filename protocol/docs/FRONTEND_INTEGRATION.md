# MEMBRA Protocol — Frontend Integration Guide

## Setup

```bash
# Install SDK (after publishing or using local path)
yarn add @membra/protocol-sdk

# Or reference the local SDK directly in tsconfig.json paths
```

---

## Provider Setup

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Connection, clusterApiUrl } from "@solana/web3.js";

// Configure for devnet or mainnet
const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet"),
  "confirmed"
);

const provider = new anchor.AnchorProvider(
  connection,
  wallet, // use @solana/wallet-adapter-react
  { commitment: "confirmed" }
);
anchor.setProvider(provider);
```

---

## IDO Integration

### Fetch IDO Status

```typescript
import { fetchIdoConfig, computeIdoProgress, findIdoConfigPda } from "@membra/protocol-sdk";

const config = await fetchIdoConfig(program, tokenMint);
if (!config) {
  console.log("IDO not initialized");
  return;
}

const progress = computeIdoProgress(config);
console.log(`Sold: ${progress.soldPct.toFixed(1)}%`);
console.log(`Raised: $${progress.raisedUsdc.toLocaleString()} USDC`);
console.log(`Active: ${progress.isActive}`);
```

### Buy IDO Tokens

```typescript
import { buildBuyIdo } from "@membra/protocol-sdk";
import { sendAndConfirmTransaction, Transaction } from "@solana/web3.js";

const ix = await buildBuyIdo(program, {
  idoConfig: idoConfigPda,
  tokenMint,
  paymentMint: usdcMint,
  paymentVault: idoConfig.paymentVault,
  user: wallet.publicKey,
  amount: new BN(1_000_000_000), // 1000 tokens (6 decimals)
});

const tx = new Transaction().add(ix);
const sig = await provider.sendAndConfirm(tx, []);
console.log("Purchase tx:", sig);
```

### Claim Tokens

```typescript
import { buildClaimIdoTokens } from "@membra/protocol-sdk";

const ix = await buildClaimIdoTokens(program, {
  idoConfig: idoConfigPda,
  tokenMint,
  tokenVault: idoConfig.tokenVault,
  user: wallet.publicKey,
});

const tx = new Transaction().add(ix);
await provider.sendAndConfirm(tx, []);
```

---

## Rebase Integration

### Display Current Index

```typescript
import { fetchRebaseState, buildRebaseSummary } from "@membra/protocol-sdk";

const state = await fetchRebaseState(program, tokenMint);
if (!state) return;

const summary = buildRebaseSummary(state);
console.log(`Current index: ${summary.currentIndexFormatted}`);
console.log(`Last rebase: ${summary.lastRebaseBps} bps`);
console.log(`TWAP: $${summary.lastTwapPriceUsd.toFixed(4)}`);
console.log(`Target: $${summary.targetPriceUsd.toFixed(4)}`);
```

### Compute Share Value

```typescript
import { computeRedeemableTokens } from "@membra/protocol-sdk";

// Example: user holds 1000 shares
const userShares = BigInt(1_000_000_000); // 1000 shares (6 decimals)
const globalIndex = BigInt(state.globalRebaseIndex.toString());
const redeemable = computeRedeemableTokens(userShares, globalIndex);
console.log(`Redeemable: ${Number(redeemable) / 1e6} MEMBRA`);
```

### Simulate Next Rebase

```typescript
import { computeRawRebaseBps, clampRebaseBps, simulateIndexUpdate } from "@membra/protocol-sdk";

const rawBps = computeRawRebaseBps({
  twapPriceUsd6: 600_000, // $0.60
  targetPriceUsd6: 550_000, // $0.55
  rebaseCoefficientBps: 5_000, // 50%
});

const clampedBps = clampRebaseBps(rawBps, 500, -500);
const currentIndex = BigInt(state.globalRebaseIndex.toString());
const nextIndex = simulateIndexUpdate(currentIndex, clampedBps);

console.log(`Raw rebase: ${rawBps} bps`);
console.log(`Clamped rebase: ${clampedBps} bps`);
console.log(`Projected next index: ${(Number(nextIndex) / 1e12).toFixed(6)}`);
```

---

## Staking/Rewards Integration

### Display User Stake

```typescript
import { fetchRewardsPool, fetchUserStake, buildStakeSummary } from "@membra/protocol-sdk";

const pool = await fetchRewardsPool(program, rewardMint, stakeMint);
const userStake = await fetchUserStake(program, rewardsPoolPda, wallet.publicKey);

if (pool && userStake) {
  const summary = buildStakeSummary(userStake, pool, Math.floor(Date.now() / 1000));
  console.log(`Staked: ${summary.stakedAmountFormatted} MEMBRA`);
  console.log(`Multiplier: ${summary.multiplierFormatted}`);
  console.log(`Lock status: ${summary.isLocked ? "Locked" : "Unlocked"}`);
  if (summary.lockEndDate) {
    console.log(`Lock ends: ${summary.lockEndDate.toLocaleDateString()}`);
  }
}
```

### Stake Tokens

```typescript
import { buildStake, LOCK_DURATIONS } from "@membra/protocol-sdk";

const ix = await buildStake(program, {
  rewardsPool: rewardsPoolPda,
  stakeMint,
  stakeVault: pool.stakeVault,
  user: wallet.publicKey,
  amount: new BN(1_000_000_000),
  lockDurationSeconds: new BN(LOCK_DURATIONS.DAYS_90), // 90-day lock
});
```

---

## Governance Integration

### Fetch All Proposals

```typescript
import { fetchGovernanceConfig, fetchAllProposals, describeProposalStatus, describeActionType } from "@membra/protocol-sdk";

const govConfig = await fetchGovernanceConfig(program, authorityPubkey);
if (!govConfig) return;

const proposals = await fetchAllProposals(program, govConfigPda, govConfig);
proposals.forEach((p) => {
  console.log(`#${p.id}: ${describeActionType(p.actionType)} — ${describeProposalStatus(p.status)}`);
});
```

### Check If Proposal Is Executable

```typescript
import { isProposalExecutable } from "@membra/protocol-sdk";

const { executable, reason } = isProposalExecutable(proposal, govConfig);
if (executable) {
  // Show "Execute" button
} else {
  // Show reason why not yet executable
  console.log(reason);
}
```

---

## Compliance Disclaimer (Required)

Display this notice wherever the protocol is described to users:

> MEMBRA is an elastic-supply Solana token with transparent rebase rules, oracle-based price monitoring, public lock incentives, and audited IDO flows. The protocol does not guarantee price, yield, dividends, or profit. Rewards are paid according to public staking and lock rules. Participating in IDOs and staking involves risk of loss. This is not financial advice.
