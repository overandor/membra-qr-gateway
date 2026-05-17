/**
 * Simulate a rebase cycle on devnet.
 * Usage: ANCHOR_WALLET=~/.config/solana/id.json npx ts-node scripts/simulate_rebase.ts
 *
 * This script:
 *   1. Reads current RebaseState
 *   2. Calls update_oracle_price (manual mode) with a simulated price
 *   3. Calls execute_rebase
 *   4. Prints the before/after index and rebase BPS
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import BN from "bn.js";
import fs from "fs";
import {
  findRebaseStatePda,
  buildRebaseSummary,
  computeRawRebaseBps,
  clampRebaseBps,
  simulateIndexUpdate,
} from "../sdk/rebase";

const REBASE_PROGRAM_ID = new PublicKey(
  process.env.MEMBRA_REBASE_PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkh476zPFsLnS"
);

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const tokenMint = new PublicKey(
    process.env.TOKEN_MINT ??
      (() => {
        throw new Error("Set TOKEN_MINT=<pubkey>");
      })()
  );

  const idlPath = `${__dirname}/../target/idl/membra_rebase.json`;
  if (!fs.existsSync(idlPath)) {
    throw new Error(
      `IDL not found at ${idlPath}. Run 'anchor build' first.`
    );
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const program = new anchor.Program(idl, REBASE_PROGRAM_ID, provider);

  const [rebaseStatePda] = findRebaseStatePda(tokenMint);

  // Fetch and display current state
  const state = await program.account.rebaseState.fetch(rebaseStatePda);
  const summary = buildRebaseSummary(state as any);

  console.log("\n=== BEFORE REBASE ===");
  console.log(`  Index:          ${summary.currentIndexFormatted}`);
  console.log(`  Last TWAP:      $${summary.lastTwapPriceUsd.toFixed(4)}`);
  console.log(`  Target price:   $${summary.targetPriceUsd.toFixed(4)}`);
  console.log(`  Last rebase:    ${summary.lastRebaseDate.toISOString()}`);
  console.log(`  Last bps:       ${summary.lastRebaseBps}`);
  console.log(`  Paused:         ${summary.paused}`);

  // Compute simulated rebase
  const simulatedPriceUsd6 = parseInt(
    process.env.SIMULATED_PRICE_USD6 ?? "600000" // $0.60 default
  );

  const raw = computeRawRebaseBps({
    twapPriceUsd6: simulatedPriceUsd6,
    targetPriceUsd6: (state as any).targetPriceUsd6.toNumber(),
    rebaseCoefficientBps: (state as any).rebaseCoefficientBps.toNumber(),
  });
  const clamped = clampRebaseBps(
    raw,
    (state as any).maxPositiveRebaseBps.toNumber(),
    (state as any).maxNegativeRebaseBps.toNumber()
  );
  const currentIndex = BigInt((state as any).globalRebaseIndex.toString());
  const simulatedNext = simulateIndexUpdate(currentIndex, clamped);

  console.log("\n=== SIMULATION (not yet executed) ===");
  console.log(`  Simulated price:    $${(simulatedPriceUsd6 / 1_000_000).toFixed(4)}`);
  console.log(`  Raw rebase bps:     ${raw}`);
  console.log(`  Clamped bps:        ${clamped}`);
  console.log(
    `  Projected index:    ${(Number(simulatedNext) / 1e12).toFixed(6)}`
  );

  const confirmed = process.env.EXECUTE === "true";
  if (!confirmed) {
    console.log(
      "\nDRY RUN — set EXECUTE=true to actually execute the rebase."
    );
    return;
  }

  // Update oracle price (Manual mode — oracle_source=2)
  const now = Math.floor(Date.now() / 1000);
  console.log("\n[1/2] Updating oracle price...");
  const updateTx = await program.methods
    .updateOraclePrice(
      new BN(simulatedPriceUsd6),
      new BN(Math.floor(simulatedPriceUsd6 / 100)), // 1% confidence
      new BN(now)
    )
    .accounts({
      authority: provider.wallet.publicKey,
      rebaseState: rebaseStatePda,
    })
    .rpc();
  console.log(`  tx: ${updateTx}`);

  // Execute rebase
  console.log("[2/2] Executing rebase...");
  const rebaseTx = await program.methods
    .executeRebase()
    .accounts({
      keeper: provider.wallet.publicKey,
      rebaseState: rebaseStatePda,
    })
    .rpc();
  console.log(`  tx: ${rebaseTx}`);

  // Fetch and display new state
  const newState = await program.account.rebaseState.fetch(rebaseStatePda);
  const newSummary = buildRebaseSummary(newState as any);

  console.log("\n=== AFTER REBASE ===");
  console.log(`  Index:        ${newSummary.currentIndexFormatted}`);
  console.log(`  Rebase bps:   ${newSummary.lastRebaseBps}`);
  console.log(`  TWAP:         $${newSummary.lastTwapPriceUsd.toFixed(4)}`);
  console.log(`\nRebase complete.`);
}

main().catch(console.error);
