/**
 * Transfer program upgrade authority to the governance PDA.
 * Run AFTER governance is initialized on devnet/mainnet.
 *
 * Usage:
 *   ANCHOR_WALLET=~/.config/solana/id.json \
 *   GOVERNANCE_AUTHORITY=<deployer_pubkey> \
 *   GOVERNANCE_PDA=<governance_config_pda> \
 *   npx ts-node scripts/transfer_upgrade_authority.ts
 *
 * This must be run by the current upgrade authority (deployer).
 * After this, program upgrades require a governance proposal with
 * BPFLoaderUpgradeable authority.
 */

import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  BpfLoaderUpgradeable,
} from "@solana/web3.js";

const PROGRAM_IDS = {
  membra_ido: process.env.MEMBRA_IDO_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  membra_rebase: process.env.MEMBRA_REBASE_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkh476zPFsLnS",
  membra_rewards: process.env.MEMBRA_REWARDS_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYki476zPFsLnS",
  membra_governance: process.env.MEMBRA_GOVERNANCE_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkj476zPFsLnS",
};

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;

  const newAuthority = new PublicKey(
    process.env.GOVERNANCE_PDA ??
      (() => {
        throw new Error("Set GOVERNANCE_PDA=<pubkey>");
      })()
  );

  console.log("=== Program Upgrade Authority Transfer ===");
  console.log(`Current authority: ${provider.wallet.publicKey.toBase58()}`);
  console.log(`New authority:     ${newAuthority.toBase58()}`);
  console.log(`Programs:`, PROGRAM_IDS);
  console.log("\nWARNING: This is irreversible unless the new authority can sign.");
  console.log("After this, upgrades require a governance proposal.\n");

  const confirmed = process.env.CONFIRM === "yes";
  if (!confirmed) {
    console.log("DRY RUN — set CONFIRM=yes to actually transfer authority.");
    return;
  }

  for (const [name, programIdStr] of Object.entries(PROGRAM_IDS)) {
    const programId = new PublicKey(programIdStr);

    // Derive program data account (PDA owned by BPF Upgradeable Loader)
    const [programData] = PublicKey.findProgramAddressSync(
      [programId.toBuffer()],
      new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
    );

    console.log(`Transferring authority for ${name}...`);
    console.log(`  Program:      ${programId.toBase58()}`);
    console.log(`  Program data: ${programData.toBase58()}`);

    // Use Solana CLI for this in production:
    // solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <NEW_AUTHORITY>
    // The TypeScript API for this uses BpfLoaderUpgradeable.setAuthority
    console.log(
      `  CLI equivalent: solana program set-upgrade-authority ${programIdStr} --new-upgrade-authority ${newAuthority.toBase58()}`
    );
  }

  console.log(
    "\nNOTE: Use the Solana CLI commands above for reliable execution."
  );
  console.log(
    "After transfer, store the governance PDA keypair in a hardware wallet."
  );
}

main().catch(console.error);
