use anchor_lang::prelude::*;
use pyth_sdk_solana::state::SolanaPriceAccount;

use crate::{
    errors::RebaseError,
    events::{CircuitBreakerTripped, OraclePriceUpdated},
    state::{RebaseState, CONF_RATIO_DENOM, ORACLE_SOURCE_PYTH, REBASE_STATE_SEED},
};

#[derive(Accounts)]
pub struct UpdatePythPrice<'info> {
    /// Anyone can act as keeper for permissionless Pyth price updates.
    pub keeper: Signer<'info>,

    #[account(
        mut,
        seeds = [REBASE_STATE_SEED, rebase_state.token_mint.as_ref()],
        bump = rebase_state.bump,
    )]
    pub rebase_state: Account<'info, RebaseState>,

    /// The Pyth price feed account for this token.
    /// Must match rebase_state.oracle_price_feed.
    /// CHECK: Validated against rebase_state.oracle_price_feed and parsed as Pyth account.
    pub pyth_price_feed: AccountInfo<'info>,
}

/// Update the stored oracle price from the Pyth on-chain price feed.
///
/// This instruction is PERMISSIONLESS. Anyone may call it to push a fresh
/// Pyth price into RebaseState. The price is read trustlessly from the
/// Pyth price feed account — the caller cannot inject an arbitrary value.
///
/// Only callable when oracle_source == ORACLE_SOURCE_PYTH (0).
pub fn handler(ctx: Context<UpdatePythPrice>) -> Result<()> {
    let clock = Clock::get()?;
    let rebase_state = &mut ctx.accounts.rebase_state;

    // Only for Pyth source
    require!(
        rebase_state.oracle_source == ORACLE_SOURCE_PYTH,
        RebaseError::InvalidOracleSource
    );

    // Validate feed pubkey matches configured feed
    require!(
        ctx.accounts.pyth_price_feed.key() == rebase_state.oracle_price_feed,
        RebaseError::OraclePriceMissing
    );

    // Parse Pyth price account
    let price_feed = SolanaPriceAccount::account_info_to_feed(&ctx.accounts.pyth_price_feed)
        .map_err(|_| RebaseError::OraclePriceMissing)?;

    // Get latest price (not older than stale_price_threshold_seconds).
    // get_price_no_older_than(current_unix_ts: i64, max_age_secs: u64)
    let price = price_feed
        .get_price_no_older_than(
            clock.unix_timestamp,
            rebase_state.stale_price_threshold_seconds as u64,
        )
        .ok_or(RebaseError::OraclePriceStale)?;

    // Price must be positive
    require!(price.price > 0, RebaseError::InvalidPrice);

    // Convert to USD with 6 decimal places.
    // price.price is i64, price.expo is i32 (negative for assets priced in USD).
    // We want: price_usd_6 = price.price * 10^(6 + price.expo)
    // e.g. BTC/USD: price=4200000000, expo=-8  →  price_usd_6 = 4200000000 * 10^(6-8) = 42000_000 ($42.00)
    let target_expo: i32 = -6;
    let expo_diff = target_expo
        .checked_sub(price.expo)
        .ok_or(RebaseError::ArithmeticOverflow)?;

    let price_usd_6: u64 = if expo_diff >= 0 {
        // Multiply: shift left
        let mult = 10u128.pow(expo_diff as u32);
        u64::try_from(
            (price.price as u128)
                .checked_mul(mult)
                .ok_or(RebaseError::ArithmeticOverflow)?,
        )
        .map_err(|_| RebaseError::ArithmeticOverflow)?
    } else {
        // Divide: shift right
        let div = 10u128.pow((-expo_diff) as u32);
        u64::try_from(
            (price.price as u128)
                .checked_div(div)
                .ok_or(RebaseError::ArithmeticOverflow)?,
        )
        .map_err(|_| RebaseError::ArithmeticOverflow)?
    };

    // Convert confidence with the same exponent scaling
    let confidence_usd_6: u64 = if expo_diff >= 0 {
        let mult = 10u128.pow(expo_diff as u32);
        u64::try_from(
            (price.conf as u128)
                .checked_mul(mult)
                .ok_or(RebaseError::ArithmeticOverflow)?,
        )
        .map_err(|_| RebaseError::ArithmeticOverflow)?
    } else {
        let div = 10u128.pow((-expo_diff) as u32);
        u64::try_from(
            (price.conf as u128)
                .checked_div(div)
                .ok_or(RebaseError::ArithmeticOverflow)?,
        )
        .map_err(|_| RebaseError::ArithmeticOverflow)?
    };

    // Confidence check: must be less than price / CONF_RATIO_DENOM (10%)
    let max_allowed_confidence = price_usd_6
        .checked_div(CONF_RATIO_DENOM)
        .ok_or(RebaseError::ArithmeticOverflow)?;
    require!(
        confidence_usd_6 < max_allowed_confidence,
        RebaseError::OracleConfidenceTooLow
    );

    // Volatility / circuit-breaker check (non-blocking — emits event but does not abort)
    let prev_price = rebase_state.last_oracle_price_usd_6;
    let circuit_breaker_bps = rebase_state.volatility_circuit_breaker_bps;

    if prev_price > 0 && circuit_breaker_bps > 0 {
        let price_diff = if price_usd_6 >= prev_price {
            price_usd_6
                .checked_sub(prev_price)
                .ok_or(RebaseError::ArithmeticOverflow)?
        } else {
            prev_price
                .checked_sub(price_usd_6)
                .ok_or(RebaseError::ArithmeticOverflow)?
        };
        let volatility_bps = (price_diff as u128)
            .checked_mul(10_000u128)
            .ok_or(RebaseError::ArithmeticOverflow)?
            .checked_div(prev_price as u128)
            .ok_or(RebaseError::ArithmeticOverflow)? as u64;

        if volatility_bps >= circuit_breaker_bps {
            emit!(CircuitBreakerTripped {
                price_usd_6,
                volatility_bps,
                ts: clock.unix_timestamp,
            });
        }
    }

    // Commit updated price and timestamp
    rebase_state.last_oracle_price_usd_6 = price_usd_6;
    rebase_state.last_oracle_update_ts = clock.unix_timestamp;

    emit!(OraclePriceUpdated {
        price_usd_6,
        confidence_usd_6,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
