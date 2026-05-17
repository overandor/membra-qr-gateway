import { PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import {
  MEMBRA_REBASE_PROGRAM_ID,
  REBASE_STATE_SEED,
  REBASE_INDEX_SCALE,
} from "./constants";
import type { RebaseState, RebaseInitParams } from "./types";

// ─── PDA helpers ─────────────────────────────────────────────────────────────

export function findRebaseStatePda(tokenMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [REBASE_STATE_SEED, tokenMint.toBuffer()],
    MEMBRA_REBASE_PROGRAM_ID
  );
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export async function fetchRebaseState(
  program: Program<any>,
  tokenMint: PublicKey
): Promise<RebaseState | null> {
  const [pda] = findRebaseStatePda(tokenMint);
  try {
    return (await program.account.rebaseState.fetch(pda)) as RebaseState;
  } catch {
    return null;
  }
}

// ─── Write helpers ────────────────────────────────────────────────────────────

export async function buildInitializeRebase(
  program: Program<any>,
  params: RebaseInitParams & {
    tokenMint: PublicKey;
    oraclePriceFeed: PublicKey;
    authority: PublicKey;
  }
): Promise<TransactionInstruction> {
  const [rebaseState] = findRebaseStatePda(params.tokenMint);
  return program.methods
    .initializeRebase(
      params.targetPriceUsd6,
      params.monitoringBandMinUsd6,
      params.monitoringBandMaxUsd6,
      params.maxPositiveRebaseBps,
      params.maxNegativeRebaseBps,
      params.rebaseCoefficientBps,
      params.minEpochSeconds,
      params.stalePriceThresholdSeconds,
      params.volatilityCircuitBreakerBps,
      params.oracleSource,
      params.governance
    )
    .accounts({
      rebaseState,
      tokenMint: params.tokenMint,
      oraclePriceFeed: params.oraclePriceFeed,
      authority: params.authority,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function buildUpdateOraclePrice(
  program: Program<any>,
  params: {
    tokenMint: PublicKey;
    authority: PublicKey;
    newPriceUsd6: BN;
    confidenceUsd6: BN;
    oracleTs: BN;
  }
): Promise<TransactionInstruction> {
  const [rebaseState] = findRebaseStatePda(params.tokenMint);
  return program.methods
    .updateOraclePrice(params.newPriceUsd6, params.confidenceUsd6, params.oracleTs)
    .accounts({
      rebaseState,
      authority: params.authority,
    })
    .instruction();
}

export async function buildExecuteRebase(
  program: Program<any>,
  params: {
    tokenMint: PublicKey;
    authority: PublicKey;
  }
): Promise<TransactionInstruction> {
  const [rebaseState] = findRebaseStatePda(params.tokenMint);
  return program.methods
    .executeRebase()
    .accounts({
      rebaseState,
      authority: params.authority,
    })
    .instruction();
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

/**
 * Compute how many tokens a holder's shares are worth at the current index.
 * redeemable = shares * globalRebaseIndex / REBASE_INDEX_SCALE
 */
export function computeRedeemableTokens(
  shares: bigint,
  globalRebaseIndex: bigint
): bigint {
  return (shares * globalRebaseIndex) / REBASE_INDEX_SCALE;
}

/**
 * Compute the expected rebase BPS given a TWAP price and config.
 * Returns the raw (unclamped) BPS value.
 */
export function computeRawRebaseBps(params: {
  twapPriceUsd6: number;
  targetPriceUsd6: number;
  rebaseCoefficientBps: number;
}): number {
  const deviationBps =
    ((params.twapPriceUsd6 - params.targetPriceUsd6) / params.targetPriceUsd6) *
    10_000;
  return Math.round((-deviationBps * params.rebaseCoefficientBps) / 10_000);
}

/**
 * Clamp rebase BPS to configured limits.
 */
export function clampRebaseBps(
  rawBps: number,
  maxPositiveBps: number,
  maxNegativeBps: number
): number {
  return Math.max(maxNegativeBps, Math.min(maxPositiveBps, rawBps));
}

/**
 * Simulate index update: new_index = old_index * (10_000 + rebase_bps) / 10_000
 */
export function simulateIndexUpdate(
  currentIndex: bigint,
  rebaseBps: number
): bigint {
  return (currentIndex * BigInt(10_000 + rebaseBps)) / BigInt(10_000);
}

/**
 * Build a human-readable rebase summary for UI display.
 */
export function buildRebaseSummary(state: RebaseState): {
  currentIndexFormatted: string;
  lastRebaseBps: number;
  lastTwapPriceUsd: number;
  targetPriceUsd: number;
  monitoringBandMin: number;
  monitoringBandMax: number;
  paused: boolean;
  lastRebaseDate: Date;
} {
  return {
    currentIndexFormatted: (
      Number(BigInt(state.globalRebaseIndex.toString())) /
      Number(REBASE_INDEX_SCALE)
    ).toFixed(6),
    lastRebaseBps: state.lastRebaseBps.toNumber(),
    lastTwapPriceUsd: state.lastTwapPriceUsd6.toNumber() / 1_000_000,
    targetPriceUsd: state.targetPriceUsd6.toNumber() / 1_000_000,
    monitoringBandMin: state.monitoringBandMinUsd6.toNumber() / 1_000_000,
    monitoringBandMax: state.monitoringBandMaxUsd6.toNumber() / 1_000_000,
    paused: state.paused,
    lastRebaseDate: new Date(state.lastRebaseTs.toNumber() * 1000),
  };
}
