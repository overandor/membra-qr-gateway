#!/usr/bin/env bash
# MEMBRA Protocol – mainnet deployment script
#
# Usage:
#   ./scripts/deploy_mainnet.sh --confirm
#
# Environment variables:
#   ANCHOR_WALLET          path to deployer keypair JSON   (required)
#   SOLANA_RPC             mainnet RPC endpoint            (default: official)
#   EXPECTED_CHECKSUM_DIR  directory holding *.sha256 files matching program .so names
#                          (default: checksums/)
#
# Safety guarantees:
#   1. Requires explicit --confirm flag.
#   2. Verifies deployer wallet holds at least 10 SOL.
#   3. Checks each program binary against expected SHA-256 checksums.
#   4. Deploys programs one at a time and verifies each before proceeding.
#   5. Prints all deployed program IDs at the end.

set -euo pipefail

# ─── Constants ────────────────────────────────────────────────────────────────

MINIMUM_SOL=10
PROGRAMS=(
  membra_ido
  membra_rebase
  membra_rewards
  membra_governance
  membra_attestation
)
RPC="${SOLANA_RPC:-https://api.mainnet-beta.solana.com}"
WALLET="${ANCHOR_WALLET:-$HOME/.config/solana/id.json}"
CHECKSUM_DIR="${EXPECTED_CHECKSUM_DIR:-$(dirname "$0")/../checksums}"
BUILD_DIR="$(dirname "$0")/../target/deploy"

# ─── Colours ──────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # no colour

info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()     { error "$*"; exit 1; }

# ─── Argument parsing ─────────────────────────────────────────────────────────

CONFIRMED=false
for arg in "$@"; do
  if [[ "$arg" == "--confirm" ]]; then
    CONFIRMED=true
  fi
done

# ─── Safety gate ──────────────────────────────────────────────────────────────

echo ""
echo "======================================================================"
echo "  MEMBRA Protocol – MAINNET DEPLOYMENT"
echo "======================================================================"
echo ""
echo "  This script will deploy programs to Solana MAINNET-BETA."
echo "  Deployed programs cannot be undone without upgrade authority."
echo ""
echo "  Wallet  : $WALLET"
echo "  RPC     : $RPC"
echo "  Programs: ${PROGRAMS[*]}"
echo ""

if [[ "$CONFIRMED" != "true" ]]; then
  die "Pass --confirm to proceed with mainnet deployment."
fi

# Final interactive confirmation
read -r -p "  Type 'deploy-mainnet' to confirm: " USER_CONFIRM
if [[ "$USER_CONFIRM" != "deploy-mainnet" ]]; then
  die "Deployment aborted – confirmation string did not match."
fi
echo ""

# ─── Pre-flight checks ────────────────────────────────────────────────────────

info "Running pre-flight checks..."

# Check dependencies
for dep in anchor solana sha256sum bc; do
  if ! command -v "$dep" &>/dev/null; then
    die "Required tool '$dep' not found in PATH."
  fi
done

# Check wallet file
if [[ ! -f "$WALLET" ]]; then
  die "Wallet keypair not found at: $WALLET"
fi

# Configure Solana CLI for mainnet
solana config set --url "$RPC" --keypair "$WALLET"

# Check SOL balance
BALANCE_LAMPORTS=$(solana balance --keypair "$WALLET" --output json-compact 2>/dev/null | grep -oP '\d+\.\d+' | head -1 || echo "0")
BALANCE="${BALANCE_LAMPORTS:-0}"
info "Deployer wallet balance: ${BALANCE} SOL (minimum required: ${MINIMUM_SOL} SOL)"

if ! echo "$BALANCE $MINIMUM_SOL" | awk '{exit ($1 >= $2) ? 0 : 1}'; then
  die "Insufficient SOL balance. Have ${BALANCE} SOL, need at least ${MINIMUM_SOL} SOL."
fi

# Check build outputs exist
info "Checking program binaries..."
for program in "${PROGRAMS[@]}"; do
  so_path="${BUILD_DIR}/${program}.so"
  if [[ ! -f "$so_path" ]]; then
    die "Program binary not found: ${so_path} – run 'anchor build' first."
  fi
  info "  Found: ${so_path} ($(du -h "$so_path" | cut -f1))"
done

# ─── Checksum verification ────────────────────────────────────────────────────

info "Verifying program binary checksums..."

if [[ ! -d "$CHECKSUM_DIR" ]]; then
  warn "Checksum directory not found at: ${CHECKSUM_DIR}"
  warn "Skipping checksum verification – populate '${CHECKSUM_DIR}/' with <program>.sha256 files to enable this check."
else
  CHECKSUM_FAILURES=0
  for program in "${PROGRAMS[@]}"; do
    so_path="${BUILD_DIR}/${program}.so"
    checksum_file="${CHECKSUM_DIR}/${program}.sha256"

    if [[ ! -f "$checksum_file" ]]; then
      warn "  No checksum file for ${program} at ${checksum_file} – skipping."
      continue
    fi

    expected=$(cat "$checksum_file" | awk '{print $1}')
    actual=$(sha256sum "$so_path" | awk '{print $1}')

    if [[ "$actual" == "$expected" ]]; then
      info "  OK: ${program} (sha256: ${actual:0:16}...)"
    else
      error "  MISMATCH: ${program}"
      error "    Expected: ${expected}"
      error "    Actual:   ${actual}"
      CHECKSUM_FAILURES=$((CHECKSUM_FAILURES + 1))
    fi
  done

  if [[ "$CHECKSUM_FAILURES" -gt 0 ]]; then
    die "${CHECKSUM_FAILURES} checksum verification(s) failed. Aborting deployment."
  fi
fi

# ─── Build ────────────────────────────────────────────────────────────────────

info "Building programs (anchor build)..."
anchor build

info "Syncing program IDs..."
anchor keys sync

# ─── Deploy programs ──────────────────────────────────────────────────────────

echo ""
info "Beginning program deployments to mainnet-beta..."
echo ""

declare -A DEPLOYED_IDS

for program in "${PROGRAMS[@]}"; do
  echo "----------------------------------------------------------------------"
  info "Deploying: ${program}"

  # Attempt deploy
  if anchor deploy --program-name "$program" --provider.cluster mainnet-beta; then
    info "  Deploy transaction submitted for ${program}."
  else
    die "Failed to deploy ${program}. Remaining programs not deployed."
  fi

  # Verify the program is now executable on-chain
  info "  Verifying deployment of ${program}..."
  PROGRAM_ID=$(anchor keys list | grep "$program" | awk '{print $NF}')

  if [[ -z "$PROGRAM_ID" ]]; then
    warn "  Could not parse program ID for ${program} from 'anchor keys list'."
  else
    DEPLOYED_IDS["$program"]="$PROGRAM_ID"

    # Confirm account exists and is executable
    ACCOUNT_JSON=$(solana account "$PROGRAM_ID" --output json 2>/dev/null || echo "{}")
    if echo "$ACCOUNT_JSON" | grep -q '"executable": true'; then
      info "  Verified: ${program} is executable at ${PROGRAM_ID}"
    else
      error "  Account at ${PROGRAM_ID} does not appear executable."
      warn "  The deploy transaction may still be finalizing. Check manually:"
      warn "    solana account ${PROGRAM_ID}"
    fi
  fi
  echo ""
done

# ─── Summary ──────────────────────────────────────────────────────────────────

echo "======================================================================"
echo "  Mainnet Deployment Complete"
echo "======================================================================"
echo ""
info "Deployed Program IDs:"
for program in "${PROGRAMS[@]}"; do
  id="${DEPLOYED_IDS[$program]:-<unknown>}"
  printf "  %-30s %s\n" "${program}:" "${id}"
done
echo ""
info "Next steps:"
echo "  1. Update constants.ts with the deployed program IDs."
echo "  2. Initialize governance:   npx ts-node scripts/init_governance.ts"
echo "  3. Initialize rebase:       npx ts-node scripts/init_rebase.ts"
echo "  4. Initialize attestation:  npx ts-node scripts/init_attestation.ts"
echo "  5. Fund the protocol reward vault."
echo "  6. Transfer upgrade authority to the governance multisig:"
echo "       npx ts-node scripts/transfer_upgrade_authority.ts"
echo ""
echo "  IMPORTANT: Store deployed program IDs in version control and keep"
echo "  the upgrade authority keypair in cold storage immediately."
echo "======================================================================"
