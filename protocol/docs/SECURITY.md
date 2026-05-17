# MEMBRA Protocol — Security Notes

## Pre-Audit Checklist

**This protocol is NOT production-ready until an independent security audit is completed and all findings are remediated.**

---

## Known Security Properties

### 1. Authority Controls

- All privileged instructions require the configured `authority` or `governance` signer.
- `authority` is set at initialization and can only be changed via a `UpdateGovernanceParams` proposal.
- There is no hidden backdoor or emergency admin key that bypasses governance.

### 2. Arithmetic Safety

- All arithmetic operations use Rust's `checked_add`, `checked_sub`, `checked_mul`, `checked_div`.
- All `None` results from checked math return `ArithmeticOverflow` error.
- Intermediate BPS calculations use `i128` to prevent overflow on 64-bit values.
- The `global_rebase_index` uses `u128` to support 12 decimal places of precision without overflow.

### 3. Reentrancy

- Anchor programs are not susceptible to Ethereum-style reentrancy by default.
- All state mutations occur before CPI transfers (checks-effects-interactions).
- No program stores intermediate state that could be exploited during a CPI.

### 4. Oracle Safety

- Oracle price staleness is checked before every rebase execution.
- Oracle confidence interval is validated on every price update.
- A volatility circuit breaker blocks execution if price moves by more than `volatility_circuit_breaker_bps` in one epoch.
- Manual oracle mode (source=2) requires governance authorization.
- A single spot price cannot trigger a large rebase — the `rebase_coefficient_bps` dampens the formula.

### 5. Treasury Safety

- No instruction exists to transfer treasury funds without a governance-approved proposal.
- The `payment_vault` (IDO proceeds) PDA is authority-gated.
- The `reward_vault` can only receive funds via `MoveRewardsToVault` governance action.
- All treasury movements are logged with on-chain events.

### 6. Double-Spend Prevention

- `UserIdoRecord.tokens_claimed` prevents double-claiming IDO tokens.
- `UserIdoRecord.refunded` prevents double-refunding.
- `LockRecord.closed` prevents double-closing.
- Reward debt accounting (`reward_debt`) prevents double-claiming rewards.

### 7. PDA Collision Safety

- All PDAs use distinct seeds with program-specific prefixes.
- Bump seeds are stored in state and used in all constraint validations.
- No PDA seed collision exists between programs.

---

## Known Limitations and Risks

### 1. Oracle Centralization Risk (Manual Mode)

In `oracle_source = 2` (manual), only the authority can update the oracle price. This creates a trust assumption on the authority key. For mainnet:
- Use Pyth or Switchboard feeds (source=0 or 1) exclusively.
- Require governance approval to switch oracle sources.

### 2. Rebase Index Drift

Over many epochs, extreme rebase events could cause the index to drift significantly from 1.0. Governance should monitor the index and adjust parameters if needed. The index can never reach zero due to positive clamping math, but can approach very small or very large values over time.

### 3. Reward Pool Exhaustion

The reward pool is finite. When exhausted, rewards are capped at zero rather than causing errors. Users should be aware that emission rates are only sustainable if the pool is regularly replenished via governance.

### 4. Timelock Bypass Risk

The timelock only delays execution — it does not prevent approval. A compromised majority of signers could approve a malicious proposal and execute it after the timelock. Mitigations:
- Use hardware wallets or HSMs for all multisig keys.
- Use a timelock long enough for the community to observe and react.
- Monitor on-chain proposal events.

### 5. Front-Running on Rebase

Since `execute_rebase` is permissionless, a keeper could front-run the rebase execution to deposit/withdraw shares at advantageous index values. This is mitigated by:
- The epoch minimum duration (limits rebase frequency).
- The `rebase_coefficient_bps` dampening factor (limits per-epoch index change).
- Circuit breakers that block extreme moves.

### 6. Lock Duration Enforcement

Lock duration enforcement relies on Solana's `Clock::get().unix_timestamp`, which is controlled by validators. A validator producing blocks could theoretically skew the clock, but this requires a significant fraction of stake and is a systemic Solana risk, not specific to this protocol.

---

## Audit Scope

Before mainnet deployment, an audit should cover:

- [ ] All Anchor account constraints and PDA seeds
- [ ] Arithmetic overflow paths across all programs
- [ ] Oracle price manipulation vectors
- [ ] Governance bypass scenarios
- [ ] Reward accounting correctness (accumulated_reward_per_share math)
- [ ] Rebase index math correctness
- [ ] CPI privilege escalation
- [ ] Token account ownership validations
- [ ] Signer validation for all privileged instructions
- [ ] Event emission completeness (audit log coverage)

---

## Compliance Notes

- Do not use the words "dividends," "guaranteed returns," "guaranteed yield," "guaranteed profit," or "risk-free" anywhere in user-facing materials without legal counsel approval.
- Rewards are "protocol rewards" or "lock incentives."
- The monitoring band ($0.10–$1.00) is informational only and does not constitute a price guarantee or promise.
- Consult legal counsel before public IDO launch regarding securities law in your jurisdiction.
