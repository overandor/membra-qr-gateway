#!/usr/bin/env bash
# MEMBRA Protocol – localnet deployment script
set -euo pipefail

WALLET="${ANCHOR_WALLET:-$HOME/.config/solana/id.json}"

echo "=== MEMBRA Protocol: Localnet Deployment ==="
echo "Wallet: $WALLET"

# 1. Build programs
echo ""
echo "[1/5] Building Anchor programs..."
anchor build

# 2. Sync program IDs
echo ""
echo "[2/5] Syncing program IDs..."
anchor keys sync

# 3. Start local validator (background)
echo ""
echo "[3/5] Starting solana-test-validator..."
if pgrep -f solana-test-validator > /dev/null; then
  echo "  Validator already running – skipping."
else
  solana-test-validator \
    --reset \
    --ledger .anchor/test-ledger \
    --bpf-program $(anchor keys list | grep membra_ido | awk '{print $2}') target/deploy/membra_ido.so \
    --bpf-program $(anchor keys list | grep membra_rebase | awk '{print $2}') target/deploy/membra_rebase.so \
    --bpf-program $(anchor keys list | grep membra_rewards | awk '{print $2}') target/deploy/membra_rewards.so \
    --bpf-program $(anchor keys list | grep membra_governance | awk '{print $2}') target/deploy/membra_governance.so \
    &
  sleep 5
fi

solana config set --url localhost
solana airdrop 10 --keypair "$WALLET"

# 4. Deploy
echo ""
echo "[4/5] Deploying programs to localnet..."
anchor deploy --provider.cluster localnet

# 5. Run tests
echo ""
echo "[5/5] Running tests..."
anchor test --skip-build --provider.cluster localnet

echo ""
echo "=== Localnet deployment complete ==="
echo "Use 'solana logs' to stream program logs."
