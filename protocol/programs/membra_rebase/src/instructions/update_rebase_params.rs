use anchor_lang::prelude::*;

use crate::{
    errors::RebaseError,
    events::RebaseParamsUpdated,
    state::{RebaseState, REBASE_STATE_SEED},
};

/// All fields are optional; `None` means "leave unchanged".
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct UpdateRebaseParamsArgs {
    /// New target peg price (USD, 6 decimals).
    pub target_price_usd_6: Option<u64>,
    /// New maximum expansion BPS (must be >= 0 if provided).
    pub max_positive_rebase_bps: Option<i64>,
    /// New maximum contraction BPS (must be <= 0 if provided).
    pub max_negative_rebase_bps: Option<i64>,
    /// New dampening coefficient BPS (must be in (0, 10_000] if provided).
    pub rebase_coefficient_bps: Option<i64>,
    /// New minimum seconds between epochs (must be > 0 if provided).
    pub min_epoch_seconds: Option<i64>,
    /// New oracle staleness threshold in seconds (must be > 0 if provided).
    pub stale_price_threshold_seconds: Option<i64>,
    /// New volatility circuit-breaker threshold BPS.
    pub volatility_circuit_breaker_bps: Option<u64>,
}

#[derive(Accounts)]
pub struct UpdateRebaseParams<'info> {
    /// Only the governance account may update these parameters.
    pub governance: Signer<'info>,

    #[account(
        mut,
        seeds = [REBASE_STATE_SEED, rebase_state.token_mint.as_ref()],
        bump = rebase_state.bump,
        has_one = governance @ RebaseError::Unauthorized,
    )]
    pub rebase_state: Account<'info, RebaseState>,
}

/// Update one or more rebase configuration parameters.
///
/// All supplied values are validated using the same rules as `initialize_rebase`.
/// Fields left as `None` are left unchanged.
pub fn handler(ctx: Context<UpdateRebaseParams>, args: UpdateRebaseParamsArgs) -> Result<()> {
    let rebase_state = &mut ctx.accounts.rebase_state;

    // ─── Apply and validate each optional field ───────────────────────────────

    if let Some(v) = args.target_price_usd_6 {
        require!(v > 0, RebaseError::InvalidRebaseParams);
        // Must still sit within the existing monitoring band.
        require!(
            v >= rebase_state.monitoring_band_min_usd_6
                && v <= rebase_state.monitoring_band_max_usd_6,
            RebaseError::InvalidRebaseParams
        );
        rebase_state.target_price_usd_6 = v;
    }

    if let Some(v) = args.max_positive_rebase_bps {
        require!(v >= 0, RebaseError::InvalidRebaseParams);
        rebase_state.max_positive_rebase_bps = v;
    }

    if let Some(v) = args.max_negative_rebase_bps {
        require!(v <= 0, RebaseError::InvalidRebaseParams);
        rebase_state.max_negative_rebase_bps = v;
    }

    if let Some(v) = args.rebase_coefficient_bps {
        require!(v > 0 && v <= 10_000, RebaseError::InvalidRebaseParams);
        rebase_state.rebase_coefficient_bps = v;
    }

    if let Some(v) = args.min_epoch_seconds {
        require!(v > 0, RebaseError::InvalidRebaseParams);
        rebase_state.min_epoch_seconds = v;
    }

    if let Some(v) = args.stale_price_threshold_seconds {
        require!(v > 0, RebaseError::InvalidRebaseParams);
        rebase_state.stale_price_threshold_seconds = v;
    }

    if let Some(v) = args.volatility_circuit_breaker_bps {
        // 0 means "circuit breaker disabled" — explicitly allowed.
        rebase_state.volatility_circuit_breaker_bps = v;
    }

    let clock = Clock::get()?;
    emit!(RebaseParamsUpdated {
        target_price_usd_6: rebase_state.target_price_usd_6,
        max_positive_rebase_bps: rebase_state.max_positive_rebase_bps,
        max_negative_rebase_bps: rebase_state.max_negative_rebase_bps,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
