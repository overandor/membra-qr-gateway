use anchor_lang::prelude::*;

// ---------------------------------------------------------------------------
// Lock-tier constants
// ---------------------------------------------------------------------------

/// Flexible (no lock) – 1.00× multiplier.
pub const LOCK_DURATION_FLEXIBLE: i64 = 0;
/// 30-day lock in seconds.
pub const LOCK_DURATION_30D: i64 = 2_592_000;
/// 90-day lock in seconds.
pub const LOCK_DURATION_90D: i64 = 7_776_000;
/// 180-day lock in seconds.
pub const LOCK_DURATION_180D: i64 = 15_552_000;
/// 365-day lock in seconds.
pub const LOCK_DURATION_365D: i64 = 31_536_000;

/// Basis-points multipliers for each lock tier.
pub const MULTIPLIER_BPS_FLEXIBLE: u64 = 10_000; // 1.00×
pub const MULTIPLIER_BPS_30D: u64 = 10_000;      // 1.00×
pub const MULTIPLIER_BPS_90D: u64 = 12_500;      // 1.25×
pub const MULTIPLIER_BPS_180D: u64 = 15_000;     // 1.50×
pub const MULTIPLIER_BPS_365D: u64 = 20_000;     // 2.00×

/// Precision scaler used for `accumulated_reward_per_share` (1e12).
pub const REWARD_SCALE: u128 = 1_000_000_000_000;

// ---------------------------------------------------------------------------
// RewardsPool
// ---------------------------------------------------------------------------

/// Global state for the MEMBRA staking / lock-incentive program.
///
/// PDA seeds: `[b"rewards_pool", reward_mint.key().as_ref(), stake_mint.key().as_ref()]`
#[account]
#[derive(Default)]
pub struct RewardsPool {
    /// Authority that can administer this pool.
    pub authority: Pubkey,
    /// Governance / multisig that can co-administer.
    pub governance: Pubkey,
    /// Mint of the token distributed as protocol rewards.
    pub reward_mint: Pubkey,
    /// Mint of the token users stake.
    pub stake_mint: Pubkey,
    /// Token account (vault) that holds reward tokens.
    pub reward_vault: Pubkey,
    /// Token account (vault) that holds staked tokens.
    pub stake_vault: Pubkey,

    /// Sum of (staked_amount × multiplier_bps / 10_000) across all stakers.
    pub total_weighted_shares: u128,
    /// Running accumulator (reward tokens per weighted share × REWARD_SCALE).
    pub accumulated_reward_per_share: u128,
    /// Unix timestamp of the last pool update.
    pub last_reward_ts: i64,

    /// Protocol-reward tokens emitted per second.
    pub emission_rate_per_second: u64,
    /// Maximum tokens that may reside in the reward vault at any time.
    pub reward_pool_cap: u64,

    /// True when the pool is paused (stakes / claims blocked).
    pub paused: bool,

    /// Penalty for early exit, in basis points (e.g. 1000 = 10%).
    pub early_exit_penalty_bps: u64,
    /// Destination for penalty tokens (treasury or reward pool itself).
    pub penalty_destination: Pubkey,

    /// Monotonically-increasing counter used as part of LockRecord PDA seeds.
    pub lock_count: u64,

    /// PDA bump seed.
    pub bump: u8,
}

impl RewardsPool {
    /// Discriminator (8) + all fixed-size fields.
    pub const LEN: usize = 8
        + 32  // authority
        + 32  // governance
        + 32  // reward_mint
        + 32  // stake_mint
        + 32  // reward_vault
        + 32  // stake_vault
        + 16  // total_weighted_shares  (u128)
        + 16  // accumulated_reward_per_share (u128)
        + 8   // last_reward_ts
        + 8   // emission_rate_per_second
        + 8   // reward_pool_cap
        + 1   // paused
        + 8   // early_exit_penalty_bps
        + 32  // penalty_destination
        + 8   // lock_count
        + 1;  // bump

    /// Returns the reward multiplier in basis points for a given lock duration.
    /// Returns `None` if the duration is not a supported tier.
    pub fn multiplier_for_duration(lock_duration_seconds: i64) -> Option<u64> {
        match lock_duration_seconds {
            LOCK_DURATION_FLEXIBLE => Some(MULTIPLIER_BPS_FLEXIBLE),
            LOCK_DURATION_30D => Some(MULTIPLIER_BPS_30D),
            LOCK_DURATION_90D => Some(MULTIPLIER_BPS_90D),
            LOCK_DURATION_180D => Some(MULTIPLIER_BPS_180D),
            LOCK_DURATION_365D => Some(MULTIPLIER_BPS_365D),
            _ => None,
        }
    }

    /// Update `accumulated_reward_per_share` based on elapsed time.
    ///
    /// Must be called at the start of every mutating instruction.
    pub fn update_pool(&mut self, current_ts: i64) -> anchor_lang::Result<()> {
        use crate::errors::RewardsError;

        if self.total_weighted_shares == 0 {
            self.last_reward_ts = current_ts;
            return Ok(());
        }

        let elapsed = current_ts.saturating_sub(self.last_reward_ts).max(0) as u128;
        let reward = (self.emission_rate_per_second as u128)
            .checked_mul(elapsed)
            .ok_or(RewardsError::ArithmeticOverflow)?;

        // reward * REWARD_SCALE / total_weighted_shares
        let reward_per_share_delta = reward
            .checked_mul(REWARD_SCALE)
            .ok_or(RewardsError::ArithmeticOverflow)?
            .checked_div(self.total_weighted_shares)
            .unwrap_or(0); // total_weighted_shares > 0 guaranteed above

        self.accumulated_reward_per_share = self
            .accumulated_reward_per_share
            .checked_add(reward_per_share_delta)
            .ok_or(RewardsError::ArithmeticOverflow)?;

        self.last_reward_ts = current_ts;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// UserStakeAccount
// ---------------------------------------------------------------------------

/// Per-user staking position for a given pool.
///
/// PDA seeds: `[b"user_stake", rewards_pool.key().as_ref(), user.key().as_ref()]`
#[account]
#[derive(Default)]
pub struct UserStakeAccount {
    /// The staker's wallet.
    pub user: Pubkey,
    /// The pool this stake belongs to.
    pub rewards_pool: Pubkey,

    /// Current staked amount (in stake-mint base units).
    pub staked_amount: u64,
    /// Lock duration in seconds (0 = flexible / no lock).
    pub lock_duration_seconds: i64,
    /// Unix timestamp when the stake / lock was created.
    pub lock_start_ts: i64,
    /// Unix timestamp when the lock expires (`lock_start_ts + lock_duration_seconds`).
    pub lock_end_ts: i64,
    /// Reward multiplier in basis points for the chosen lock tier.
    pub reward_multiplier_bps: u64,
    /// `staked_amount × reward_multiplier_bps / 10_000` – contribution to the pool.
    pub weighted_shares: u128,
    /// Snapshot of `accumulated_reward_per_share × weighted_shares` taken at last update.
    pub reward_debt: u128,
    /// Rewards accrued but not yet claimed.
    pub pending_rewards: u64,
    /// True if the user exited before the lock expired (penalty was applied).
    pub early_exit_used: bool,

    /// PDA bump seed.
    pub bump: u8,
}

impl UserStakeAccount {
    /// Discriminator (8) + all fixed-size fields.
    pub const LEN: usize = 8
        + 32  // user
        + 32  // rewards_pool
        + 8   // staked_amount
        + 8   // lock_duration_seconds
        + 8   // lock_start_ts
        + 8   // lock_end_ts
        + 8   // reward_multiplier_bps
        + 16  // weighted_shares  (u128)
        + 16  // reward_debt      (u128)
        + 8   // pending_rewards
        + 1   // early_exit_used
        + 1;  // bump

    /// Compute the pending rewards since the last `reward_debt` snapshot.
    ///
    /// pending = (accumulated_reward_per_share × weighted_shares / REWARD_SCALE) − reward_debt
    pub fn compute_pending(
        &self,
        accumulated_reward_per_share: u128,
    ) -> anchor_lang::Result<u128> {
        use crate::errors::RewardsError;

        let gross = accumulated_reward_per_share
            .checked_mul(self.weighted_shares)
            .ok_or(RewardsError::ArithmeticOverflow)?
            .checked_div(REWARD_SCALE)
            .unwrap_or(0);

        Ok(gross.saturating_sub(self.reward_debt))
    }

    /// Recompute `weighted_shares` from current `staked_amount` and `reward_multiplier_bps`.
    pub fn recalculate_weighted_shares(&mut self) -> anchor_lang::Result<()> {
        use crate::errors::RewardsError;

        self.weighted_shares = (self.staked_amount as u128)
            .checked_mul(self.reward_multiplier_bps as u128)
            .ok_or(RewardsError::ArithmeticOverflow)?
            .checked_div(10_000)
            .unwrap_or(0);

        Ok(())
    }

    /// Snapshot `reward_debt` from the current pool accumulator.
    pub fn sync_reward_debt(
        &mut self,
        accumulated_reward_per_share: u128,
    ) -> anchor_lang::Result<()> {
        use crate::errors::RewardsError;

        self.reward_debt = accumulated_reward_per_share
            .checked_mul(self.weighted_shares)
            .ok_or(RewardsError::ArithmeticOverflow)?
            .checked_div(REWARD_SCALE)
            .unwrap_or(0);

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// LockRecord
// ---------------------------------------------------------------------------

/// Immutable record of a discrete lock commitment made by a user.
///
/// PDA seeds: `[b"lock_record", rewards_pool.key().as_ref(), user.key().as_ref(), lock_index.to_le_bytes().as_ref()]`
#[account]
#[derive(Default)]
pub struct LockRecord {
    /// The user who created this lock.
    pub user: Pubkey,
    /// The pool this lock is associated with.
    pub rewards_pool: Pubkey,

    /// Lock duration in seconds.
    pub lock_duration_seconds: i64,
    /// Unix timestamp when the lock was created.
    pub lock_start_ts: i64,
    /// Unix timestamp when the lock expires.
    pub lock_end_ts: i64,
    /// Amount of stake-mint tokens locked.
    pub locked_amount: u64,
    /// Reward multiplier in basis points for this lock tier.
    pub reward_multiplier_bps: u64,
    /// Total penalty paid (zero unless an early exit occurred).
    pub penalty_paid: u64,
    /// True once `close_lock` has been called.
    pub closed: bool,

    /// PDA bump seed.
    pub bump: u8,
}

impl LockRecord {
    /// Discriminator (8) + all fixed-size fields.
    pub const LEN: usize = 8
        + 32  // user
        + 32  // rewards_pool
        + 8   // lock_duration_seconds
        + 8   // lock_start_ts
        + 8   // lock_end_ts
        + 8   // locked_amount
        + 8   // reward_multiplier_bps
        + 8   // penalty_paid
        + 1   // closed
        + 1;  // bump
}
