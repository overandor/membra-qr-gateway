use anchor_lang::prelude::*;

#[error_code]
pub enum RebaseError {
    /// Caller is not authorized to perform this action.
    #[msg("Unauthorized")]
    Unauthorized,

    /// Rebase operations are currently paused.
    #[msg("Rebase is paused")]
    RebasePaused,

    /// Minimum epoch duration has not elapsed since last rebase.
    #[msg("Epoch too soon: minimum interval between rebases has not elapsed")]
    EpochTooSoon,

    /// Oracle price data is stale beyond the configured threshold.
    #[msg("Oracle price is stale")]
    OraclePriceStale,

    /// Oracle confidence interval is too wide relative to the price.
    #[msg("Oracle confidence interval is too wide")]
    OracleConfidenceTooLow,

    /// Oracle price feed is missing or unavailable.
    #[msg("Oracle price feed is missing or unavailable")]
    OraclePriceMissing,

    /// Price volatility exceeded the circuit breaker threshold; rebase blocked.
    #[msg("Volatility circuit breaker tripped: price moved beyond allowed threshold")]
    VolatilityCircuitBreakerTripped,

    /// Price is outside the monitoring band (informational — not always a hard error).
    #[msg("Price is outside the monitoring band")]
    PriceOutsideMonitoringBand,

    /// Rebase parameters are invalid.
    #[msg("Invalid rebase parameters")]
    InvalidRebaseParams,

    /// Oracle source identifier is invalid.
    #[msg("Invalid oracle source: must be 0 (Pyth), 1 (Switchboard), or 2 (Manual)")]
    InvalidOracleSource,

    /// User does not have enough shares to complete the operation.
    #[msg("Insufficient shares")]
    InsufficientShares,

    /// An arithmetic operation overflowed or underflowed.
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    /// Liquidity is too thin (reserved for future governance-gated use).
    #[msg("Liquidity too thin")]
    LiquidityTooThin,

    /// The provided price value is invalid (e.g. zero).
    #[msg("Invalid price: price must be greater than zero")]
    InvalidPrice,
}
