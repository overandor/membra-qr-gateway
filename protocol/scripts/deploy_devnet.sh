#!/usr/bin/env bash
# MEMBRA Protocol – devnet deployment script
# IMPORTANT: Run simulation suite and security review before deploying to devnet.
set -euo pipefail

WALLET="${ANCHOR_WALLET:-$HOME/.config/solana/id.json}"
RPC="${SOLANA_RPC:-https://api.devnet.solana.com}"

echo "=== MEMBRA Protocol: Devnet Deployment ==="
echo "Wallet: $WALLET"
echo "RPC:    $RPC"
echo ""
echo "SAFETY CHECKLIST:"
echo "  [ ] Simulation suite passed on localnet"
echo "  [ ] All tests green"
echo "  [ ] Oracle integration tested"
echo "  [ ] Governance multisig configured"
echo "  [ ] Rebase params reviewed"
echo "  [ ] No guaranteed-profit language in docs"
echo ""
read -p "Confirm devnet deployment? (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborted."
  exit 1
fi

# 1. Build and sync
echo "[1/4] Building..."
anchor build
anchor keys sync

# 2. Configure for devnet
solana config set --url "$RPC"

# 3. Check SOL balance
BALANCE=$(solana balance --keypair "$WALLET" | awk '{print $1}')
echo "Deployer balance: $BALANCE SOL"
if (( $(echo "$BALANCE < 5" | bc -l) )); then
  echo "WARNING: Low SOL balance. Request devnet airdrop:"
  echo "  solana airdrop 5 --keypair $WALLET --url $RPC"
  exit 1
fi

# 4. Deploy programs
echo "[2/4] Deploying programs to devnet..."
anchor deploy --provider.cluster devnet

# 5. Initialize governance
echo "[3/4] Initializing governance..."
echo "  NOTE: Run initialize_governance via TypeScript script with your multisig keys."
echo "  Example: npx ts-node scripts/init_governance.ts"

# 6. Verify
echo "[4/4] Verifying deployment..."
PROGRAMS=$(anchor keys list)
echo "$PROGRAMS"

echo ""
echo "=== Devnet deployment complete ==="
echo "Program IDs:"
echo "$PROGRAMS"
echo ""
echo "Next steps:"
echo "  1. Initialize governance: npx ts-node scripts/init_governance.ts"
echo "  2. Initialize rebase: npx ts-node scripts/init_rebase.ts"
echo "  3. Set up oracle: configure oracle feed in rebase state"
echo "  4. Initialize IDO: npx ts-node scripts/init_ido.ts"
echo "  5. Fund reward vault: transfer MEMBRA tokens to reward_vault PDA"
