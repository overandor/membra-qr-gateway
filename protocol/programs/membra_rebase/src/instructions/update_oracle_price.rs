use anchor_lang::prelude::*;

use crate::{
    errors::RebaseError,
    events::{CircuitBreakerTripped, OraclePriceUpdated},
    state::{RebaseState, CONF_RATIO_DENOM, ORACLE_SOURCE_MANUAL, REBASE_STATE_SEED},
};

#[derive(Accounts)]
pub struct UpdateOraclePrice<'info> {
    /// Only the authority stored on RebaseState may push a price update.
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [REBASE_STATE_SEED, rebase_state.token_mint.as_ref()],
        bump = rebase_state.bump,
        has_one = authority @ RebaseError::Unauthorized,
    )]
    pub rebase_state: Account<'info, RebaseState>,
}

/// Push a new oracle price observation into `RebaseState`.
///
/// # Parameters
/// - `new_price_usd_6`   – New asset price in USD with 6 decimal places (must be > 0).
/// - `confidence_usd_6`  – Confidence half-width of the price estimate (USD, 6 dec).
///   Must satisfy `confidence_usd_6 < new_price_usd_6 / CONF_RATIO_DENOM` (i.e. < 10 %).
/// - `oracle_ts`         – Unix timestamp of the oracle observation.
///   Must not be older than `stale_price_threshold_seconds` relative to the on-chain clock.
///
/// # Behaviour
/// 1. Validates authority (via account constraint).
/// 2. For oracle_source 0/1 the price is presently passed as a parameter
///    (a full on-chain feed integration such as reading Pyth's `PriceUpdateV2` account
///    would be added here once the feed SDK is included as a dependency).
/// 3. For oracle_source 2 (Manual) governance has pre-approved the price via the
///    authority signature — no additional check is needed.
/// 4. Validates staleness and confidence.
/// 5. Computes intra-epoch volatility; if the circuit breaker fires the price is
///    still recorded (so the next rebase can observe improved data), but a
///    `CircuitBreakerTripped` event is emitted and the circuit-breaker flag is
///    effectively communicated to `execute_rebase` via `last_oracle_price_usd_6`
///    diverging from what it was.  `execute_rebase` independently checks
///    volatility on its own path.
pub fn handler(
    ctx: Context<UpdateOraclePrice>,
    new_price_usd_6: u64,
    confidence_usd_6: u64,
    oracle_ts: i64,
) -> Result<()> {
    let clock = Clock::get()?;
    let rebase_state = &mut ctx.accounts.rebase_state;

    // ─── Price must be non-zero ──────────────────────────────────────────────
    require!(new_price_usd_6 > 0, RebaseError::InvalidPrice);

    // ─── Staleness check ────────────────────────────────────────────────────
    // oracle_ts must be within [now - stale_threshold, now].
    // We allow oracle_ts up to 60 s in the future for minor clock skew.
    let age = clock
        .unix_timestamp
        .checked_sub(oracle_ts)
        .ok_or(RebaseError::ArithmeticOverflow)?;
    require!(age >= -60, RebaseError::OraclePriceStale); // too far in future
    require!(
        age <= rebase_state.stale_price_threshold_seconds,
        RebaseError::OraclePriceStale
    );

    // ─── Confidence check ───────────────────────────────────────────────────
    // confidence_usd_6 must be < new_price_usd_6 / CONF_RATIO_DENOM
    let max_allowed_confidence = new_price_usd_6
        .checked_div(CONF_RATIO_DENOM)
        .ok_or(RebaseError::ArithmeticOverflow)?;
    require!(
        confidence_usd_6 < max_allowed_confidence,
        RebaseError::OracleConfidenceTooLow
    );

    // ─── Oracle-source routing ───────────────────────────────────────────────
    // oracle_source 0 (Pyth) and 1 (Switchboard): in production, the on-chain
    // feed account would be passed as a remaining_account and parsed here.
    // For now the caller-supplied price is used in all modes.  For Manual (2),
    // this is explicitly the intended behaviour.
    // NOTE: No additional validation needed for oracle_source == ORACLE_SOURCE_MANUAL;
    // the authority signature enforces governance approval.
    let _ = ORACLE_SOURCE_MANUAL; // referenced to suppress dead_code lint

    // ─── Volatility / circuit-breaker check ─────────────────────────────────
    let prev_price = rebase_state.last_oracle_price_usd_6;
    let circuit_breaker_bps = rebase_state.volatility_circuit_breaker_bps;

    if prev_price > 0 && circuit_breaker_bps > 0 {
        // volatility_bps = |new - prev| * 10_000 / prev
        let price_diff = if new_price_usd_6 >= prev_price {
            new_price_usd_6
                .checked_sub(prev_price)
                .ok_or(RebaseError::ArithmeticOverflow)?
        } else {
            prev_price
                .checked_sub(new_price_usd_6)
                .ok_or(RebaseError::ArithmeticOverflow)?
        };

        // Use u128 to avoid overflow during multiplication
        let volatility_bps = (price_diff as u128)
            .checked_mul(10_000u128)
            .ok_or(RebaseError::ArithmeticOverflow)?
            .checked_div(prev_price as u128)
            .ok_or(RebaseError::ArithmeticOverflow)? as u64;

        if volatility_bps >= circuit_breaker_bps {
            emit!(CircuitBreakerTripped {
                price_usd_6: new_price_usd_6,
                volatility_bps,
                ts: clock.unix_timestamp,
            });
            // We still record the price so execute_rebase can make an informed
            // decision, but we do NOT return an error here — execute_rebase will
            // independently trip on the same condition.
        }
    }

    // ─── Commit price ────────────────────────────────────────────────────────
    rebase_state.record_price_observation(new_price_usd_6, clock.unix_timestamp);
    rebase_state.last_oracle_price_usd_6 = new_price_usd_6;
    rebase_state.last_oracle_update_ts = clock.unix_timestamp;

    emit!(OraclePriceUpdated {
        price_usd_6: new_price_usd_6,
        confidence_usd_6,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
