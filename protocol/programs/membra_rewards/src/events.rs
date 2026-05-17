use anchor_lang::prelude::*;

/// Emitted when a new RewardsPool is initialized.
#[event]
pub struct RewardsPoolInitialized {
    pub authority: Pubkey,
    pub reward_mint: Pubkey,
    pub stake_mint: Pubkey,
    pub emission_rate_per_second: u64,
}

/// Emitted when a user stakes tokens (with or without a lock).
#[event]
pub struct Staked {
    pub user: Pubkey,
    pub amount: u64,
    pub lock_duration_seconds: i64,
    pub reward_multiplier_bps: u64,
    pub lock_end_ts: i64,
}

/// Emitted when a user withdraws staked tokens.
#[event]
pub struct Unstaked {
    pub user: Pubkey,
    pub amount: u64,
    pub penalty_paid: u64,
    pub ts: i64,
}

/// Emitted when a user claims protocol rewards.
#[event]
pub struct RewardsClaimed {
    pub user: Pubkey,
    pub reward_amount: u64,
    pub ts: i64,
}

/// Emitted when a LockRecord is created.
#[event]
pub struct LockCreated {
    pub user: Pubkey,
    pub locked_amount: u64,
    pub lock_duration_seconds: i64,
    pub lock_end_ts: i64,
    pub reward_multiplier_bps: u64,
}

/// Emitted when a LockRecord is closed.
#[event]
pub struct LockClosed {
    pub user: Pubkey,
    pub locked_amount: u64,
    pub ts: i64,
}

/// Emitted when an early-exit penalty is deducted from a withdrawal.
#[event]
pub struct EarlyExitPenalty {
    pub user: Pubkey,
    pub penalty_amount: u64,
    pub destination: Pubkey,
    pub ts: i64,
}

/// Emitted when pool parameters are updated by authority.
#[event]
pub struct RewardsPoolUpdated {
    pub emission_rate_per_second: u64,
    pub reward_pool_cap: u64,
    pub ts: i64,
}
