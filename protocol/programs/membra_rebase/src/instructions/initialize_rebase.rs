use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::{
    errors::RebaseError,
    events::RebaseStateInitialized,
    state::{
        PriceObservation, RebaseState, ORACLE_SOURCE_MANUAL, PRICE_HISTORY_LEN,
        REBASE_INDEX_ONE, REBASE_STATE_SEED,
    },
};

/// Parameters supplied to `initialize_rebase`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct InitializeRebaseParams {
    /// Governance account pubkey.
    pub governance: Pubkey,
    /// Pyth / Switchboard feed pubkey (set to Pubkey::default() for Manual source).
    pub oracle_price_feed: Pubkey,
    /// 0 = Pyth, 1 = Switchboard, 2 = Manual.
    pub oracle_source: u8,
    /// Target peg price (USD, 6 decimals).
    pub target_price_usd_6: u64,
    /// Lower edge of monitoring band (USD, 6 decimals).
    pub monitoring_band_min_usd_6: u64,
    /// Upper edge of monitoring band (USD, 6 decimals).
    pub monitoring_band_max_usd_6: u64,
    /// Maximum expansion per epoch (BPS, >= 0).
    pub max_positive_rebase_bps: i64,
    /// Maximum contraction per epoch (BPS, <= 0).
    pub max_negative_rebase_bps: i64,
    /// Dampening coefficient (BPS, e.g. 5000 = 50%).
    pub rebase_coefficient_bps: i64,
    /// Minimum seconds between rebases (> 0).
    pub min_epoch_seconds: i64,
    /// Seconds before an oracle price is considered stale.
    pub stale_price_threshold_seconds: i64,
    /// BPS threshold for the volatility circuit breaker.
    pub volatility_circuit_breaker_bps: u64,
}

#[derive(Accounts)]
#[instruction(params: InitializeRebaseParams)]
pub struct InitializeRebase<'info> {
    /// The account paying for rent and signing the initialisation.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// SPL mint that this rebase wrapper manages.
    pub token_mint: Account<'info, Mint>,

    /// RebaseState PDA. Seeded by `[REBASE_STATE_SEED, token_mint]`.
    #[account(
        init,
        payer = authority,
        space = RebaseState::LEN,
        seeds = [REBASE_STATE_SEED, token_mint.key().as_ref()],
        bump,
    )]
    pub rebase_state: Account<'info, RebaseState>,

    pub system_program: Program<'info, System>,
}

/// Create and configure a new `RebaseState` PDA.
///
/// # Validations
/// - `target_price_usd_6` must be within `[monitoring_band_min, monitoring_band_max]`.
/// - `monitoring_band_min` must be > 0 and < `monitoring_band_max`.
/// - `max_positive_rebase_bps` must be >= 0.
/// - `max_negative_rebase_bps` must be <= 0.
/// - `max_positive_rebase_bps` must be >= `|max_negative_rebase_bps|` is NOT required (asymmetry is valid).
/// - `rebase_coefficient_bps` must be in (0, 10_000] (> 0 and at most 100% of deviation).
/// - `min_epoch_seconds` must be > 0.
/// - `stale_price_threshold_seconds` must be > 0.
/// - `oracle_source` must be 0, 1, or 2.
pub fn handler(ctx: Context<InitializeRebase>, params: InitializeRebaseParams) -> Result<()> {
    // ─── Parameter validation ────────────────────────────────────────────────
    require!(
        params.oracle_source <= ORACLE_SOURCE_MANUAL,
        RebaseError::InvalidOracleSource
    );

    require!(
        params.monitoring_band_min_usd_6 > 0
            && params.monitoring_band_min_usd_6 < params.monitoring_band_max_usd_6,
        RebaseError::InvalidRebaseParams
    );

    require!(
        params.target_price_usd_6 >= params.monitoring_band_min_usd_6
            && params.target_price_usd_6 <= params.monitoring_band_max_usd_6,
        RebaseError::InvalidRebaseParams
    );

    require!(
        params.max_positive_rebase_bps >= 0,
        RebaseError::InvalidRebaseParams
    );

    require!(
        params.max_negative_rebase_bps <= 0,
        RebaseError::InvalidRebaseParams
    );

    // Coefficient must be strictly positive and at most 10 000 BPS (100%).
    require!(
        params.rebase_coefficient_bps > 0 && params.rebase_coefficient_bps <= 10_000,
        RebaseError::InvalidRebaseParams
    );

    require!(
        params.min_epoch_seconds > 0,
        RebaseError::InvalidRebaseParams
    );

    require!(
        params.stale_price_threshold_seconds > 0,
        RebaseError::InvalidRebaseParams
    );

    // For non-Manual sources require a non-default oracle feed pubkey.
    if params.oracle_source < ORACLE_SOURCE_MANUAL {
        require!(
            params.oracle_price_feed != Pubkey::default(),
            RebaseError::OraclePriceMissing
        );
    }

    // ─── Initialise account ──────────────────────────────────────────────────
    let rebase_state = &mut ctx.accounts.rebase_state;
    let bump = ctx.bumps.rebase_state;

    rebase_state.authority = ctx.accounts.authority.key();
    rebase_state.governance = params.governance;
    rebase_state.token_mint = ctx.accounts.token_mint.key();
    rebase_state.oracle_price_feed = params.oracle_price_feed;
    rebase_state.oracle_source = params.oracle_source;
    rebase_state.target_price_usd_6 = params.target_price_usd_6;
    rebase_state.monitoring_band_min_usd_6 = params.monitoring_band_min_usd_6;
    rebase_state.monitoring_band_max_usd_6 = params.monitoring_band_max_usd_6;
    rebase_state.max_positive_rebase_bps = params.max_positive_rebase_bps;
    rebase_state.max_negative_rebase_bps = params.max_negative_rebase_bps;
    rebase_state.rebase_coefficient_bps = params.rebase_coefficient_bps;
    rebase_state.min_epoch_seconds = params.min_epoch_seconds;
    rebase_state.last_rebase_ts = 0;
    rebase_state.last_rebase_bps = 0;
    rebase_state.last_twap_price_usd_6 = 0;
    rebase_state.global_rebase_index = REBASE_INDEX_ONE;
    rebase_state.total_shares = 0;
    rebase_state.paused = false;
    rebase_state.stale_price_threshold_seconds = params.stale_price_threshold_seconds;
    rebase_state.volatility_circuit_breaker_bps = params.volatility_circuit_breaker_bps;
    rebase_state.last_oracle_update_ts = 0;
    rebase_state.last_oracle_price_usd_6 = 0;
    rebase_state.price_history = [PriceObservation::default(); PRICE_HISTORY_LEN];
    rebase_state.price_history_idx = 0;
    rebase_state.price_history_count = 0;
    rebase_state.bump = bump;

    emit!(RebaseStateInitialized {
        authority: rebase_state.authority,
        token_mint: rebase_state.token_mint,
        target_price_usd_6: rebase_state.target_price_usd_6,
        global_rebase_index: rebase_state.global_rebase_index,
    });

    Ok(())
}
