/**
 * MEMBRA Attestation SDK
 *
 * Client for the membra_attestation program – the on-chain settlement layer
 * for the MEMBRA Proof-of-Build Network.
 *
 * PDA seeds (matching state.rs):
 *   ProtocolConfig  : [b"protocol_config"]
 *   ValidatorRecord : [b"validator", validator_authority]
 *   ProjectRecord   : [b"project", builder, project_id_le_bytes]
 *   AttestationRecord: [b"attestation", validator, project_record]
 *   ChallengeRecord : [b"challenge", attestation_record]
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { MEMBRA_ATTESTATION_PROGRAM_ID, ATTESTATION_SEEDS } from "./constants";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Five-dimensional score bundle passed to submit_attestation (0–100 each). */
export interface ScoreSet {
  /** Technical risk score (0 = high risk, 100 = low risk). */
  tech: number;
  /** Treasury risk score. */
  treasury: number;
  /** Tokenomics design risk score. */
  tokenomics: number;
  /** Governance risk score. */
  gov: number;
  /** Builder transparency score. */
  transparency: number;
}

/** Composite score as stored in a ProjectRecord after publication. */
export interface CompositeScore {
  tech: number;
  treasury: number;
  tokenomics: number;
  gov: number;
  transparency: number;
  /** Denominator: sum of all valid attesting validator stakes. */
  stakeWeight: bigint;
  attestationCount: number;
  validatorConfidence: number;
}

/** Parameters for initializing the protocol config. */
export interface InitProtocolParams {
  minStake: BN;
  slashBps: number;
  minAttestations: number;
  rewardPerJob: BN;
  tokenMint: PublicKey;
  rewardVault: PublicKey;
}

/** Parameters for registering a project. */
export interface RegisterProjectParams {
  projectId: BN;
  /** Builder wallet that submits the project (defaults to provider wallet). */
  builder?: PublicKey;
}

/** Raw ProtocolConfig account data as returned by Anchor. */
export interface ProtocolConfig {
  authority: PublicKey;
  tokenMint: PublicKey;
  rewardVault: PublicKey;
  minStake: BN;
  slashBps: number;
  minAttestations: number;
  rewardPerJob: BN;
  paused: boolean;
  bump: number;
}

/** Raw ValidatorRecord account data. */
export interface ValidatorRecord {
  authority: PublicKey;
  vault: PublicKey;
  stake: BN;
  reputation: number;
  completedJobs: BN;
  failedJobs: BN;
  slashCount: number;
  registeredAt: BN;
  bump: number;
  vaultBump: number;
}

/** Raw ProjectRecord account data. */
export interface ProjectRecord {
  builder: PublicKey;
  projectId: BN;
  submittedAt: BN;
  state: ProjectState;
  attestationCount: number;
  challengedCount: number;
  weightedTechSum: BN;
  weightedTreasurySum: BN;
  weightedTokenomicsSum: BN;
  weightedGovSum: BN;
  weightedTransparencySum: BN;
  totalStakeWeight: BN;
  techScore: number;
  treasuryScore: number;
  tokenomicsScore: number;
  govScore: number;
  transparencyScore: number;
  validatorConfidence: number;
  bump: number;
}

export type ProjectState =
  | { pending: Record<string, never> }
  | { scoring: Record<string, never> }
  | { scored: Record<string, never> }
  | { rejected: Record<string, never> };

// ─── PDA helpers ──────────────────────────────────────────────────────────────

export function findProtocolConfigPda(
  programId: PublicKey = MEMBRA_ATTESTATION_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ATTESTATION_SEEDS.PROTOCOL_CONFIG],
    programId
  );
}

export function findValidatorRecordPda(
  validator: PublicKey,
  programId: PublicKey = MEMBRA_ATTESTATION_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ATTESTATION_SEEDS.VALIDATOR, validator.toBuffer()],
    programId
  );
}

export function findProjectRecordPda(
  builder: PublicKey,
  projectId: BN,
  programId: PublicKey = MEMBRA_ATTESTATION_PROGRAM_ID
): [PublicKey, number] {
  const idBytes = Buffer.alloc(8);
  idBytes.writeBigUInt64LE(BigInt(projectId.toString()));
  return PublicKey.findProgramAddressSync(
    [ATTESTATION_SEEDS.PROJECT, builder.toBuffer(), idBytes],
    programId
  );
}

export function findAttestationRecordPda(
  validator: PublicKey,
  projectRecord: PublicKey,
  programId: PublicKey = MEMBRA_ATTESTATION_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ATTESTATION_SEEDS.ATTESTATION, validator.toBuffer(), projectRecord.toBuffer()],
    programId
  );
}

export function findChallengeRecordPda(
  attestationRecord: PublicKey,
  programId: PublicKey = MEMBRA_ATTESTATION_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ATTESTATION_SEEDS.CHALLENGE, attestationRecord.toBuffer()],
    programId
  );
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export async function fetchProtocolConfig(
  program: Program<any>
): Promise<ProtocolConfig | null> {
  const [pda] = findProtocolConfigPda(program.programId);
  try {
    return (await program.account.protocolConfig.fetch(pda)) as ProtocolConfig;
  } catch {
    return null;
  }
}

export async function fetchValidatorRecord(
  program: Program<any>,
  validator: PublicKey
): Promise<ValidatorRecord | null> {
  const [pda] = findValidatorRecordPda(validator, program.programId);
  try {
    return (await program.account.validatorRecord.fetch(pda)) as ValidatorRecord;
  } catch {
    return null;
  }
}

export async function fetchProjectRecord(
  program: Program<any>,
  builder: PublicKey,
  projectId: BN
): Promise<ProjectRecord | null> {
  const [pda] = findProjectRecordPda(builder, projectId, program.programId);
  try {
    return (await program.account.projectRecord.fetch(pda)) as ProjectRecord;
  } catch {
    return null;
  }
}

// ─── Instruction builders ─────────────────────────────────────────────────────

export async function buildInitializeProtocol(
  program: Program<any>,
  params: InitProtocolParams & { authority: PublicKey }
): Promise<TransactionInstruction> {
  const [config] = findProtocolConfigPda(program.programId);
  return program.methods
    .initialize(
      params.minStake,
      params.slashBps,
      params.minAttestations,
      params.rewardPerJob
    )
    .accounts({
      authority: params.authority,
      config,
      tokenMint: params.tokenMint,
      rewardVault: params.rewardVault,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

export async function buildRegisterValidator(
  program: Program<any>,
  params: {
    validator: PublicKey;
    tokenMint: PublicKey;
    validatorVault: PublicKey;
  }
): Promise<TransactionInstruction> {
  const [config] = findProtocolConfigPda(program.programId);
  const [validatorRecord] = findValidatorRecordPda(params.validator, program.programId);
  return program.methods
    .registerValidator()
    .accounts({
      validator: params.validator,
      config,
      validatorRecord,
      tokenMint: params.tokenMint,
      validatorVault: params.validatorVault,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

export async function buildStakeValidator(
  program: Program<any>,
  params: {
    validator: PublicKey;
    tokenMint: PublicKey;
    amount: BN;
  }
): Promise<TransactionInstruction> {
  const [config] = findProtocolConfigPda(program.programId);
  const [validatorRecord] = findValidatorRecordPda(params.validator, program.programId);
  const validatorAta = await getAssociatedTokenAddress(params.tokenMint, params.validator);
  // Vault address is stored in validatorRecord; the caller must pass it explicitly
  // here we derive it by fetching the record. The low-level builder accepts it directly.
  return program.methods
    .stakeValidator(params.amount)
    .accounts({
      validator: params.validator,
      config,
      validatorRecord,
      tokenMint: params.tokenMint,
      validatorAta,
      // validatorVault is resolved via has_one constraint from validatorRecord
    })
    .instruction();
}

export async function buildRegisterProject(
  program: Program<any>,
  params: {
    builder: PublicKey;
    projectId: BN;
  }
): Promise<TransactionInstruction> {
  const [config] = findProtocolConfigPda(program.programId);
  const [projectRecord] = findProjectRecordPda(
    params.builder,
    params.projectId,
    program.programId
  );
  return program.methods
    .registerProject(params.projectId)
    .accounts({
      builder: params.builder,
      config,
      projectRecord,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function buildSubmitAttestation(
  program: Program<any>,
  params: {
    validator: PublicKey;
    projectRecord: PublicKey;
    reportHash: Uint8Array;
    jobType: number;
    scores: ScoreSet;
  }
): Promise<TransactionInstruction> {
  const [config] = findProtocolConfigPda(program.programId);
  const [validatorRecord] = findValidatorRecordPda(params.validator, program.programId);
  const [attestationRecord] = findAttestationRecordPda(
    params.validator,
    params.projectRecord,
    program.programId
  );
  const reportHashArr = Array.from(params.reportHash) as number[];
  if (reportHashArr.length !== 32) {
    throw new Error("reportHash must be exactly 32 bytes");
  }
  return program.methods
    .submitAttestation(reportHashArr, params.jobType, params.scores)
    .accounts({
      validator: params.validator,
      config,
      validatorRecord,
      projectRecord: params.projectRecord,
      attestationRecord,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function buildChallengeAttestation(
  program: Program<any>,
  params: {
    challenger: PublicKey;
    attestationRecord: PublicKey;
    projectRecord: PublicKey;
  }
): Promise<TransactionInstruction> {
  const [challengeRecord] = findChallengeRecordPda(
    params.attestationRecord,
    program.programId
  );
  return program.methods
    .challengeAttestation()
    .accounts({
      challenger: params.challenger,
      attestationRecord: params.attestationRecord,
      projectRecord: params.projectRecord,
      challengeRecord,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function buildResolveChallenge(
  program: Program<any>,
  params: {
    authority: PublicKey;
    challengeRecord: PublicKey;
    attestationRecord: PublicKey;
    projectRecord: PublicKey;
    validatorRecord: PublicKey;
    validatorVault: PublicKey;
    tokenMint: PublicKey;
    upheld: boolean;
  }
): Promise<TransactionInstruction> {
  const [config] = findProtocolConfigPda(program.programId);
  return program.methods
    .resolveChallenge(params.upheld)
    .accounts({
      authority: params.authority,
      config,
      challengeRecord: params.challengeRecord,
      attestationRecord: params.attestationRecord,
      projectRecord: params.projectRecord,
      validatorRecord: params.validatorRecord,
      validatorVault: params.validatorVault,
      tokenMint: params.tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

export async function buildRewardValidator(
  program: Program<any>,
  params: {
    authority: PublicKey;
    rewardVault: PublicKey;
    validatorRecord: PublicKey;
    validatorAta: PublicKey;
    tokenMint: PublicKey;
    amount: BN;
  }
): Promise<TransactionInstruction> {
  const [config] = findProtocolConfigPda(program.programId);
  return program.methods
    .rewardValidator(params.amount)
    .accounts({
      authority: params.authority,
      config,
      rewardVault: params.rewardVault,
      validatorRecord: params.validatorRecord,
      validatorAta: params.validatorAta,
      tokenMint: params.tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

export async function buildPublishProjectScore(
  program: Program<any>,
  params: {
    authority: PublicKey;
    projectRecord: PublicKey;
  }
): Promise<TransactionInstruction> {
  const [config] = findProtocolConfigPda(program.programId);
  return program.methods
    .publishProjectScore()
    .accounts({
      authority: params.authority,
      config,
      projectRecord: params.projectRecord,
    })
    .instruction();
}

// ─── Derived score helpers ─────────────────────────────────────────────────────

/**
 * Compute the stake-weighted composite score from a raw ProjectRecord.
 * Returns null if no valid (non-challenged) attestations exist yet.
 */
export function computeCompositeScore(project: ProjectRecord): CompositeScore | null {
  const weight = BigInt(project.totalStakeWeight.toString());
  if (weight === BigInt(0)) return null;

  function wavg(weightedSum: BN): number {
    const numerator = BigInt(weightedSum.toString());
    return Number((numerator * BigInt(100)) / weight) / 100;
  }

  return {
    tech: wavg(project.weightedTechSum),
    treasury: wavg(project.weightedTreasurySum),
    tokenomics: wavg(project.weightedTokenomicsSum),
    gov: wavg(project.weightedGovSum),
    transparency: wavg(project.weightedTransparencySum),
    stakeWeight: weight,
    attestationCount: project.attestationCount,
    validatorConfidence: project.validatorConfidence,
  };
}

/**
 * Build a human-readable description of the project lifecycle state.
 */
export function describeProjectState(state: ProjectState): string {
  if ("pending" in state) return "Pending";
  if ("scoring" in state) return "Scoring";
  if ("scored" in state) return "Scored";
  if ("rejected" in state) return "Rejected";
  return "Unknown";
}

// ─── AttestationClient class ─────────────────────────────────────────────────

/**
 * High-level client for the membra_attestation program.
 *
 * Wraps instruction builders and provides convenience `send` methods that
 * build, sign, and confirm transactions in one call using the provided
 * AnchorProvider.
 */
export class AttestationClient {
  private readonly program: Program<any>;
  private readonly provider: AnchorProvider;

  constructor(program: Program<any>, provider: AnchorProvider) {
    this.program = program;
    this.provider = provider;
  }

  private get wallet(): PublicKey {
    return this.provider.wallet.publicKey;
  }

  /**
   * Initialize the ProtocolConfig PDA.
   * Returns the transaction signature.
   */
  async initializeProtocol(params: InitProtocolParams): Promise<string> {
    const ix = await buildInitializeProtocol(this.program, {
      ...params,
      authority: this.wallet,
    });
    return this.provider.sendAndConfirm(
      new (await import("@solana/web3.js")).Transaction().add(ix)
    );
  }

  /**
   * Register the connected wallet as a validator.
   * The caller must have pre-created a token vault owned by the validatorRecord PDA.
   */
  async registerValidator(params: {
    tokenMint: PublicKey;
    validatorVault: PublicKey;
  }): Promise<string> {
    const ix = await buildRegisterValidator(this.program, {
      validator: this.wallet,
      ...params,
    });
    return this.provider.sendAndConfirm(
      new (await import("@solana/web3.js")).Transaction().add(ix)
    );
  }

  /**
   * Stake tokens into the validator vault.
   */
  async stakeValidator(params: {
    tokenMint: PublicKey;
    amount: BN;
  }): Promise<string> {
    const ix = await buildStakeValidator(this.program, {
      validator: this.wallet,
      ...params,
    });
    return this.provider.sendAndConfirm(
      new (await import("@solana/web3.js")).Transaction().add(ix)
    );
  }

  /**
   * Register a project for validator review.
   */
  async registerProject(params: RegisterProjectParams): Promise<string> {
    const builder = params.builder ?? this.wallet;
    const ix = await buildRegisterProject(this.program, {
      builder,
      projectId: params.projectId,
    });
    return this.provider.sendAndConfirm(
      new (await import("@solana/web3.js")).Transaction().add(ix)
    );
  }

  /**
   * Submit an attestation with a ScoreSet for a project.
   */
  async submitAttestation(
    projectRecord: PublicKey,
    reportHash: Uint8Array,
    jobType: number,
    scores: ScoreSet
  ): Promise<string> {
    const ix = await buildSubmitAttestation(this.program, {
      validator: this.wallet,
      projectRecord,
      reportHash,
      jobType,
      scores,
    });
    return this.provider.sendAndConfirm(
      new (await import("@solana/web3.js")).Transaction().add(ix)
    );
  }

  /**
   * Challenge an attestation.
   */
  async challengeAttestation(
    attestationRecord: PublicKey,
    projectRecord: PublicKey
  ): Promise<string> {
    const ix = await buildChallengeAttestation(this.program, {
      challenger: this.wallet,
      attestationRecord,
      projectRecord,
    });
    return this.provider.sendAndConfirm(
      new (await import("@solana/web3.js")).Transaction().add(ix)
    );
  }

  /**
   * Resolve a challenge (authority only).
   */
  async resolveChallenge(
    challengeRecord: PublicKey,
    attestationRecord: PublicKey,
    projectRecord: PublicKey,
    validatorRecord: PublicKey,
    validatorVault: PublicKey,
    tokenMint: PublicKey,
    upheld: boolean
  ): Promise<string> {
    const ix = await buildResolveChallenge(this.program, {
      authority: this.wallet,
      challengeRecord,
      attestationRecord,
      projectRecord,
      validatorRecord,
      validatorVault,
      tokenMint,
      upheld,
    });
    return this.provider.sendAndConfirm(
      new (await import("@solana/web3.js")).Transaction().add(ix)
    );
  }

  /**
   * Reward a validator for a completed job (authority only).
   */
  async rewardValidator(
    rewardVault: PublicKey,
    validatorRecord: PublicKey,
    validatorAta: PublicKey,
    tokenMint: PublicKey,
    amount: BN
  ): Promise<string> {
    const ix = await buildRewardValidator(this.program, {
      authority: this.wallet,
      rewardVault,
      validatorRecord,
      validatorAta,
      tokenMint,
      amount,
    });
    return this.provider.sendAndConfirm(
      new (await import("@solana/web3.js")).Transaction().add(ix)
    );
  }

  /**
   * Publish the final stake-weighted score for a project (authority only).
   */
  async publishProjectScore(projectRecord: PublicKey): Promise<string> {
    const ix = await buildPublishProjectScore(this.program, {
      authority: this.wallet,
      projectRecord,
    });
    return this.provider.sendAndConfirm(
      new (await import("@solana/web3.js")).Transaction().add(ix)
    );
  }

  /**
   * Fetch the live composite score for a project.
   * Returns null if the project doesn't exist or has no valid attestations.
   */
  async getProjectScore(
    builder: PublicKey,
    projectId: BN
  ): Promise<CompositeScore | null> {
    const record = await fetchProjectRecord(this.program, builder, projectId);
    if (!record) return null;
    return computeCompositeScore(record);
  }

  /**
   * Fetch the ProtocolConfig singleton.
   */
  async getProtocolConfig(): Promise<ProtocolConfig | null> {
    return fetchProtocolConfig(this.program);
  }

  /**
   * Fetch a ValidatorRecord.
   */
  async getValidatorRecord(validator: PublicKey): Promise<ValidatorRecord | null> {
    return fetchValidatorRecord(this.program, validator);
  }
}
