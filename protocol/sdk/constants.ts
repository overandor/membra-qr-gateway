import { PublicKey } from "@solana/web3.js";

// Program IDs – replace with actual IDs after `anchor keys sync`
export const MEMBRA_IDO_PROGRAM_ID = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);
export const MEMBRA_REBASE_PROGRAM_ID = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkh476zPFsLnS"
);
export const MEMBRA_REWARDS_PROGRAM_ID = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYki476zPFsLnS"
);
export const MEMBRA_GOVERNANCE_PROGRAM_ID = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkj476zPFsLnS"
);

// PDA seeds
export const IDO_CONFIG_SEED = Buffer.from("ido_config");
export const USER_IDO_RECORD_SEED = Buffer.from("user_ido");
export const REBASE_STATE_SEED = Buffer.from("rebase_state");
export const USER_REBASE_SEED = Buffer.from("user_rebase");
export const REWARDS_POOL_SEED = Buffer.from("rewards_pool");
export const USER_STAKE_SEED = Buffer.from("user_stake");
export const LOCK_RECORD_SEED = Buffer.from("lock_record");
export const GOVERNANCE_SEED = Buffer.from("governance");
export const PROPOSAL_SEED = Buffer.from("proposal");

// Rebase index scale factor: 1e12 represents 1.0
export const REBASE_INDEX_SCALE = BigInt("1000000000000");

// Reward accumulator scale factor: 1e12
export const REWARD_SCALE = BigInt("1000000000000");

// Lock durations in seconds
export const LOCK_DURATIONS = {
  NONE: 0,
  DAYS_30: 2_592_000,
  DAYS_90: 7_776_000,
  DAYS_180: 15_552_000,
  DAYS_365: 31_536_000,
} as const;

// Lock multipliers in BPS (10_000 = 1.0x)
export const LOCK_MULTIPLIERS_BPS = {
  [LOCK_DURATIONS.NONE]: 10_000,
  [LOCK_DURATIONS.DAYS_30]: 10_000,
  [LOCK_DURATIONS.DAYS_90]: 12_500,
  [LOCK_DURATIONS.DAYS_180]: 15_000,
  [LOCK_DURATIONS.DAYS_365]: 20_000,
} as const;

// Price scale: 6 decimal places (same as USDC)
export const PRICE_SCALE = 1_000_000;

// Compliance-safe description
export const PROTOCOL_DESCRIPTION =
  "MEMBRA is an elastic-supply Solana token with transparent rebase rules, " +
  "oracle-based price monitoring, public lock incentives, and audited IDO flows. " +
  "The protocol does not guarantee price, yield, dividends, or profit. " +
  "Rewards are paid according to public staking and lock rules.";
