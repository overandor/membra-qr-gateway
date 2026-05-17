# MEMBRA Protocol — Deployment Guide

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Rust | ≥ 1.75 | `rustup` |
| Solana CLI | ≥ 1.18 | `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"` |
| Anchor CLI | 0.29.0 | `avm install 0.29.0 && avm use 0.29.0` |
| Node.js | ≥ 18 | `nvm` or system package |
| Yarn | ≥ 1.22 | `npm i -g yarn` |

---

## Step 1: Local Setup

```bash
# Clone repository
git clone https://github.com/overandor/membra-qr-gateway.git
cd membra-qr-gateway/protocol

# Install TypeScript dependencies
yarn install

# Create Solana keypair (skip if you have one)
solana-keygen new --outfile ~/.config/solana/id.json

# Set Anchor wallet
export ANCHOR_WALLET=~/.config/solana/id.json
```

---

## Step 2: Build

```bash
anchor build
```

This generates:
- `target/deploy/*.so` — compiled BPF programs
- `target/idl/*.json` — program IDLs (used by TypeScript SDK)
- `target/types/*.ts` — TypeScript types

After building, sync program IDs:
```bash
anchor keys sync
```

This updates `Anchor.toml` and all `declare_id!` macros with the actual keypair-derived IDs.

---

## Step 3: Localnet Deployment

```bash
# Start test validator
solana-test-validator --reset &

# Run full test suite
anchor test

# Or use the deployment script
bash scripts/deploy_localnet.sh
```

---

## Step 4: Devnet Deployment

**Only after:**
- All local tests pass
- Oracle integration is verified
- Governance multisig keys are prepared
- Rebase parameters are reviewed and signed off

```bash
# Configure for devnet
solana config set --url https://api.devnet.solana.com

# Fund deployer
solana airdrop 5

# Deploy
bash scripts/deploy_devnet.sh
```

---

## Step 5: Initialize Protocol

After deployment, run the initialization sequence in this order:

### 5a. Initialize Governance

```bash
SIGNERS=keys/signer1.json,keys/signer2.json,keys/signer3.json \
THRESHOLD=2 \
TIMELOCK_SECONDS=86400 \
EXECUTION_WINDOW=172800 \
TREASURY=<treasury_pubkey> \
npx ts-node scripts/init_governance.ts
```

### 5b. Initialize Rebase

Configure oracle source, target price, and epoch parameters via governance proposal.

### 5c. Initialize IDO

Set sale parameters (price, caps, timestamps) and fund the `token_vault`.

### 5d. Fund Reward Vault

Submit `MoveRewardsToVault` governance proposal to transfer tokens from treasury to `reward_vault`.

---

## Program IDs

After `anchor keys sync`, retrieve current IDs:
```bash
anchor keys list
```

Update your frontend `.env`:
```env
NEXT_PUBLIC_MEMBRA_IDO_PROGRAM_ID=<ido_program_id>
NEXT_PUBLIC_MEMBRA_REBASE_PROGRAM_ID=<rebase_program_id>
NEXT_PUBLIC_MEMBRA_REWARDS_PROGRAM_ID=<rewards_program_id>
NEXT_PUBLIC_MEMBRA_GOVERNANCE_PROGRAM_ID=<governance_program_id>
```

---

## Mainnet Readiness Checklist

- [ ] All localnet tests pass
- [ ] All devnet tests pass
- [ ] Oracle feed address confirmed (Pyth or Switchboard on mainnet)
- [ ] Multisig keys generated on hardware wallets
- [ ] Governance initialized with production timelock (≥ 48h recommended)
- [ ] Independent security audit completed and all findings resolved
- [ ] Legal/compliance review completed
- [ ] Rebase parameters reviewed and approved by governance
- [ ] IDO terms reviewed by legal counsel
- [ ] Bug bounty program established
- [ ] Monitoring infrastructure in place (event indexer, alert system)
- [ ] Emergency pause key held by ≥ 2 trusted parties
- [ ] Frontend compliance disclaimers reviewed
