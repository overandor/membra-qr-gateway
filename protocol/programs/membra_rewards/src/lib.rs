//! # membra_rewards
//!
//! Public, transparent, on-chain staking and lock-incentive program for the
//! MEMBRA Money Protocol.
//!
//! ## Design principles
//! - **Equal rules for everyone**: every participant follows the same tier
//!   table; there are no private or preferential reward tracks.
//! - **Pro-rata, not guaranteed**: rewards are funded from a disclosed reward
//!   pool and distributed in proportion to each staker's weighted shares.
//! - **Terminology**: these are "protocol rewards" or "lock incentives" –
//!   never "dividends".
//!
//! ## Lock tiers
//! | Duration  | Seconds    | Multiplier |
//! |-----------|------------|------------|
//! | Flexible  | 0          | 1.00×      |
//! | 30 days   | 2_592_000  | 1.00×      |
//! | 90 days   | 7_776_000  | 1.25×      |
//! | 180 days  | 15_552_000 | 1.50×      |
//! | 365 days  | 31_536_000 | 2.00×      |

use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYki476zPFsLnS");

#[program]
pub mod membra_rewards {
    use super::*;

    // -----------------------------------------------------------------------
    // initialize_rewards
    // -----------------------------------------------------------------------

    /// Create and configure a new [`RewardsPool`].
    ///
    /// # Parameters
    /// - `emission_rate_per_second`: Protocol reward tokens emitted per second.
    ///   Must be greater than zero.
    /// - `reward_pool_cap`: Maximum tokens that may reside in the reward vault.
    ///   Must be greater than zero.
    /// - `early_exit_penalty_bps`: Basis-point penalty applied when a user
    ///   unlocks before their lock period expires (e.g. 1000 = 10 %).
    pub fn initialize_rewards(
        ctx: Context<InitializeRewards>,
        emission_rate_per_second: u64,
        reward_pool_cap: u64,
        early_exit_penalty_bps: u64,
    ) -> Result<()> {
        initialize_rewards::handler(ctx, emission_rate_per_second, reward_pool_cap, early_exit_penalty_bps)
    }

    // -----------------------------------------------------------------------
    // create_lock
    // -----------------------------------------------------------------------

    /// Record a discrete lock commitment and transfer the locked tokens to the
    /// stake vault.
    ///
    /// Creates a [`LockRecord`] PDA as an immutable audit trail.
    ///
    /// # Parameters
    /// - `amount`: Tokens to lock.  Must be greater than zero.
    /// - `lock_duration_seconds`: One of `0`, `2_592_000`, `7_776_000`,
    ///   `15_552_000`, or `31_536_000`.
    pub fn create_lock(
        ctx: Context<CreateLock>,
        amount: u64,
        lock_duration_seconds: i64,
    ) -> Result<()> {
        create_lock::handler(ctx, amount, lock_duration_seconds)
    }

    // -----------------------------------------------------------------------
    // stake
    // -----------------------------------------------------------------------

    /// Deposit stake tokens and begin accruing protocol rewards.
    ///
    /// Creates the [`UserStakeAccount`] PDA on first call (`init_if_needed`);
    /// subsequent calls add to the existing position and update the lock tier.
    ///
    /// # Parameters
    /// - `amount`: Tokens to stake.  Must be greater than zero.
    /// - `lock_duration_seconds`: Lock tier to apply to the full position.
    pub fn stake(
        ctx: Context<Stake>,
        amount: u64,
        lock_duration_seconds: i64,
    ) -> Result<()> {
        stake::handler(ctx, amount, lock_duration_seconds)
    }

    // -----------------------------------------------------------------------
    // unstake
    // -----------------------------------------------------------------------

    /// Withdraw staked tokens.
    ///
    /// If the lock has not yet expired an early-exit penalty is applied.
    /// Pending rewards are captured in `pending_rewards` but not transferred;
    /// call [`claim_rewards`] separately.
    ///
    /// # Parameters
    /// - `amount`: Tokens to withdraw.  Must be ≤ `staked_amount`.
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        unstake::handler(ctx, amount)
    }

    // -----------------------------------------------------------------------
    // claim_rewards
    // -----------------------------------------------------------------------

    /// Transfer all accrued protocol rewards from the reward vault to the
    /// caller's wallet.
    ///
    /// If the vault balance is insufficient the transfer is capped and the
    /// remainder is kept in `pending_rewards` for a later claim.
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        claim_rewards::handler(ctx)
    }

    // -----------------------------------------------------------------------
    // close_lock
    // -----------------------------------------------------------------------

    /// Mark a [`LockRecord`] as closed and return locked tokens to the user.
    ///
    /// Early closure before lock expiry applies an early-exit penalty.
    /// Flexible (duration = 0) locks are always closeable without penalty.
    pub fn close_lock(ctx: Context<CloseLock>) -> Result<()> {
        close_lock::handler(ctx)
    }

    // -----------------------------------------------------------------------
    // close_stake_account
    // -----------------------------------------------------------------------

    /// Close a fully unstaked [`UserStakeAccount`] and recover rent.
    ///
    /// Only callable when `staked_amount == 0` and `pending_rewards == 0`.
    /// The account is closed and rent lamports are returned to the user.
    pub fn close_stake_account(ctx: Context<CloseStakeAccount>) -> Result<()> {
        close_stake_account::handler(ctx)
    }
}
