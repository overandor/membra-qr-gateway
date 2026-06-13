use anchor_lang::prelude::*;

use crate::{
    errors::RebaseError,
    events::{CircuitBreakerTripped, OraclePriceUpdated},
    state::{RebaseState, CONF_RATIO_DENOM, ORACLE_SOURCE_SWITCHBOARD, REBASE_STATE_SEED},
};

/// Switchboard V2 AggregatorAccountData discriminator.
/// sha256("account:AggregatorAccountData")[0..8]
const SB_AGGREGATOR_DISCRIMINATOR: [u8; 8] = [217, 230, 65, 101, 201, 162, 27, 125];

/// Byte offsets into AggregatorAccountData (Switchboard V2, verified against
/// switchboard-v2 program version 0.2.x layout).
///
/// Layout summary (all offsets from byte 0 including 8-byte discriminator):
///   [0..8]   discriminator
///   [8..40]  name: [u8; 32]
///   [40..168] metadata: [u8; 128]
///   [168..200] reserved1: [u8; 32]
///   [200..232] queue_pubkey: Pubkey
///   [232..248] oracle_requests_fulfilled: u128
///   [248..264] oracle_requests_opened: u128
///   [264..272] created_at: i64
///   [272]    is_locked: bool
///   [273..280] _ebuf0: [u8; 7]
///   [280..312] crank_pubkey: Pubkey
///   [312..]  latest_confirmed_round: AggregatorRound
///
/// AggregatorRound layout (starts at 312):
///   [+0..+4]   num_success: u32
///   [+4..+8]   num_error: u32
///   [+8]       is_closed: bool
///   [+9..+16]  _ebuf0: [u8; 7]
///   [+16..+24] round_open_slot: u64
///   [+24..+32] round_open_timestamp: i64  → absolute offset 336
///   [+32..+52] result: SwitchboardDecimal  → absolute offset 344
///     [+32..+48] mantissa: i128            → absolute offset 344
///     [+48..+52] scale: u32               → absolute offset 360
///   [+52..+72] std_deviation: SwitchboardDecimal → absolute offset 364
///     [+52..+68] mantissa: i128           → absolute offset 364
///     [+68..+72] scale: u32               → absolute offset 380
///
/// IMPORTANT: These offsets must be re-verified if Switchboard updates their
/// program. Check against the deployed program's IDL on-chain.
const ROUND_OPEN_TS_OFFSET: usize = 336;
const RESULT_MANTISSA_OFFSET: usize = 344;
const RESULT_SCALE_OFFSET: usize = 360;
const STDDEV_MANTISSA_OFFSET: usize = 364;
const STDDEV_SCALE_OFFSET: usize = 380;
const MIN_ACCOUNT_LEN: usize = 384;

#[derive(Accounts)]
pub struct UpdateSwitchboardPrice<'info> {
    /// Anyone can act as keeper for permissionless Switchboard price updates.
    pub keeper: Signer<'info>,

    #[account(
        mut,
        seeds = [REBASE_STATE_SEED, rebase_state.token_mint.as_ref()],
        bump = rebase_state.bump,
    )]
    pub rebase_state: Account<'info, RebaseState>,

    /// Switchboard V2 aggregator feed account.
    /// Must match rebase_state.oracle_price_feed.
    /// CHECK: Validated via discriminator check and key constraint below.
    #[account(
        constraint = switchboard_feed.key() == rebase_state.oracle_price_feed
            @ RebaseError::OraclePriceMissing
    )]
    pub switchboard_feed: AccountInfo<'info>,
}

/// Update the stored oracle price from the Switchboard V2 on-chain aggregator feed.
///
/// This instruction is PERMISSIONLESS. Anyone may call it as a keeper.
/// The price is read trustlessly from the Switchboard aggregator account bytes.
/// The account discriminator is validated before reading any price data.
///
/// Uses a dependency-free raw-bytes parser to avoid SDK version conflicts.
///
/// Only callable when oracle_source == ORACLE_SOURCE_SWITCHBOARD (1).
pub fn handler(ctx: Context<UpdateSwitchboardPrice>) -> Result<()> {
    let clock = Clock::get()?;
    let rebase_state = &mut ctx.accounts.rebase_state;

    require!(
        rebase_state.oracle_source == ORACLE_SOURCE_SWITCHBOARD,
        RebaseError::InvalidOracleSource
    );

    let data = ctx.accounts.switchboard_feed.try_borrow_data()?;

    // Validate account length
    require!(data.len() >= MIN_ACCOUNT_LEN, RebaseError::OraclePriceMissing);

    // Validate Switchboard V2 AggregatorAccountData discriminator
    require!(
        data[0..8] == SB_AGGREGATOR_DISCRIMINATOR,
        RebaseError::OraclePriceMissing
    );

    // ─── Read latest_confirmed_round fields at known byte offsets ────────────

    // round_open_timestamp: i64 at offset 336
    let oracle_ts = i64::from_le_bytes(
        data[ROUND_OPEN_TS_OFFSET..ROUND_OPEN_TS_OFFSET + 8]
            .try_into()
            .map_err(|_| RebaseError::OraclePriceMissing)?,
    );

    // result.mantissa: i128 at offset 344
    let mantissa = i128::from_le_bytes(
        data[RESULT_MANTISSA_OFFSET..RESULT_MANTISSA_OFFSET + 16]
            .try_into()
            .map_err(|_| RebaseError::OraclePriceMissing)?,
    );

    // result.scale: u32 at offset 360
    let scale = u32::from_le_bytes(
        data[RESULT_SCALE_OFFSET..RESULT_SCALE_OFFSET + 4]
            .try_into()
            .map_err(|_| RebaseError::OraclePriceMissing)?,
    );

    // std_deviation.mantissa: i128 at offset 364
    let stddev_mantissa = i128::from_le_bytes(
        data[STDDEV_MANTISSA_OFFSET..STDDEV_MANTISSA_OFFSET + 16]
            .try_into()
            .map_err(|_| RebaseError::OraclePriceMissing)?,
    );

    // std_deviation.scale: u32 at offset 380
    let stddev_scale = u32::from_le_bytes(
        data[STDDEV_SCALE_OFFSET..STDDEV_SCALE_OFFSET + 4]
            .try_into()
            .map_err(|_| RebaseError::OraclePriceMissing)?,
    );

    // Drop data borrow before mutating rebase_state
    drop(data);

    // Price mantissa must be positive
    require!(mantissa > 0, RebaseError::InvalidPrice);

    // ─── Convert SwitchboardDecimal → USD with 6 decimal places ─────────────
    let price_usd_6: u64 = decimal_to_usd6(mantissa, scale)?;
    require!(price_usd_6 > 0, RebaseError::InvalidPrice);

    // ─── Staleness check ─────────────────────────────────────────────────────
    let age = clock
        .unix_timestamp
        .checked_sub(oracle_ts)
        .ok_or(RebaseError::ArithmeticOverflow)?;
    require!(age >= -60, RebaseError::OraclePriceStale);
    require!(
        age <= rebase_state.stale_price_threshold_seconds,
        RebaseError::OraclePriceStale
    );

    // ─── Std-deviation confidence check ──────────────────────────────────────
    let std_dev_usd_6: u64 = if stddev_mantissa <= 0 {
        0u64
    } else {
        decimal_to_usd6(stddev_mantissa, stddev_scale).unwrap_or(u64::MAX)
    };
    let max_conf = price_usd_6
        .checked_div(CONF_RATIO_DENOM)
        .ok_or(RebaseError::ArithmeticOverflow)?;
    require!(std_dev_usd_6 < max_conf, RebaseError::OracleConfidenceTooLow);

    // ─── Volatility / circuit-breaker ────────────────────────────────────────
    let prev_price = rebase_state.last_oracle_price_usd_6;
    let cb_bps = rebase_state.volatility_circuit_breaker_bps;
    if prev_price > 0 && cb_bps > 0 {
        let diff = if price_usd_6 >= prev_price {
            price_usd_6.checked_sub(prev_price).ok_or(RebaseError::ArithmeticOverflow)?
        } else {
            prev_price.checked_sub(price_usd_6).ok_or(RebaseError::ArithmeticOverflow)?
        };
        let vol_bps = (diff as u128)
            .checked_mul(10_000)
            .ok_or(RebaseError::ArithmeticOverflow)?
            .checked_div(prev_price as u128)
            .ok_or(RebaseError::ArithmeticOverflow)? as u64;
        if vol_bps >= cb_bps {
            emit!(CircuitBreakerTripped {
                price_usd_6,
                volatility_bps: vol_bps,
                ts: clock.unix_timestamp,
            });
        }
    }

    // ─── Commit ──────────────────────────────────────────────────────────────
    rebase_state.record_price_observation(price_usd_6, clock.unix_timestamp);
    rebase_state.last_oracle_price_usd_6 = price_usd_6;
    rebase_state.last_oracle_update_ts = clock.unix_timestamp;

    emit!(OraclePriceUpdated {
        price_usd_6,
        confidence_usd_6: std_dev_usd_6,
        ts: clock.unix_timestamp,
    });

    Ok(())
}

/// Convert a SwitchboardDecimal (mantissa, scale) to USD with 6 decimal places.
/// price_usd_6 = mantissa / 10^(scale - 6)   if scale >= 6
///             = mantissa * 10^(6 - scale)    if scale < 6
fn decimal_to_usd6(mantissa: i128, scale: u32) -> Result<u64> {
    const TARGET: u32 = 6;
    let val: u64 = if scale >= TARGET {
        let div = 10i128.pow(scale - TARGET);
        u64::try_from(
            mantissa
                .checked_div(div)
                .ok_or(RebaseError::ArithmeticOverflow)?,
        )
        .map_err(|_| RebaseError::ArithmeticOverflow)?
    } else {
        let mul = 10i128.pow(TARGET - scale);
        u64::try_from(
            mantissa
                .checked_mul(mul)
                .ok_or(RebaseError::ArithmeticOverflow)?,
        )
        .map_err(|_| RebaseError::ArithmeticOverflow)?
    };
    Ok(val)
}
