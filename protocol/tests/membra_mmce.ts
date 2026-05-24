import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MembraMmce } from "../target/types/membra_mmce";
import { expect } from "chai";
import { createHash } from "crypto";
import {
  sha256Hash32,
  findMemoryVaultPda,
  findRepoProofPda,
  findMirReceiptPda,
  findMcrPda,
} from "../sdk/mmce_client";

function hashStr(s: string): number[] {
  return Array.from(createHash("sha256").update(s).digest());
}

function hashStr32(s: string): number[] {
  return hashStr(s).slice(0, 32);
}

describe("membra_mmce", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MembraMmce as Program<MembraMmce>;
  const owner = (provider.wallet as anchor.Wallet);

  const agentIdHash = hashStr32("agent-001");
  const memoryRoot = hashStr32("memory-root-abc");
  const embeddingIndexHash = hashStr32("embedding-idx-xyz");
  const policyHash = hashStr32("policy-private");

  const repoOwnerHash = hashStr32("github-owner");
  const repoNameHash = hashStr32("my-private-repo");
  const headCommitHash = hashStr32("abc123def456");
  const fileTreeMerkleRoot = hashStr32("file-tree-root");
  const astMerkleRoot = hashStr32("ast-root");
  const dependencyFingerprintHash = hashStr32("dep-fingerprint");
  const testTraceHash = hashStr32("test-trace");

  const jobIdHash = hashStr32("job-audit-001");
  const inputMerkleRoot = hashStr32("input-root");
  const outputMerkleRoot = hashStr32("output-root");
  const modelManifestHash = hashStr32("model-manifest");
  const computeAttestationHash = hashStr32("compute-attest");

  const mcrIdHash = hashStr32("mcr-001");
  const m5AttestationRoot = hashStr32("m5-root");

  let memoryVaultPda: anchor.web3.PublicKey;
  let repoProofPda: anchor.web3.PublicKey;
  let mirReceiptPda: anchor.web3.PublicKey;
  let mcrPda: anchor.web3.PublicKey;

  it("initializes a MemoryVault", async () => {
    [memoryVaultPda] = findMemoryVaultPda(program.programId, owner.publicKey, agentIdHash);

    await program.methods
      .initializeMemoryVault(agentIdHash, memoryRoot, embeddingIndexHash, policyHash)
      .accounts({
        owner: owner.publicKey,
        memoryVault: memoryVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vault = await program.account.memoryVault.fetch(memoryVaultPda);
    expect(vault.owner.toString()).to.equal(owner.publicKey.toString());
    expect(Array.from(vault.agentIdHash)).to.deep.equal(agentIdHash);
    expect(Array.from(vault.memoryRoot)).to.deep.equal(memoryRoot);
  });

  it("registers a RepoProof", async () => {
    [repoProofPda] = findRepoProofPda(
      program.programId,
      owner.publicKey,
      repoOwnerHash,
      repoNameHash
    );

    await program.methods
      .registerRepoProof(
        repoOwnerHash,
        repoNameHash,
        headCommitHash,
        fileTreeMerkleRoot,
        astMerkleRoot,
        dependencyFingerprintHash,
        testTraceHash,
        new anchor.BN(118),
        new anchor.BN(1700000000),
        new anchor.BN(1715000000),
        { private: {} }
      )
      .accounts({
        owner: owner.publicKey,
        repoProof: repoProofPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const proof = await program.account.repoProof.fetch(repoProofPda);
    expect(proof.owner.toString()).to.equal(owner.publicKey.toString());
    expect(proof.commitCount.toNumber()).to.equal(118);
  });

  it("creates a MIR receipt", async () => {
    [mirReceiptPda] = findMirReceiptPda(program.programId, owner.publicKey, jobIdHash);

    await program.methods
      .createMir(jobIdHash, agentIdHash, inputMerkleRoot, outputMerkleRoot, modelManifestHash)
      .accounts({
        owner: owner.publicKey,
        mirReceipt: mirReceiptPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const mir = await program.account.mirReceipt.fetch(mirReceiptPda);
    expect(mir.owner.toString()).to.equal(owner.publicKey.toString());
    expect(mir.status).to.equal(0);
  });

  it("attests a MIR receipt", async () => {
    await program.methods
      .attestMir(computeAttestationHash)
      .accounts({
        attester: owner.publicKey,
        mirReceipt: mirReceiptPda,
      })
      .rpc();

    const mir = await program.account.mirReceipt.fetch(mirReceiptPda);
    expect(mir.status).to.equal(1);
    expect(Array.from(mir.computeAttestationHash)).to.deep.equal(computeAttestationHash);
  });

  it("creates a MemoryCollateralReceipt", async () => {
    [mcrPda] = findMcrPda(program.programId, owner.publicKey, mcrIdHash);

    await program.methods
      .createMemoryCollateralReceipt(mcrIdHash, m5AttestationRoot)
      .accounts({
        owner: owner.publicKey,
        repoProof: repoProofPda,
        memoryVault: memoryVaultPda,
        parentMir: mirReceiptPda,
        mcr: mcrPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const mcr = await program.account.memoryCollateralReceipt.fetch(mcrPda);
    expect(mcr.owner.toString()).to.equal(owner.publicKey.toString());
    expect(mcr.repoProof.toString()).to.equal(repoProofPda.toString());
    expect(mcr.memoryVault.toString()).to.equal(memoryVaultPda.toString());
    expect(mcr.parentMir.toString()).to.equal(mirReceiptPda.toString());
  });

  it("updates collateral score", async () => {
    await program.methods
      .updateCollateralScore(
        new anchor.BN(8500),
        new anchor.BN(50000),
        new anchor.BN(150000),
        1500
      )
      .accounts({
        owner: owner.publicKey,
        mcr: mcrPda,
      })
      .rpc();

    const mcr = await program.account.memoryCollateralReceipt.fetch(mcrPda);
    expect(mcr.collateralScore.toNumber()).to.equal(8500);
    expect(mcr.appraisalLowUsd.toNumber()).to.equal(50000);
    expect(mcr.appraisalHighUsd.toNumber()).to.equal(150000);
    expect(mcr.riskDiscountBps).to.equal(1500);
  });

  it("revokes a collateral receipt", async () => {
    await program.methods
      .revokeCollateralReceipt()
      .accounts({
        owner: owner.publicKey,
        mcr: mcrPda,
      })
      .rpc();

    const mcr = await program.account.memoryCollateralReceipt.fetch(mcrPda);
    expect(mcr.status).to.deep.equal({ revoked: {} });
  });

  it("prevents double revoke", async () => {
    try {
      await program.methods
        .revokeCollateralReceipt()
        .accounts({
          owner: owner.publicKey,
          mcr: mcrPda,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.toString()).to.include("AlreadyRevoked");
    }
  });
});
