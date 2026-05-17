import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ─── IDO ────────────────────────────────────────────────────────────────────

export interface IdoConfig {
  authority: PublicKey;
  tokenMint: PublicKey;
  paymentMint: PublicKey;
  tokenVault: PublicKey;
  paymentVault: PublicKey;
  treasury: PublicKey;
  governance: PublicKey;
  tokenPriceUsd6: BN;
  hardCapTokens: BN;
  minPurchaseTokens: BN;
  maxPurchaseTokens: BN;
  totalSoldTokens: BN;
  totalRaisedPayment: BN;
  startTs: BN;
  endTs: BN;
  claimStartTs: BN;
  finalized: boolean;
  cancelled: boolean;
  paused: boolean;
  unsoldBurn: boolean;
  bump: number;
}

export interface UserIdoRecord {
  user: PublicKey;
  idoConfig: PublicKey;
  tokensPurchased: BN;
  paymentDeposited: BN;
  tokensClaimed: boolean;
  refunded: boolean;
  bump: number;
}

export interface IdoInitParams {
  tokenPriceUsd6: BN;
  hardCapTokens: BN;
  minPurchaseTokens: BN;
  maxPurchaseTokens: BN;
  startTs: BN;
  endTs: BN;
  claimStartTs: BN;
  unsoldBurn: boolean;
}

// ─── Rebase ─────────────────────────────────────────────────────────────────

export interface RebaseState {
  authority: PublicKey;
  governance: PublicKey;
  tokenMint: PublicKey;
  oraclePriceFeed: PublicKey;
  oracleSource: number;
  targetPriceUsd6: BN;
  monitoringBandMinUsd6: BN;
  monitoringBandMaxUsd6: BN;
  maxPositiveRebaseBps: BN;
  maxNegativeRebaseBps: BN;
  rebaseCoefficientBps: BN;
  minEpochSeconds: BN;
  lastRebaseTs: BN;
  lastRebaseBps: BN;
  lastTwapPriceUsd6: BN;
  globalRebaseIndex: BN;
  totalShares: BN;
  paused: boolean;
  stalePriceThresholdSeconds: BN;
  volatilityCircuitBreakerBps: BN;
  lastOracleUpdateTs: BN;
  lastOraclePriceUsd6: BN;
  bump: number;
}

export interface RebaseInitParams {
  targetPriceUsd6: BN;
  monitoringBandMinUsd6: BN;
  monitoringBandMaxUsd6: BN;
  maxPositiveRebaseBps: BN;
  maxNegativeRebaseBps: BN;
  rebaseCoefficientBps: BN;
  minEpochSeconds: BN;
  stalePriceThresholdSeconds: BN;
  volatilityCircuitBreakerBps: BN;
  oracleSource: number;
  governance: PublicKey;
}

// ─── Rewards ────────────────────────────────────────────────────────────────

export interface RewardsPool {
  authority: PublicKey;
  governance: PublicKey;
  rewardMint: PublicKey;
  stakeMint: PublicKey;
  rewardVault: PublicKey;
  stakeVault: PublicKey;
  totalWeightedShares: BN;
  accumulatedRewardPerShare: BN;
  lastRewardTs: BN;
  emissionRatePerSecond: BN;
  rewardPoolCap: BN;
  paused: boolean;
  earlyExitPenaltyBps: BN;
  penaltyDestination: PublicKey;
  lockCount: BN;
  bump: number;
}

export interface UserStakeAccount {
  user: PublicKey;
  rewardsPool: PublicKey;
  stakedAmount: BN;
  lockDurationSeconds: BN;
  lockStartTs: BN;
  lockEndTs: BN;
  rewardMultiplierBps: BN;
  weightedShares: BN;
  rewardDebt: BN;
  pendingRewards: BN;
  earlyExitUsed: boolean;
  bump: number;
}

// ─── Governance ─────────────────────────────────────────────────────────────

export type ActionType =
  | { withdrawFunds: Record<string, never> }
  | { seedLiquidity: Record<string, never> }
  | { burnUnsoldTokens: Record<string, never> }
  | { moveRewardsToVault: Record<string, never> }
  | { updateRebaseParams: Record<string, never> }
  | { pauseProtocol: Record<string, never> }
  | { resumeProtocol: Record<string, never> }
  | { updateGovernanceParams: Record<string, never> }
  | { emergencyPause: Record<string, never> };

export type ProposalStatus =
  | { pending: Record<string, never> }
  | { approved: Record<string, never> }
  | { executed: Record<string, never> }
  | { cancelled: Record<string, never> }
  | { expired: Record<string, never> };

export interface GovernanceConfig {
  authority: PublicKey;
  signers: PublicKey[];
  signerCount: number;
  approvalThreshold: number;
  timelockSeconds: BN;
  executionWindowSeconds: BN;
  proposalCount: BN;
  treasury: PublicKey;
  paused: boolean;
  bump: number;
}

export interface Proposal {
  id: BN;
  proposer: PublicKey;
  governance: PublicKey;
  actionType: ActionType;
  status: ProposalStatus;
  createdTs: BN;
  approvedTs: BN;
  executedTs: BN;
  approvalCount: number;
  approvals: PublicKey[];
  description: number[];
  actionData: number[];
  bump: number;
}
