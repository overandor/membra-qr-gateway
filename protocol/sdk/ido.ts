import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  MEMBRA_IDO_PROGRAM_ID,
  IDO_CONFIG_SEED,
  USER_IDO_RECORD_SEED,
} from "./constants";
import type { IdoConfig, UserIdoRecord, IdoInitParams } from "./types";

// ─── PDA helpers ─────────────────────────────────────────────────────────────

export function findIdoConfigPda(tokenMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [IDO_CONFIG_SEED, tokenMint.toBuffer()],
    MEMBRA_IDO_PROGRAM_ID
  );
}

export function findUserIdoRecordPda(
  idoConfig: PublicKey,
  user: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_IDO_RECORD_SEED, idoConfig.toBuffer(), user.toBuffer()],
    MEMBRA_IDO_PROGRAM_ID
  );
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

/**
 * Fetch the IDO config for a given token mint.
 * Returns null if the account doesn't exist yet.
 */
export async function fetchIdoConfig(
  // program: Program<MembraIdo>,
  program: Program<any>,
  tokenMint: PublicKey
): Promise<IdoConfig | null> {
  const [pda] = findIdoConfigPda(tokenMint);
  try {
    return (await program.account.idoConfig.fetch(pda)) as IdoConfig;
  } catch {
    return null;
  }
}

/**
 * Fetch a user's IDO record.
 */
export async function fetchUserIdoRecord(
  program: Program<any>,
  idoConfig: PublicKey,
  user: PublicKey
): Promise<UserIdoRecord | null> {
  const [pda] = findUserIdoRecordPda(idoConfig, user);
  try {
    return (await program.account.userIdoRecord.fetch(pda)) as UserIdoRecord;
  } catch {
    return null;
  }
}

// ─── Write helpers (instruction builders) ────────────────────────────────────

/**
 * Build the initializeIdo instruction.
 */
export async function buildInitializeIdo(
  program: Program<any>,
  params: IdoInitParams & {
    tokenMint: PublicKey;
    paymentMint: PublicKey;
    tokenVault: PublicKey;
    paymentVault: PublicKey;
    treasury: PublicKey;
    governance: PublicKey;
    authority: PublicKey;
  }
): Promise<TransactionInstruction> {
  const [idoConfig] = findIdoConfigPda(params.tokenMint);
  return program.methods
    .initializeIdo(
      params.tokenPriceUsd6,
      params.hardCapTokens,
      params.minPurchaseTokens,
      params.maxPurchaseTokens,
      params.startTs,
      params.endTs,
      params.claimStartTs,
      params.unsoldBurn
    )
    .accounts({
      idoConfig,
      tokenMint: params.tokenMint,
      paymentMint: params.paymentMint,
      tokenVault: params.tokenVault,
      paymentVault: params.paymentVault,
      treasury: params.treasury,
      governance: params.governance,
      authority: params.authority,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

/**
 * Build the buyIdo instruction.
 */
export async function buildBuyIdo(
  program: Program<any>,
  params: {
    idoConfig: PublicKey;
    tokenMint: PublicKey;
    paymentMint: PublicKey;
    paymentVault: PublicKey;
    user: PublicKey;
    amount: BN;
  }
): Promise<TransactionInstruction> {
  const [userIdoRecord] = findUserIdoRecordPda(params.idoConfig, params.user);
  const userPaymentAta = await getAssociatedTokenAddress(
    params.paymentMint,
    params.user
  );
  return program.methods
    .buyIdo(params.amount)
    .accounts({
      idoConfig: params.idoConfig,
      userIdoRecord,
      paymentVault: params.paymentVault,
      userPaymentAccount: userPaymentAta,
      user: params.user,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

/**
 * Build the claimIdoTokens instruction.
 */
export async function buildClaimIdoTokens(
  program: Program<any>,
  params: {
    idoConfig: PublicKey;
    tokenMint: PublicKey;
    tokenVault: PublicKey;
    user: PublicKey;
  }
): Promise<TransactionInstruction> {
  const [userIdoRecord] = findUserIdoRecordPda(params.idoConfig, params.user);
  const userTokenAta = await getAssociatedTokenAddress(
    params.tokenMint,
    params.user
  );
  return program.methods
    .claimIdoTokens()
    .accounts({
      idoConfig: params.idoConfig,
      userIdoRecord,
      tokenVault: params.tokenVault,
      userTokenAccount: userTokenAta,
      user: params.user,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// ─── UI data helpers ──────────────────────────────────────────────────────────

/**
 * Compute human-readable IDO progress metrics.
 */
export function computeIdoProgress(config: IdoConfig): {
  soldPct: number;
  raisedUsdc: number;
  remainingTokens: BN;
  isActive: boolean;
  isFinalized: boolean;
  isCancelled: boolean;
} {
  const soldPct =
    config.hardCapTokens.isZero()
      ? 0
      : (config.totalSoldTokens.toNumber() / config.hardCapTokens.toNumber()) * 100;

  const raisedUsdc = config.totalRaisedPayment.toNumber() / 1_000_000;

  const remainingTokens = config.hardCapTokens.sub(config.totalSoldTokens);

  const now = Math.floor(Date.now() / 1000);
  const isActive =
    !config.paused &&
    !config.finalized &&
    !config.cancelled &&
    now >= config.startTs.toNumber() &&
    now <= config.endTs.toNumber();

  return {
    soldPct,
    raisedUsdc,
    remainingTokens,
    isActive,
    isFinalized: config.finalized,
    isCancelled: config.cancelled,
  };
}

/**
 * Compute the USDC cost for a given token purchase amount.
 */
export function computePurchaseCost(
  tokenAmount: BN,
  tokenPriceUsd6: BN
): BN {
  // cost = tokens * price / 1_000_000 (normalize decimals)
  return tokenAmount.mul(tokenPriceUsd6).divn(1_000_000);
}
