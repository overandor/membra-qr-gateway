/**
 * Seed the MEMBRA rewards vault with initial tokens.
 * Requires a governance proposal execution first (MoveRewardsToVault action type).
 *
 * Usage:
 *   ANCHOR_WALLET=~/.config/solana/id.json \
 *   TOKEN_MINT=<pubkey> \
 *   REWARD_VAULT=<pubkey> \
 *   AMOUNT=<tokens_with_decimals> \
 *   npx ts-node scripts/seed_pool.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
} from "@solana/spl-token";
import BN from "bn.js";
import fs from "fs";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;

  const rewardMint = new PublicKey(
    process.env.REWARD_MINT ??
      (() => { throw new Error("Set REWARD_MINT=<pubkey>"); })()
  );
  const rewardVault = new PublicKey(
    process.env.REWARD_VAULT ??
      (() => { throw new Error("Set REWARD_VAULT=<pubkey>"); })()
  );
  const amountRaw = process.env.AMOUNT ??
    (() => { throw new Error("Set AMOUNT=<tokens * 10^decimals>"); })();
  const amount = new BN(amountRaw);

  // Source: governance treasury token account
  const treasuryTokenAccount = new PublicKey(
    process.env.TREASURY_TOKEN_ACCOUNT ??
      (() => { throw new Error("Set TREASURY_TOKEN_ACCOUNT=<pubkey>"); })()
  );

  console.log("=== Seed Rewards Pool ===");
  console.log(`From: ${treasuryTokenAccount.toBase58()}`);
  console.log(`To:   ${rewardVault.toBase58()}`);
  console.log(`Amount: ${amountRaw} raw units`);
  console.log(
    "\nNOTE: This transfer requires a governance-approved MoveRewardsToVault proposal."
  );
  console.log(
    "Ensure the proposal has been executed before running this script.\n"
  );

  const confirmed = process.env.EXECUTE === "true";
  if (!confirmed) {
    console.log("DRY RUN — set EXECUTE=true to execute.");
    return;
  }

  const transferIx = createTransferInstruction(
    treasuryTokenAccount,
    rewardVault,
    provider.wallet.publicKey,
    BigInt(amountRaw),
    [],
    TOKEN_PROGRAM_ID
  );

  const tx = new Transaction().add(transferIx);
  const sig = await provider.sendAndConfirm(tx, []);
  console.log(`Transfer tx: ${sig}`);
  console.log("Rewards vault seeded successfully.");
}

main().catch(console.error);
