use anchor_lang::prelude::*;

use crate::{
    errors::RebaseError,
    events::RebaseExecuted,
    state::{RebaseState, BPS_DENOM, REBASE_STATE_SEED},
};

#[derive(Accounts)]
pub struct ExecuteRebase<'info> {
    /// Any signer may act as keeper and trigger a rebase when conditions are met.
    pub keeper: Signer<'info>,

    #[account(
        mut,
        seeds = [REBASE_STATE_SEED, rebase_state.token_mint.as_ref()],
        bump = rebase_state.bump,
    )]
    pub rebase_state: Account<'info, RebaseState>,
}

/// Execute a rebase epoch.
///
/// # Pre-conditions
/// 1. `rebase_state.paused == false`.
/// 2. `clock.unix_timestamp - last_rebase_ts >= min_epoch_seconds`.
/// 3. `clock.unix_timestamp - last_oracle_update_ts <= stale_price_threshold_seconds`.
/// 4. Volatility (|current_oracle - previous_oracle| / previous_oracle) must be
///    below `volatility_circuit_breaker_bps`.  The previous oracle price is taken
///    as `last_twap_price_usd_6` from the *previous* epoch (or zero on first epoch).
///
/// # Rebase formula
/// ```text
/// deviation_bps = (twap_price as i128 - target_price as i128) * 10_000 / target_price
/// raw_rebase_bps = deviation_bps * rebase_coefficient_bps / 10_000
/// final_rebase_bps = clamp(raw_rebase_bps, max_negative_rebase_bps, max_positive_rebase_bps)
/// new_index = old_index * (10_000 + final_rebase_bps) / 10_000
/// ```
///
/// # Index semantics
/// `redeemable_tokens = shares * global_rebase_index / REBASE_INDEX_ONE`
///
/// A positive `final_rebase_bps` → index grows → each share redeems more tokens
/// (supply expansion, used when price is below target to incentivise selling).
/// A negative `final_rebase_bps` → index shrinks → each share redeems fewer tokens
/// (supply contraction, used when price is above target to incentivise buying).
pub fn handler(ctx: Context<ExecuteRebase>) -> Result<()> {
    let clock = Clock::get()?;
    let rebase_state = &mut ctx.accounts.rebase_state;

    // ─── Gate 1: not paused ──────────────────────────────────────────────────
    require!(!rebase_state.paused, RebaseError::RebasePaused);

    // ─── Gate 2: epoch elapsed ───────────────────────────────────────────────
    let elapsed = clock
        .unix_timestamp
        .checked_sub(rebase_state.last_rebase_ts)
        .ok_or(RebaseError::ArithmeticOverflow)?;
    // On the very first rebase last_rebase_ts == 0 so elapsed will be very large
    // — that is intentional.
    require!(
        elapsed >= rebase_state.min_epoch_seconds,
        RebaseError::EpochTooSoon
    );

    // ─── Gate 3: oracle freshness ────────────────────────────────────────────
    // last_oracle_price_usd_6 == 0 means no price has ever been pushed.
    require!(
        rebase_state.last_oracle_price_usd_6 > 0,
        RebaseError::OraclePriceMissing
    );
    let oracle_age = clock
        .unix_timestamp
        .checked_sub(rebase_state.last_oracle_update_ts)
        .ok_or(RebaseError::ArithmeticOverflow)?;
    require!(
        oracle_age <= rebase_state.stale_price_threshold_seconds,
        RebaseError::OraclePriceStale
    );

    // ─── Gate 4: volatility circuit breaker ──────────────────────────────────
    // Compare the current confirmed oracle price against the TWAP used in the
    // previous epoch.  On the first ever rebase there is no previous TWAP so we
    // skip this check.
    let twap_price_usd_6 = rebase_state.last_oracle_price_usd_6;
    let prev_twap = rebase_state.last_twap_price_usd_6;
    let circuit_bps = rebase_state.volatility_circuit_breaker_bps;

    if prev_twap > 0 && circuit_bps > 0 {
        let price_diff = if twap_price_usd_6 >= prev_twap {
            twap_price_usd_6
                .checked_sub(prev_twap)
                .ok_or(RebaseError::ArithmeticOverflow)?
        } else {
            prev_twap
                .checked_sub(twap_price_usd_6)
                .ok_or(RebaseError::ArithmeticOverflow)?
        };

        let volatility_bps = (price_diff as u128)
            .checked_mul(10_000u128)
            .ok_or(RebaseError::ArithmeticOverflow)?
            .checked_div(prev_twap as u128)
            .ok_or(RebaseError::ArithmeticOverflow)? as u64;

        require!(
            volatility_bps < circuit_bps,
            RebaseError::VolatilityCircuitBreakerTripped
        );
    }

    // ─── Rebase calculation ──────────────────────────────────────────────────
    let target_price = rebase_state.target_price_usd_6 as i128;
    let twap_i128 = twap_price_usd_6 as i128;

    // deviation_bps = (twap - target) * 10_000 / target
    let deviation_bps = twap_i128
        .checked_sub(target_price)
        .ok_or(RebaseError::ArithmeticOverflow)?
        .checked_mul(BPS_DENOM)
        .ok_or(RebaseError::ArithmeticOverflow)?
        .checked_div(target_price)
        .ok_or(RebaseError::ArithmeticOverflow)?;

    // raw_rebase_bps = deviation_bps * rebase_coefficient_bps / 10_000
    // Using the formula as specified: positive deviation → positive raw_rebase_bps
    // (price > target → index expands, see spec note).
    let coeff = rebase_state.rebase_coefficient_bps as i128;
    let raw_rebase_bps = deviation_bps
        .checked_mul(coeff)
        .ok_or(RebaseError::ArithmeticOverflow)?
        .checked_div(BPS_DENOM)
        .ok_or(RebaseError::ArithmeticOverflow)?;

    // Clamp to configured bounds.
    let max_pos = rebase_state.max_positive_rebase_bps as i128;
    let max_neg = rebase_state.max_negative_rebase_bps as i128;
    let final_rebase_bps = raw_rebase_bps.clamp(max_neg, max_pos);

    // new_index = old_index * (10_000 + final_rebase_bps) / 10_000
    let old_index = rebase_state.global_rebase_index;

    // (10_000 + final_rebase_bps) can be as low as 10_000 + max_neg (e.g. 9_500)
    // and as high as 10_000 + max_pos (e.g. 10_500).  Use i128 throughout.
    let multiplier = BPS_DENOM
        .checked_add(final_rebase_bps)
        .ok_or(RebaseError::ArithmeticOverflow)?;

    // Safety: multiplier is always > 0 because max_negative_rebase_bps >= -10_000
    // (validated at init).  We check here defensively.
    require!(multiplier > 0, RebaseError::ArithmeticOverflow);

    // old_index fits in u128 (max ~1e12 * 1.05^n); cast to i128 is safe for
    // realistic lifetimes (< 2^127).
    let old_index_i128 = old_index as i128;
    let new_index_i128 = old_index_i128
        .checked_mul(multiplier)
        .ok_or(RebaseError::ArithmeticOverflow)?
        .checked_div(BPS_DENOM)
        .ok_or(RebaseError::ArithmeticOverflow)?;

    // new_index must be strictly positive.
    require!(new_index_i128 > 0, RebaseError::ArithmeticOverflow);
    let new_index = new_index_i128 as u128;

    // ─── Commit state ────────────────────────────────────────────────────────
    rebase_state.global_rebase_index = new_index;
    rebase_state.last_rebase_ts = clock.unix_timestamp;
    rebase_state.last_rebase_bps = final_rebase_bps as i64;
    rebase_state.last_twap_price_usd_6 = twap_price_usd_6;

    emit!(RebaseExecuted {
        old_index,
        new_index,
        rebase_bps: final_rebase_bps as i64,
        twap_price_usd_6,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
