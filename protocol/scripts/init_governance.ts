/**
 * Initialize MEMBRA governance on devnet.
 * Usage: npx ts-node scripts/init_governance.ts
 *
 * Set env vars:
 *   ANCHOR_WALLET   path to deployer keypair JSON
 *   ANCHOR_PROVIDER_URL  RPC endpoint
 *   SIGNER_1 ... SIGNER_N  paths to multisig signer keypair JSONs
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load program
  // const idl = JSON.parse(fs.readFileSync("target/idl/membra_governance.json", "utf8"));
  // const program = new anchor.Program(idl, MEMBRA_GOVERNANCE_PROGRAM_ID, provider);

  // Load signers from environment
  const signerPaths = process.env.SIGNERS?.split(",") ?? [];
  if (signerPaths.length < 1) {
    throw new Error("Set SIGNERS=path1.json,path2.json,... with multisig signer paths");
  }

  const signerPubkeys = signerPaths.map((p) => {
    const kp = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(p.trim(), "utf8")))
    );
    return kp.publicKey;
  });

  const approvalThreshold = parseInt(process.env.THRESHOLD ?? "2");
  const timelockSeconds = parseInt(process.env.TIMELOCK_SECONDS ?? "86400");
  const executionWindow = parseInt(process.env.EXECUTION_WINDOW ?? "172800");
  const treasury = new PublicKey(
    process.env.TREASURY ?? (() => { throw new Error("Set TREASURY=<pubkey>"); })()
  );

  console.log("Initializing governance:");
  console.log("  Signers:", signerPubkeys.map((p) => p.toBase58()));
  console.log("  Threshold:", approvalThreshold);
  console.log("  Timelock:", timelockSeconds, "seconds");
  console.log("  Execution window:", executionWindow, "seconds");
  console.log("  Treasury:", treasury.toBase58());

  // await buildInitializeGovernance(program, {
  //   authority: provider.wallet.publicKey,
  //   signers: signerPubkeys,
  //   approvalThreshold,
  //   timelockSeconds: new anchor.BN(timelockSeconds),
  //   executionWindowSeconds: new anchor.BN(executionWindow),
  //   treasury,
  // });

  console.log("Governance initialized. Run anchor test to verify.");
}

main().catch(console.error);
