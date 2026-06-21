use anchor_lang::prelude::*;

use crate::errors::RebaseError;

/// The initial value of `global_rebase_index` representing 1.0 (i.e. 1e12).
pub const REBASE_INDEX_ONE: u128 = 1_000_000_000_000u128;

/// Number of oracle price observations retained for TWAP computation.
pub const PRICE_HISTORY_LEN: usize = 8;

/// Oracle source identifiers.
pub const ORACLE_SOURCE_PYTH: u8 = 0;
pub const ORACLE_SOURCE_SWITCHBOARD: u8 = 1;
pub const ORACLE_SOURCE_MANUAL: u8 = 2;

/// PDA seed for the RebaseState account.
pub const REBASE_STATE_SEED: &[u8] = b"rebase_state";

/// PDA seed for a UserRebaseAccount.
pub const USER_REBASE_SEED: &[u8] = b"user_rebase";

/// Basis-point denominator (10 000 bps = 100%).
pub const BPS_DENOM: i128 = 10_000i128;

/// Confidence ratio denominator: confidence must be less than price / CONF_RATIO_DENOM.
/// A value of 10 means confidence < price / 10 (i.e. < 10% of price).
pub const CONF_RATIO_DENOM: u64 = 10;

/// A single oracle price observation, used to compute the time-weighted
/// average price (TWAP) over the retained window in `RebaseState.price_history`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, Debug)]
pub struct PriceObservation {
    /// Price in USD with 6 decimal places.
    pub price_usd_6: u64,
    /// Unix timestamp (on-chain clock) when this observation was recorded.
    pub ts: i64,
}

/// Global singleton that records all rebase configuration and accumulated state.
///
/// Space breakdown (discriminator = 8):
///   Pubkeys (4×32)     = 128
///   u8 (oracle_source) =   1
///   u64 ×7             =  56   (target, band_min, band_max, stale_threshold unused here → counted below)
///   i64 ×7             =  56   (max_pos, max_neg, coeff, min_epoch, last_ts, last_bps, last_oracle_update)
///   u64 ×2             =  16   (last_twap, last_oracle_price)
///   u128×2             =  32   (global_index, total_shares)
///   u64 (volatility)   =   8
///   i64 (stale_thresh) =   8
///   bool (paused)      =   1
///   price_history      = 128  (PRICE_HISTORY_LEN=8 × 16 bytes per PriceObservation)
///   u8 ×2              =   2   (price_history_idx, price_history_count)
///   u8  (bump)         =   1
///   padding            =  16  (align + future)
///   Total + discriminator ≈ 437 → see `LEN` for exact figure
#[account]
#[derive(Default)]
pub struct RebaseState {
    /// Account that can update oracle prices and pause/resume.
    pub authority: Pubkey,

    /// Governance account whose signature is required for parameter changes.
    pub governance: Pubkey,

    /// SPL token mint this rebase state manages.
    pub token_mint: Pubkey,

    /// On-chain price feed account (Pyth/Switchboard feed pubkey; ignored for Manual source).
    pub oracle_price_feed: Pubkey,

    /// 0 = Pyth, 1 = Switchboard, 2 = Manual (governance-only).
    pub oracle_source: u8,

    /// Target peg price in USD with 6 decimal places (e.g. 550_000 = $0.55).
    pub target_price_usd_6: u64,

    /// Lower edge of the monitoring band (USD, 6 decimals); e.g. 100_000 = $0.10.
    pub monitoring_band_min_usd_6: u64,

    /// Upper edge of the monitoring band (USD, 6 decimals); e.g. 1_000_000 = $1.00.
    pub monitoring_band_max_usd_6: u64,

    /// Maximum supply expansion per epoch in basis points (must be >= 0).
    pub max_positive_rebase_bps: i64,

    /// Maximum supply contraction per epoch in basis points (must be <= 0).
    pub max_negative_rebase_bps: i64,

    /// Dampening coefficient in basis points (e.g. 5000 = 50% of deviation).
    pub rebase_coefficient_bps: i64,

    /// Minimum seconds that must pass between successive rebases (e.g. 86400 = 24 h).
    pub min_epoch_seconds: i64,

    /// Unix timestamp of the most recent successful rebase.
    pub last_rebase_ts: i64,

    /// Signed BPS adjustment that was applied during the most recent rebase.
    pub last_rebase_bps: i64,

    /// TWAP price used during the most recent rebase (USD, 6 decimals).
    pub last_twap_price_usd_6: u64,

    /// Cumulative rebase index; starts at REBASE_INDEX_ONE (1e12 = 1.0).
    /// `redeemable_tokens = shares * global_rebase_index / REBASE_INDEX_ONE`
    pub global_rebase_index: u128,

    /// Total shares outstanding across all UserRebaseAccounts.
    pub total_shares: u128,

    /// Whether rebase execution is currently paused.
    pub paused: bool,

    /// Maximum age (in seconds) of an oracle price before it is considered stale.
    pub stale_price_threshold_seconds: i64,

    /// If the price moved more than this many BPS in one epoch, block the rebase.
    pub volatility_circuit_breaker_bps: u64,

    /// Unix timestamp when the oracle price was last updated.
    pub last_oracle_update_ts: i64,

    /// Most recently confirmed oracle price (USD, 6 decimals).
    pub last_oracle_price_usd_6: u64,

    /// Ring buffer of recent oracle price observations, used to compute a
    /// time-weighted average price (TWAP) in `compute_twap`.
    pub price_history: [PriceObservation; PRICE_HISTORY_LEN],

    /// Index of the next slot to write in `price_history`.
    pub price_history_idx: u8,

    /// Number of valid entries in `price_history` (saturates at `PRICE_HISTORY_LEN`).
    pub price_history_count: u8,

    /// PDA bump for this account.
    pub bump: u8,
}

impl RebaseState {
    /// On-disk space including the 8-byte Anchor discriminator.
    pub const LEN: usize = 8   // discriminator
        + 32   // authority
        + 32   // governance
        + 32   // token_mint
        + 32   // oracle_price_feed
        + 1    // oracle_source
        + 8    // target_price_usd_6
        + 8    // monitoring_band_min_usd_6
        + 8    // monitoring_band_max_usd_6
        + 8    // max_positive_rebase_bps
        + 8    // max_negative_rebase_bps
        + 8    // rebase_coefficient_bps
        + 8    // min_epoch_seconds
        + 8    // last_rebase_ts
        + 8    // last_rebase_bps
        + 8    // last_twap_price_usd_6
        + 16   // global_rebase_index (u128)
        + 16   // total_shares (u128)
        + 1    // paused
        + 8    // stale_price_threshold_seconds
        + 8    // volatility_circuit_breaker_bps
        + 8    // last_oracle_update_ts
        + 8    // last_oracle_price_usd_6
        + (16 * PRICE_HISTORY_LEN)  // price_history ([PriceObservation; 8] @ 16 bytes each)
        + 1    // price_history_idx
        + 1    // price_history_count
        + 1    // bump
        + 24;  // padding / future fields

    /// Record a new oracle price observation into the ring buffer, overwriting
    /// the oldest entry once `PRICE_HISTORY_LEN` observations have accumulated.
    pub fn record_price_observation(&mut self, price_usd_6: u64, ts: i64) {
        let idx = self.price_history_idx as usize;
        self.price_history[idx] = PriceObservation { price_usd_6, ts };
        self.price_history_idx = ((idx + 1) % PRICE_HISTORY_LEN) as u8;
        if (self.price_history_count as usize) < PRICE_HISTORY_LEN {
            self.price_history_count += 1;
        }
    }

    /// Compute the time-weighted average price over the retained observation
    /// window. Each observation is weighted by the number of seconds it was
    /// "current" (i.e. the time until the next observation, or until `now`
    /// for the most recent one).
    ///
    /// Falls back to `last_oracle_price_usd_6` if no observations have been
    /// recorded yet, and to the most recent observation's price if the total
    /// elapsed weight is zero (e.g. all observations share the same timestamp).
    pub fn compute_twap(&self, now: i64) -> Result<u64> {
        let count = self.price_history_count as usize;
        if count == 0 {
            return Ok(self.last_oracle_price_usd_6);
        }

        let len = PRICE_HISTORY_LEN;
        // When the buffer is full, `price_history_idx` points at the oldest
        // entry (the next slot to be overwritten). Otherwise entries start at 0.
        let oldest_idx = if count == len {
            self.price_history_idx as usize
        } else {
            0
        };

        let mut weighted_sum: u128 = 0;
        let mut total_weight: u128 = 0;

        for i in 0..count {
            let idx = (oldest_idx + i) % len;
            let obs = &self.price_history[idx];

            let interval_end = if i + 1 < count {
                let next_idx = (oldest_idx + i + 1) % len;
                self.price_history[next_idx].ts
            } else {
                now
            };

            let dt = interval_end
                .checked_sub(obs.ts)
                .ok_or(RebaseError::ArithmeticOverflow)?
                .max(0) as u128;

            weighted_sum = weighted_sum
                .checked_add(
                    (obs.price_usd_6 as u128)
                        .checked_mul(dt)
                        .ok_or(RebaseError::ArithmeticOverflow)?,
                )
                .ok_or(RebaseError::ArithmeticOverflow)?;
            total_weight = total_weight
                .checked_add(dt)
                .ok_or(RebaseError::ArithmeticOverflow)?;
        }

        if total_weight == 0 {
            let newest_idx = (oldest_idx + count - 1) % len;
            return Ok(self.price_history[newest_idx].price_usd_6);
        }

        u64::try_from(weighted_sum / total_weight).map_err(|_| error!(RebaseError::ArithmeticOverflow))
    }
}

/// Per-user account tracking share balance within the rebase wrapper.
///
/// Space breakdown (discriminator = 8):
///   Pubkeys ×2  = 64
///   u128 (shares) = 16
///   u64 (deposited) = 8
///   u8 (bump) = 1
///   padding = 7
///   Total = 8 + 96 = 104
#[account]
#[derive(Default)]
pub struct UserRebaseAccount {
    /// User wallet that owns this account.
    pub user: Pubkey,

    /// The RebaseState this account is associated with.
    pub rebase_state: Pubkey,

    /// Number of shares held. Redeemable tokens = `shares * global_rebase_index / REBASE_INDEX_ONE`.
    pub shares: u128,

    /// Informational: tokens deposited when shares were minted (not used for redemption math).
    pub deposited_tokens: u64,

    /// PDA bump for this account.
    pub bump: u8,
}

impl UserRebaseAccount {
    /// On-disk space including the 8-byte Anchor discriminator.
    pub const LEN: usize = 8   // discriminator
        + 32   // user
        + 32   // rebase_state
        + 16   // shares (u128)
        + 8    // deposited_tokens
        + 1    // bump
        + 7;   // padding
}
