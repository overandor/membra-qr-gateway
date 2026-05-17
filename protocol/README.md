# MEMBRA Money Protocol

> Production-grade Solana IDO and elastic-supply token protocol.

MEMBRA is an elastic-supply Solana token with transparent rebase rules, oracle-based price monitoring, public lock incentives, and audited IDO flows. **The protocol does not guarantee price, yield, dividends, or profit. Rewards are paid according to public staking and lock rules.**

---

## Architecture

Four Anchor programs forming a single protocol:

| Program | Role |
|---|---|
| `membra_ido` | USDC-denominated token sale with vesting, claim/refund, and pause controls |
| `membra_rebase` | Shares/index elastic-supply mechanism with oracle gating and circuit breakers |
| `membra_rewards` | Public staking and lock incentives with pro-rata distribution |
| `membra_governance` | Multisig + timelock authorization for all privileged actions |

```
┌──────────┐    deposits USDC     ┌──────────────┐
│  Buyer   │ ───────────────────▶ │ membra_ido   │
└──────────┘                       └──────┬───────┘
                                          │ claims after finalize
                                          ▼
                                   ┌──────────────┐
                                   │  Holder      │
                                   └──┬────────┬──┘
                          stakes/locks │        │ deposits to wrapper
                                       ▼        ▼
                          ┌──────────────────┐  ┌──────────────────┐
                          │ membra_rewards   │  │ membra_rebase    │
                          └──────────────────┘  └──────────────────┘
                                       ▲        ▲
                                       │        │ updates params
                                       └────┬───┘ via approved proposal
                                            │
                                   ┌──────────────────┐
                                   │ membra_governance│
                                   └──────────────────┘
                                            ▲
                                            │ propose / approve / execute
                                   ┌──────────────────┐
                                   │  Multisig signers│
                                   └──────────────────┘
```

---

## Core Safety Properties

- **No direct treasury withdrawal.** All treasury movement requires a governance proposal that has been approved by a multisig and survived a timelock.
- **No backdoor admin.** All privileged instructions require either the configured authority or a governance-approved proposal.
- **Oracle-gated rebase.** Rebase will not execute on stale prices, extreme volatility, or before the minimum epoch duration has elapsed.
- **Public lock incentives only.** No private whale deals. All multipliers are documented and apply equally to all participants.
- **Shares/index rebase model.** No attempt to mutate every holder's SPL balance — instead, an index tracks redeemable value per share.
- **Checked arithmetic everywhere.** All math uses `checked_add`/`checked_sub`/`checked_mul`/`checked_div` and returns explicit errors on overflow.
- **Comprehensive event log.** Every state change emits an event for indexing and audit.

---

## Repository Layout

```
protocol/
├── Anchor.toml                  # Anchor workspace config
├── Cargo.toml                   # Rust workspace
├── package.json                 # TypeScript dependencies
├── tsconfig.json
├── programs/                    # Anchor programs (Rust)
│   ├── membra_ido/
│   ├── membra_rebase/
│   ├── membra_rewards/
│   └── membra_governance/
├── tests/                       # TypeScript integration tests
│   ├── membra_ido.ts
│   ├── membra_rebase.ts
│   ├── membra_rewards.ts
│   └── membra_governance.ts
├── sdk/                         # TypeScript SDK for frontend integration
│   ├── index.ts
│   ├── constants.ts
│   ├── types.ts
│   ├── ido.ts
│   ├── rebase.ts
│   ├── rewards.ts
│   └── governance.ts
├── scripts/                     # Deployment & initialization scripts
│   ├── deploy_localnet.sh
│   ├── deploy_devnet.sh
│   └── init_governance.ts
└── docs/
    ├── PROTOCOL.md              # Technical specification
    ├── SECURITY.md              # Security properties and known risks
    ├── COMPLIANCE.md            # Compliance-safe language and disclosures
    ├── DEPLOYMENT.md            # Deployment guide
    └── FRONTEND_INTEGRATION.md  # SDK usage guide
```

---

## Quickstart

### Prerequisites
- Rust ≥ 1.75
- Solana CLI ≥ 1.18
- Anchor CLI 0.29.0
- Node.js ≥ 18
- Yarn

### Build & Test

```bash
cd protocol
yarn install
anchor build
anchor keys sync
anchor test
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment instructions.

---

## Program IDs (Placeholders)

After running `anchor keys sync`, your actual program IDs will be written to `Anchor.toml` and each program's `declare_id!`. The current placeholders are:

| Program | ID |
|---|---|
| `membra_ido` | `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS` |
| `membra_rebase` | `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkh476zPFsLnS` |
| `membra_rewards` | `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYki476zPFsLnS` |
| `membra_governance` | `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkj476zPFsLnS` |

---

## Production Readiness

**This protocol is NOT production-ready.** Before mainnet deployment, the following must be completed:

- [ ] All localnet and devnet tests pass against the deployed programs
- [ ] Oracle (Pyth or Switchboard) integration completed and tested
- [ ] Governance multisig keys generated on hardware wallets
- [ ] Independent security audit completed; all findings remediated
- [ ] Legal/compliance review completed for target jurisdictions
- [ ] Bug bounty program established
- [ ] Monitoring and alerting infrastructure deployed
- [ ] Frontend compliance disclaimers reviewed

See [docs/SECURITY.md](docs/SECURITY.md) and [docs/COMPLIANCE.md](docs/COMPLIANCE.md) for details.

---

## What This Protocol Does NOT Do

- Does not guarantee any price range
- Does not manufacture intraday volatility
- Does not randomly adjust supply
- Does not pay whales privately to avoid selling
- Does not issue dividends or guaranteed returns
- Does not allow direct treasury withdrawal without multisig governance approval
- Does not auto-trade

---

## License

See repository root for license terms.

---

## Disclaimer

This software is provided "as is" without warranty of any kind. Past behavior of similar protocols does not predict future behavior. Participating in IDOs, staking, and elastic-supply mechanisms involves risk of total loss. This is not financial, legal, or tax advice. Consult your own advisors.
