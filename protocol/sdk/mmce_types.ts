import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export type VisibilityClass =
  | { public: Record<string, never> }
  | { private: Record<string, never> }
  | { localOnly: Record<string, never> };

export type CollateralStatus =
  | { created: Record<string, never> }
  | { repoHashed: Record<string, never> }
  | { memoryBound: Record<string, never> }
  | { inferenceLinked: Record<string, never> }
  | { m5Attested: Record<string, never> }
  | { anchorRegistered: Record<string, never> }
  | { collateralScored: Record<string, never> }
  | { readyForAppraisal: Record<string, never> }
  | { disputed: Record<string, never> }
  | { revoked: Record<string, never> }
  | { expired: Record<string, never> }
  | { updated: Record<string, never> }
  | { reappraised: Record<string, never> }
  | { escrowed: Record<string, never> }
  | { licensed: Record<string, never> };

export interface MemoryVault {
  owner: PublicKey;
  agentIdHash: number[];
  memoryRoot: number[];
  embeddingIndexHash: number[];
  policyHash: number[];
  createdAt: BN;
  updatedAt: BN;
  bump: number;
}

export interface RepoProof {
  owner: PublicKey;
  repoOwnerHash: number[];
  repoNameHash: number[];
  headCommitHash: number[];
  fileTreeMerkleRoot: number[];
  astMerkleRoot: number[];
  dependencyFingerprintHash: number[];
  testTraceHash: number[];
  commitCount: BN;
  firstCommitUnix: BN;
  lastCommitUnix: BN;
  visibilityClass: VisibilityClass;
  createdAt: BN;
  bump: number;
}

export interface MIRReceipt {
  owner: PublicKey;
  agentIdHash: number[];
  jobIdHash: number[];
  inputMerkleRoot: number[];
  outputMerkleRoot: number[];
  modelManifestHash: number[];
  computeAttestationHash: number[];
  status: number;
  createdAt: BN;
  attestedAt: BN;
  settledAt: BN;
  bump: number;
}

export interface MemoryCollateralReceipt {
  owner: PublicKey;
  repoProof: PublicKey;
  memoryVault: PublicKey;
  parentMir: PublicKey;
  m5AttestationRoot: number[];
  collateralScore: BN;
  appraisalLowUsd: BN;
  appraisalHighUsd: BN;
  riskDiscountBps: number;
  status: CollateralStatus;
  createdAt: BN;
  updatedAt: BN;
  bump: number;
}

export interface MCRSchema {
  mcrVersion: string;
  mcrId: string;
  ownerWallet: string;
  createdAt: number;
  githubProof: {
    repoProvider: string;
    repoOwnerHash: string;
    repoNameHash: string;
    visibility: string;
    headCommitHash: string;
    commitCount: number;
    firstCommitUnix: number;
    lastCommitUnix: number;
    fileTreeMerkleRoot: string;
    astMerkleRoot: string;
    dependencyFingerprintHash: string;
    testTraceHash: string;
  };
  llmMemory: {
    agentIdHash: string;
    memoryVaultHash: string;
    memorySummaryHash: string;
    embeddingIndexHash: string;
    memoryPolicy: string;
    redactedSummary: string;
  };
  mirLinkage: {
    parentMirId: string;
    childMirIds: string[];
    mirMerkleRoot: string;
    inferenceCount: number;
    validatedJobs: number;
    settledJobs: number;
  };
  m5Attestation: {
    m5NodeIds: string[];
    computeScore: number;
    resourceAttestationHash: string;
    modelManifestHash: string;
    quorumReached: boolean;
  };
  collateralScore: {
    engineeringReplacementCostUsd: number;
    complexityScore: number;
    continuityScore: number;
    testScore: number;
    dependencyScore: number;
    revenueOptionalityScore: number;
    riskDiscount: number;
    finalCollateralScore: number;
    appraisalRangeLowUsd: number;
    appraisalRangeHighUsd: number;
  };
  anchorRegistry: {
    cluster: string;
    programId: string;
    mcrAccount: string;
    txHash: string;
    registeredAt: number;
  };
}
