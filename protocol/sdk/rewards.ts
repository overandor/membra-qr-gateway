import { PublicKey, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  MEMBRA_REWARDS_PROGRAM_ID,
  REWARDS_POOL_SEED,
  USER_STAKE_SEED,
  LOCK_RECORD_SEED,
  LOCK_DURATIONS,
  LOCK_MULTIPLIERS_BPS,
  REWARD_SCALE,
} from "./constants";
import type { RewardsPool, UserStakeAccount } from "./types";

// ─── PDA helpers ─────────────────────────────────────────────────────────────

export function findRewardsPoolPda(
  rewardMint: PublicKey,
  stakeMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [REWARDS_POOL_SEED, rewardMint.toBuffer(), stakeMint.toBuffer()],
    MEMBRA_REWARDS_PROGRAM_ID
  );
}

export function findUserStakePda(
  rewardsPool: PublicKey,
  user: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_STAKE_SEED, rewardsPool.toBuffer(), user.toBuffer()],
    MEMBRA_REWARDS_PROGRAM_ID
  );
}

export function findLockRecordPda(
  rewardsPool: PublicKey,
  user: PublicKey,
  lockIndex: BN
): [PublicKey, number] {
  const indexBytes = Buffer.alloc(8);
  indexBytes.writeBigUInt64LE(BigInt(lockIndex.toString()));
  return PublicKey.findProgramAddressSync(
    [LOCK_RECORD_SEED, rewardsPool.toBuffer(), user.toBuffer(), indexBytes],
    MEMBRA_REWARDS_PROGRAM_ID
  );
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export async function fetchRewardsPool(
  program: Program<any>,
  rewardMint: PublicKey,
  stakeMint: PublicKey
): Promise<RewardsPool | null> {
  const [pda] = findRewardsPoolPda(rewardMint, stakeMint);
  try {
    return (await program.account.rewardsPool.fetch(pda)) as RewardsPool;
  } catch {
    return null;
  }
}

export async function fetchUserStake(
  program: Program<any>,
  rewardsPool: PublicKey,
  user: PublicKey
): Promise<UserStakeAccount | null> {
  const [pda] = findUserStakePda(rewardsPool, user);
  try {
    return (await program.account.userStakeAccount.fetch(pda)) as UserStakeAccount;
  } catch {
    return null;
  }
}

// ─── Write helpers ────────────────────────────────────────────────────────────

export async function buildStake(
  program: Program<any>,
  params: {
    rewardsPool: PublicKey;
    stakeMint: PublicKey;
    stakeVault: PublicKey;
    user: PublicKey;
    amount: BN;
    lockDurationSeconds: BN;
  }
): Promise<TransactionInstruction> {
  const [userStake] = findUserStakePda(params.rewardsPool, params.user);
  const userStakeAta = await getAssociatedTokenAddress(params.stakeMint, params.user);
  return program.methods
    .stake(params.amount, params.lockDurationSeconds)
    .accounts({
      rewardsPool: params.rewardsPool,
      userStakeAccount: userStake,
      stakeVault: params.stakeVault,
      userStakeTokenAccount: userStakeAta,
      user: params.user,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

export async function buildClaimRewards(
  program: Program<any>,
  params: {
    rewardsPool: PublicKey;
    rewardMint: PublicKey;
    rewardVault: PublicKey;
    user: PublicKey;
  }
): Promise<TransactionInstruction> {
  const [userStake] = findUserStakePda(params.rewardsPool, params.user);
  const userRewardAta = await getAssociatedTokenAddress(params.rewardMint, params.user);
  return program.methods
    .claimRewards()
    .accounts({
      rewardsPool: params.rewardsPool,
      userStakeAccount: userStake,
      rewardVault: params.rewardVault,
      userRewardTokenAccount: userRewardAta,
      user: params.user,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

/**
 * Look up the reward multiplier BPS for a lock duration.
 */
export function getMultiplierBps(lockDurationSeconds: number): number {
  const durations = Object.entries(LOCK_DURATIONS) as [string, number][];
  for (const [, v] of durations) {
    if (v === lockDurationSeconds && lockDurationSeconds in LOCK_MULTIPLIERS_BPS) {
      return LOCK_MULTIPLIERS_BPS[lockDurationSeconds as keyof typeof LOCK_MULTIPLIERS_BPS];
    }
  }
  throw new Error(`Invalid lock duration: ${lockDurationSeconds}s`);
}

/**
 * Compute weighted shares for a given stake amount and lock duration.
 */
export function computeWeightedShares(
  stakedAmount: bigint,
  lockDurationSeconds: number
): bigint {
  const multiplierBps = BigInt(getMultiplierBps(lockDurationSeconds));
  return (stakedAmount * multiplierBps) / BigInt(10_000);
}

/**
 * Compute pending rewards for a user given pool state.
 * pending = weightedShares * accumulatedRewardPerShare / REWARD_SCALE - rewardDebt
 */
export function computePendingRewards(params: {
  weightedShares: bigint;
  accumulatedRewardPerShare: bigint;
  rewardDebt: bigint;
}): bigint {
  const gross =
    (params.weightedShares * params.accumulatedRewardPerShare) / REWARD_SCALE;
  const pending = gross > params.rewardDebt ? gross - params.rewardDebt : BigInt(0);
  return pending;
}

/**
 * Compute the early exit penalty amount.
 */
export function computeEarlyExitPenalty(
  stakedAmount: bigint,
  earlyExitPenaltyBps: bigint
): bigint {
  return (stakedAmount * earlyExitPenaltyBps) / BigInt(10_000);
}

/**
 * Build UI summary for a user's stake position.
 */
export function buildStakeSummary(
  stake: UserStakeAccount,
  pool: RewardsPool,
  currentTs: number
): {
  stakedAmountFormatted: number;
  lockEndDate: Date | null;
  isLocked: boolean;
  multiplierFormatted: string;
  pendingRewards: bigint;
  lockDurationLabel: string;
} {
  const isLocked = stake.lockEndTs.toNumber() > currentTs;
  const pendingRewards = computePendingRewards({
    weightedShares: BigInt(stake.weightedShares.toString()),
    accumulatedRewardPerShare: BigInt(pool.accumulatedRewardPerShare.toString()),
    rewardDebt: BigInt(stake.rewardDebt.toString()),
  });

  const durationLabels: Record<number, string> = {
    [LOCK_DURATIONS.NONE]: "Flexible",
    [LOCK_DURATIONS.DAYS_30]: "30 days",
    [LOCK_DURATIONS.DAYS_90]: "90 days",
    [LOCK_DURATIONS.DAYS_180]: "180 days",
    [LOCK_DURATIONS.DAYS_365]: "365 days",
  };

  return {
    stakedAmountFormatted: stake.stakedAmount.toNumber() / 1_000_000,
    lockEndDate: isLocked ? new Date(stake.lockEndTs.toNumber() * 1000) : null,
    isLocked,
    multiplierFormatted: `${stake.rewardMultiplierBps.toNumber() / 10_000}x`,
    pendingRewards,
    lockDurationLabel:
      durationLabels[stake.lockDurationSeconds.toNumber()] ?? "Custom",
  };
}
