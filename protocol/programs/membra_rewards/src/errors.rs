use anchor_lang::prelude::*;

#[error_code]
pub enum RewardsError {
    /// Caller is not authorized to perform this action.
    #[msg("Unauthorized")]
    Unauthorized,

    /// Rewards program is paused.
    #[msg("Rewards program is currently paused")]
    RewardsPaused,

    /// Insufficient staked balance for this operation.
    #[msg("Insufficient staked balance")]
    InsufficientStake,

    /// Lock period has not yet expired.
    #[msg("Lock period has not yet expired")]
    LockNotExpired,

    /// Lock record is already closed.
    #[msg("Lock record is already closed")]
    LockAlreadyClosed,

    /// No rewards available to claim at this time.
    #[msg("No rewards available to claim")]
    NoRewardsToClaim,

    /// Lock duration must be 0 (flexible), 30, 90, 180, or 365 days in seconds.
    #[msg("Invalid lock duration: must be 0, 2592000, 7776000, 15552000, or 31536000 seconds")]
    InvalidLockDuration,

    /// Amount must be greater than zero.
    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    /// Reward pool has no remaining tokens to distribute.
    #[msg("Reward pool is exhausted")]
    RewardPoolExhausted,

    /// Arithmetic overflow in calculation.
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    /// Emission rate must be greater than zero.
    #[msg("Invalid emission rate: must be greater than zero")]
    InvalidEmissionRate,

    /// Early exit penalty was applied to this withdrawal.
    /// NOTE: This variant is informational; it does not block the transaction.
    #[msg("Early exit penalty applied")]
    EarlyExitPenaltyApplied,

    /// Penalty destination must not be the default (zero) pubkey.
    #[msg("Invalid penalty destination: must not be the default pubkey")]
    InvalidPenaltyDestination,
}
