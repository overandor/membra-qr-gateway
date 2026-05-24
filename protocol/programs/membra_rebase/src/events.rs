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

/// Emitted when a user deposits tokens and receives shares.
#[event]
pub struct TokensDeposited {
    pub user: Pubkey,
    /// Raw token amount deposited.
    pub amount: u64,
    /// Shares minted (= amount * REBASE_INDEX_ONE / global_rebase_index).
    pub shares: u128,
    pub global_rebase_index: u128,
}

/// Emitted when a user burns shares and receives tokens.
#[event]
pub struct TokensWithdrawn {
    pub user: Pubkey,
    /// Shares burned.
    pub shares: u128,
    /// Raw token amount returned (= shares * global_rebase_index / REBASE_INDEX_ONE).
    pub tokens_returned: u64,
    pub global_rebase_index: u128,
}
