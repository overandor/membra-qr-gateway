use anchor_lang::prelude::*;

use crate::{
    errors::RebaseError,
    events::{CircuitBreakerTripped, OraclePriceUpdated},
    state::{RebaseState, CONF_RATIO_DENOM, ORACLE_SOURCE_PYTH, REBASE_STATE_SEED},
};

// ---------------------------------------------------------------------------
// Pyth V2 price-account byte offsets (repr(C, packed) layout from oracle.h)
// ---------------------------------------------------------------------------
// Offset  Size  Field
//      0     4  magic     (must be 0xa1b2c3d4)
//      4     4  ver       (must be 2)
//      8     4  atype     (must be 3 = PC_ACCTYPE_PRICE)
//     12     4  size
//     16     4  ptype
//     20     4  expo      (i32, negative for USD prices)
//     24     4  num
//     28     4  num_qt
//     32     8  last_slot
//     40     8  valid_slot
//     48    24  twap  (Ema: val:i64, numer:i64, denom:i64)
//     72    24  twac  (Ema: val:i64, numer:i64, denom:i64)
//     96     8  prev_slot
//    104     8  prev_price
//    112     8  prev_conf
//    120     8  prev_timestamp  ← Unix timestamp (i64) used for staleness
//    128     8  agg.price  (i64)
//    136     8  agg.conf   (u64)
//    144     4  agg.status (u32; 1 = PC_STATUS_TRADING)
//    148     4  agg.corp_act
//    152     8  agg.pub_slot

const PYTH_MAGIC: u32 = 0xa1b2c3d4;
const PYTH_VERSION_2: u32 = 2;
const PYTH_ACC_TYPE_PRICE: u32 = 3;
const PYTH_STATUS_TRADING: u32 = 1;

const OFF_MAGIC: usize = 0;
const OFF_VER: usize = 4;
const OFF_ATYPE: usize = 8;
const OFF_EXPO: usize = 20;
const OFF_PREV_TIMESTAMP: usize = 120;
const OFF_AGG_PRICE: usize = 128;
const OFF_AGG_CONF: usize = 136;
const OFF_AGG_STATUS: usize = 144;

fn read_u32_le(data: &[u8], off: usize) -> Option<u32> {
    data.get(off..off + 4)
        .map(|b| u32::from_le_bytes(b.try_into().unwrap()))
}
fn read_i32_le(data: &[u8], off: usize) -> Option<i32> {
    data.get(off..off + 4)
        .map(|b| i32::from_le_bytes(b.try_into().unwrap()))
}
fn read_i64_le(data: &[u8], off: usize) -> Option<i64> {
    data.get(off..off + 8)
        .map(|b| i64::from_le_bytes(b.try_into().unwrap()))
}
fn read_u64_le(data: &[u8], off: usize) -> Option<u64> {
    data.get(off..off + 8)
        .map(|b| u64::from_le_bytes(b.try_into().unwrap()))
}

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

    require!(
        rebase_state.oracle_source == ORACLE_SOURCE_PYTH,
        RebaseError::InvalidOracleSource
    );

    require!(
        ctx.accounts.pyth_price_feed.key() == rebase_state.oracle_price_feed,
        RebaseError::OraclePriceMissing
    );

    // Parse Pyth V2 price account from raw bytes to avoid AccountInfo and
    // Pubkey type-boundary conflicts introduced by the solana-account-info /
    // solana-pubkey standalone-crate split in pyth-sdk >= 0.8.
    let data = ctx
        .accounts
        .pyth_price_feed
        .try_borrow_data()
        .map_err(|_| error!(RebaseError::OraclePriceMissing))?;

    let magic = read_u32_le(&data, OFF_MAGIC).ok_or(error!(RebaseError::OraclePriceMissing))?;
    let ver = read_u32_le(&data, OFF_VER).ok_or(error!(RebaseError::OraclePriceMissing))?;
    let atype = read_u32_le(&data, OFF_ATYPE).ok_or(error!(RebaseError::OraclePriceMissing))?;

    require!(
        magic == PYTH_MAGIC && ver == PYTH_VERSION_2 && atype == PYTH_ACC_TYPE_PRICE,
        RebaseError::OraclePriceMissing
    );

    let status =
        read_u32_le(&data, OFF_AGG_STATUS).ok_or(error!(RebaseError::OraclePriceMissing))?;
    require!(
        status == PYTH_STATUS_TRADING,
        RebaseError::OraclePriceMissing
    );

    let prev_timestamp = read_i64_le(&data, OFF_PREV_TIMESTAMP)
        .ok_or(error!(RebaseError::OraclePriceMissing))?;

    let age_secs = clock
        .unix_timestamp
        .checked_sub(prev_timestamp)
        .unwrap_or(i64::MAX);
    require!(
        age_secs >= 0 && age_secs <= rebase_state.stale_price_threshold_seconds,
        RebaseError::OraclePriceStale
    );

    let raw_price =
        read_i64_le(&data, OFF_AGG_PRICE).ok_or(error!(RebaseError::OraclePriceMissing))?;
    let raw_conf =
        read_u64_le(&data, OFF_AGG_CONF).ok_or(error!(RebaseError::OraclePriceMissing))?;
    let expo =
        read_i32_le(&data, OFF_EXPO).ok_or(error!(RebaseError::OraclePriceMissing))?;

    require!(raw_price > 0, RebaseError::InvalidPrice);

    // Convert price to USD-6 (6 decimal places).
    // price_usd_6 = raw_price × 10^(6 + expo)
    // e.g. BTC/USD: raw_price=4200000000, expo=-8  →  42000_000 ($42.00)
    let target_expo: i32 = -6;
    let expo_diff = target_expo
        .checked_sub(expo)
        .ok_or(error!(RebaseError::ArithmeticOverflow))?;

    let price_usd_6: u64 = if expo_diff >= 0 {
        let mult = 10u128.pow(expo_diff as u32);
        u64::try_from(
            (raw_price as u128)
                .checked_mul(mult)
                .ok_or(error!(RebaseError::ArithmeticOverflow))?,
        )
        .map_err(|_| error!(RebaseError::ArithmeticOverflow))?
    } else {
        let div = 10u128.pow((-expo_diff) as u32);
        u64::try_from(
            (raw_price as u128)
                .checked_div(div)
                .ok_or(error!(RebaseError::ArithmeticOverflow))?,
        )
        .map_err(|_| error!(RebaseError::ArithmeticOverflow))?
    };

    let confidence_usd_6: u64 = if expo_diff >= 0 {
        let mult = 10u128.pow(expo_diff as u32);
        u64::try_from(
            (raw_conf as u128)
                .checked_mul(mult)
                .ok_or(error!(RebaseError::ArithmeticOverflow))?,
        )
        .map_err(|_| error!(RebaseError::ArithmeticOverflow))?
    } else {
        let div = 10u128.pow((-expo_diff) as u32);
        u64::try_from(
            (raw_conf as u128)
                .checked_div(div)
                .ok_or(error!(RebaseError::ArithmeticOverflow))?,
        )
        .map_err(|_| error!(RebaseError::ArithmeticOverflow))?
    };

    // Confidence check: conf must be < price / CONF_RATIO_DENOM (10%)
    let max_allowed_confidence = price_usd_6
        .checked_div(CONF_RATIO_DENOM)
        .ok_or(error!(RebaseError::ArithmeticOverflow))?;
    require!(
        confidence_usd_6 < max_allowed_confidence,
        RebaseError::OracleConfidenceTooLow
    );

    // Volatility / circuit-breaker check (non-blocking — emits event but continues)
    let prev_price = rebase_state.last_oracle_price_usd_6;
    let circuit_breaker_bps = rebase_state.volatility_circuit_breaker_bps;

    if prev_price > 0 && circuit_breaker_bps > 0 {
        let price_diff = if price_usd_6 >= prev_price {
            price_usd_6
                .checked_sub(prev_price)
                .ok_or(error!(RebaseError::ArithmeticOverflow))?
        } else {
            prev_price
                .checked_sub(price_usd_6)
                .ok_or(error!(RebaseError::ArithmeticOverflow))?
        };
        let volatility_bps = (price_diff as u128)
            .checked_mul(10_000u128)
            .ok_or(error!(RebaseError::ArithmeticOverflow))?
            .checked_div(prev_price as u128)
            .ok_or(error!(RebaseError::ArithmeticOverflow))? as u64;

        if volatility_bps >= circuit_breaker_bps {
            emit!(CircuitBreakerTripped {
                price_usd_6,
                volatility_bps,
                ts: clock.unix_timestamp,
            });
        }
    }

    rebase_state.record_price_observation(price_usd_6, clock.unix_timestamp);
    rebase_state.last_oracle_price_usd_6 = price_usd_6;
    rebase_state.last_oracle_update_ts = clock.unix_timestamp;

    emit!(OraclePriceUpdated {
        price_usd_6,
        confidence_usd_6,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
