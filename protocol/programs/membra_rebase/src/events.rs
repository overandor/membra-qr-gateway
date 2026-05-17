use anchor_lang::prelude::*;

/// Emitted when a new RebaseState account is initialized.
#[event]
pub struct RebaseStateInitialized {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub target_price_usd_6: u64,
    pub global_rebase_index: u128,
}

/// Emitted when the oracle price is successfully updated.
#[event]
pub struct OraclePriceUpdated {
    /// Confirmed price in USD with 6 decimal places.
    pub price_usd_6: u64,
    /// Confidence interval half-width in USD with 6 decimal places.
    pub confidence_usd_6: u64,
    /// Unix timestamp of the oracle observation.
    pub ts: i64,
}

/// Emitted when a rebase epoch completes successfully.
#[event]
pub struct RebaseExecuted {
    pub old_index: u128,
    pub new_index: u128,
    /// Signed basis-points adjustment applied this epoch (positive = expansion).
    pub rebase_bps: i64,
    /// TWAP price used for this rebase computation (USD, 6 decimals).
    pub twap_price_usd_6: u64,
    pub ts: i64,
}

/// Emitted when rebase operations are paused.
#[event]
pub struct RebasePaused {
    pub authority: Pubkey,
    pub ts: i64,
}

/// Emitted when rebase operations are resumed.
#[event]
pub struct RebaseResumed {
    pub authority: Pubkey,
    pub ts: i64,
}

/// Emitted when governance updates the rebase configuration parameters.
#[event]
pub struct RebaseParamsUpdated {
    pub target_price_usd_6: u64,
    pub max_positive_rebase_bps: i64,
    pub max_negative_rebase_bps: i64,
    pub ts: i64,
}

/// Emitted when intra-epoch volatility trips the circuit breaker.
#[event]
pub struct CircuitBreakerTripped {
    /// Current price that triggered the breaker (USD, 6 decimals).
    pub price_usd_6: u64,
    /// Observed volatility in basis points vs previous oracle price.
    pub volatility_bps: u64,
    pub ts: i64,
}
