# MEMBRA Money Protocol — Technical Specification

## Overview

MEMBRA is an elastic-supply Solana token with transparent rebase rules, oracle-based price monitoring, public lock incentives, and audited IDO flows. **The protocol does not guarantee price, yield, dividends, or profit. Rewards are paid according to public staking and lock rules.**

---

## Programs

| Program | Description |
|---|---|
| `membra_ido` | Token sale (IDO) with USDC payment, vesting, refunds |
| `membra_rebase` | Oracle-gated elastic-supply index management |
| `membra_rewards` | Public staking and lock incentives |
| `membra_governance` | Multisig proposal and treasury control |

---

## 1. IDO Program

### Design

- Buyers deposit USDC into a protocol-controlled `payment_vault` PDA.
- IDO tokens remain locked in a `token_vault` PDA until finalization.
- Users claim tokens only after `finalize_ido` is executed and `claim_start_ts` has passed.
- If the IDO is cancelled, buyers call `refund_ido` to recover USDC.
- Unsold tokens are either burned or transferred to treasury per `unsold_burn` config flag.

### Key State Fields

```
token_price_usd_6:   price per token in USDC (6 decimal places)
hard_cap_tokens:     maximum tokens available for sale
min/max_purchase:    per-transaction limits
start_ts / end_ts:   Unix timestamps bounding the sale window
claim_start_ts:      earliest timestamp for token claims post-finalization
finalized:           set by authority after IDO ends; enables claims
cancelled:           set by governance; enables refunds
paused:              emergency pause; blocks buys
```

### Allocations

Team, treasury, advisor, and ecosystem allocations **must** use time-locked vesting positions in `membra_rewards`. No allocation may be unlocked without a governance proposal unless the vesting schedule is hard-coded in the program state.

### Treasury Safety

The `payment_vault` can only be accessed via a `WithdrawFunds` governance proposal that has been:
1. Created by a multisig signer.
2. Approved by ≥ threshold signers.
3. Executed after the timelock elapses.

---

## 2. Rebase Program

### Design

MEMBRA uses a **shares/index accounting model**. The protocol does not attempt to mutate every holder's SPL token balance (impossible with standard SPL).

Instead:
- `global_rebase_index` starts at `1,000,000,000,000` (1e12 = 1.0).
- Users deposit MEMBRA and receive `shares` in a `UserRebaseAccount`.
- Redeemable tokens = `shares × global_rebase_index / 1e12`.
- When the index increases (positive rebase), each share is worth more tokens.
- When the index decreases (negative rebase), each share is worth fewer tokens.

### Rebase Formula

```
deviation_bps = (twap_price - target_price) / target_price × 10_000

raw_rebase_bps = -deviation_bps × rebase_coefficient_bps / 10_000

final_rebase_bps = clamp(raw_rebase_bps, max_negative_rebase_bps, max_positive_rebase_bps)

new_index = old_index × (10_000 + final_rebase_bps) / 10_000
```

### Monitoring Band

The protocol monitors a target value band of **$0.10–$1.00**. This band is **informational only**. The rebase mechanism does not guarantee the token price stays within any range.

### Rebase Execution

`execute_rebase` is permissionless (any keeper can call it) when:
- Not paused.
- Minimum epoch duration has elapsed.
- Oracle price is not stale.
- Volatility circuit breaker is not tripped.

### Circuit Breakers

| Condition | Action |
|---|---|
| Oracle price stale | Block rebase execution |
| Volatility > circuit_breaker_bps in one epoch | Block rebase; emit event |
| Governance-triggered pause | Block all rebase activity |
| Epoch not elapsed | Block rebase execution |

---

## 3. Rewards Program

### Design

Public, transparent, on-chain staking and lock incentives. All users follow the same rule set. Rewards are **not guaranteed** — they depend on the emission rate and available pool balance.

### Lock Tiers

| Duration | Multiplier |
|---|---|
| Flexible (0 days) | 1.00× |
| 30 days | 1.00× |
| 90 days | 1.25× |
| 180 days | 1.50× |
| 365 days | 2.00× |

### Pro-Rata Distribution

Rewards are distributed proportionally to `weighted_shares`:

```
weighted_shares = staked_amount × reward_multiplier_bps / 10_000

accumulated_reward_per_share += emission × elapsed / total_weighted_shares

pending_rewards = weighted_shares × accumulated_reward_per_share / 1e12 - reward_debt
```

### Early Exit Penalty

If a user unstakes before `lock_end_ts`:
- A penalty of `early_exit_penalty_bps / 10_000 × staked_amount` is deducted.
- The penalty is transferred to the `penalty_destination` (treasury or reward pool).
- This is **publicly visible on-chain** and applies equally to all users.

### Compliance Note

Rewards are denominated as "protocol rewards" or "lock incentives." They are not dividends, guaranteed returns, or profit. The reward pool may run out.

---

## 4. Governance Program

### Design

A multisig-gated proposal system. No treasury action can be taken without going through the full proposal lifecycle.

### Proposal Lifecycle

```
ProposeAction → ApproveAction (repeat until threshold) → timelock elapses → ExecuteApprovedAction
                                                     ↘ CancelAction (if needed)
```

### Configurable Parameters

| Parameter | Description |
|---|---|
| `approval_threshold` | Minimum approvals required (e.g. 2-of-3) |
| `timelock_seconds` | Delay after approval before execution (e.g. 86400 = 24h) |
| `execution_window_seconds` | Window to execute after timelock (e.g. 172800 = 48h) |

### Action Types

| Action | Description |
|---|---|
| `WithdrawFunds` | Move funds from treasury to approved destination |
| `SeedLiquidity` | Deploy treasury funds to a liquidity pool |
| `BurnUnsoldTokens` | Burn tokens remaining after IDO |
| `MoveRewardsToVault` | Fund the rewards pool from treasury |
| `UpdateRebaseParams` | Adjust oracle thresholds, epoch duration, coefficients |
| `PauseProtocol` | Emergency pause of any sub-program |
| `ResumeProtocol` | Lift a pause |
| `UpdateGovernanceParams` | Change signers, threshold, or timelock |
| `EmergencyPause` | Immediate cross-program pause (bypasses normal queue) |

---

## Holder Analytics (Read-Only)

The protocol may track the following metrics for governance risk assessment:

- `holder_count`, `top_10_holder_percentage`, `gini_coefficient`
- `circulating_supply`, `locked_supply`, `staked_supply`, `treasury_supply`
- `liquidity_pool_depth`, `average_lock_duration`, `daily_unlock_amount`

**These are used only for risk scoring and governance recommendations. The protocol does not use them to directly manipulate supply or prices.**

---

## What This Protocol Does NOT Do

- Does not guarantee any price range
- Does not manufacture intraday volatility
- Does not randomly adjust supply
- Does not pay whales privately to avoid selling
- Does not issue dividends or guaranteed returns
- Does not allow direct treasury withdrawal without governance approval
- Does not have a single admin key that can bypass multisig controls
