import * as anchor from "@coral-xyz/anchor";
import { Program, Idl } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { createHash } from "crypto";

export function sha256Hash(data: Buffer | string): number[] {
  const hash = createHash("sha256").update(data).digest();
  return Array.from(hash);
}

export function sha256Hash32(data: Buffer | string): number[] {
  return sha256Hash(data).slice(0, 32);
}

export function findMemoryVaultPda(
  programId: PublicKey,
  owner: PublicKey,
  agentIdHash: number[]
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("memory_vault"), owner.toBuffer(), Buffer.from(agentIdHash)],
    programId
  );
}

export function findRepoProofPda(
  programId: PublicKey,
  owner: PublicKey,
  repoOwnerHash: number[],
  repoNameHash: number[]
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("repo_proof"),
      owner.toBuffer(),
      Buffer.from(repoOwnerHash),
      Buffer.from(repoNameHash),
    ],
    programId
  );
}

export function findMirReceiptPda(
  programId: PublicKey,
  owner: PublicKey,
  jobIdHash: number[]
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mir_receipt"), owner.toBuffer(), Buffer.from(jobIdHash)],
    programId
  );
}

export function findMcrPda(
  programId: PublicKey,
  owner: PublicKey,
  mcrIdHash: number[]
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mcr"), owner.toBuffer(), Buffer.from(mcrIdHash)],
    programId
  );
}

export async function initializeMemoryVault(
  program: Program<Idl>,
  owner: anchor.Wallet,
  agentIdHash: number[],
  memoryRoot: number[],
  embeddingIndexHash: number[],
  policyHash: number[]
): Promise<string> {
  const [memoryVaultPda] = findMemoryVaultPda(
    program.programId,
    owner.publicKey,
    agentIdHash
  );

  const tx = await program.methods
    .initializeMemoryVault(agentIdHash, memoryRoot, embeddingIndexHash, policyHash)
    .accounts({
      owner: owner.publicKey,
      memoryVault: memoryVaultPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export async function registerRepoProof(
  program: Program<Idl>,
  owner: anchor.Wallet,
  repoOwnerHash: number[],
  repoNameHash: number[],
  headCommitHash: number[],
  fileTreeMerkleRoot: number[],
  astMerkleRoot: number[],
  dependencyFingerprintHash: number[],
  testTraceHash: number[],
  commitCount: anchor.BN,
  firstCommitUnix: anchor.BN,
  lastCommitUnix: anchor.BN,
  visibilityClass: any
): Promise<string> {
  const [repoProofPda] = findRepoProofPda(
    program.programId,
    owner.publicKey,
    repoOwnerHash,
    repoNameHash
  );

  const tx = await program.methods
    .registerRepoProof(
      repoOwnerHash,
      repoNameHash,
      headCommitHash,
      fileTreeMerkleRoot,
      astMerkleRoot,
      dependencyFingerprintHash,
      testTraceHash,
      commitCount,
      firstCommitUnix,
      lastCommitUnix,
      visibilityClass
    )
    .accounts({
      owner: owner.publicKey,
      repoProof: repoProofPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export async function createMir(
  program: Program<Idl>,
  owner: anchor.Wallet,
  jobIdHash: number[],
  agentIdHash: number[],
  inputMerkleRoot: number[],
  outputMerkleRoot: number[],
  modelManifestHash: number[]
): Promise<string> {
  const [mirReceiptPda] = findMirReceiptPda(
    program.programId,
    owner.publicKey,
    jobIdHash
  );

  const tx = await program.methods
    .createMir(jobIdHash, agentIdHash, inputMerkleRoot, outputMerkleRoot, modelManifestHash)
    .accounts({
      owner: owner.publicKey,
      mirReceipt: mirReceiptPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export async function attestMir(
  program: Program<Idl>,
  attester: anchor.Wallet,
  mirReceiptPda: PublicKey,
  computeAttestationHash: number[]
): Promise<string> {
  const tx = await program.methods
    .attestMir(computeAttestationHash)
    .accounts({
      attester: attester.publicKey,
      mirReceipt: mirReceiptPda,
    })
    .rpc();

  return tx;
}

export async function createMemoryCollateralReceipt(
  program: Program<Idl>,
  owner: anchor.Wallet,
  mcrIdHash: number[],
  m5AttestationRoot: number[],
  repoProofPda: PublicKey,
  memoryVaultPda: PublicKey,
  parentMirPda: PublicKey
): Promise<string> {
  const [mcrPda] = findMcrPda(program.programId, owner.publicKey, mcrIdHash);

  const tx = await program.methods
    .createMemoryCollateralReceipt(mcrIdHash, m5AttestationRoot)
    .accounts({
      owner: owner.publicKey,
      repoProof: repoProofPda,
      memoryVault: memoryVaultPda,
      parentMir: parentMirPda,
      mcr: mcrPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export async function updateCollateralScore(
  program: Program<Idl>,
  owner: anchor.Wallet,
  mcrPda: PublicKey,
  collateralScore: anchor.BN,
  appraisalLowUsd: anchor.BN,
  appraisalHighUsd: anchor.BN,
  riskDiscountBps: number
): Promise<string> {
  const tx = await program.methods
    .updateCollateralScore(collateralScore, appraisalLowUsd, appraisalHighUsd, riskDiscountBps)
    .accounts({
      owner: owner.publicKey,
      mcr: mcrPda,
    })
    .rpc();

  return tx;
}

export async function revokeCollateralReceipt(
  program: Program<Idl>,
  owner: anchor.Wallet,
  mcrPda: PublicKey
): Promise<string> {
  const tx = await program.methods
    .revokeCollateralReceipt()
    .accounts({
      owner: owner.publicKey,
      mcr: mcrPda,
    })
    .rpc();

  return tx;
}
