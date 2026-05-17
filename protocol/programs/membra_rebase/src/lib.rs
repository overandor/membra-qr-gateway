/// MEMBRA Rebase Program
///
/// Implements an elastic-supply shares/index model for the MEMBRA Money Protocol.
///
/// ## Architecture
///
/// Rather than mutating every holder's SPL token balance on each epoch (which is
/// infeasible on Solana), this program maintains a single global `rebase_index`
/// stored in `RebaseState`.  Users deposit tokens and receive *shares*; the index
/// determines how many base tokens each share redeems for at any point in time:
///
/// ```text
/// redeemable_tokens = shares * global_rebase_index / REBASE_INDEX_ONE
/// ```
///
/// `REBASE_INDEX_ONE = 1_000_000_000_000` (1 × 10¹²), so the index starts at 1.0
/// and drifts up or down by ≤ `max_rebase_bps` per epoch.
///
/// ## Rebase formula
///
/// ```text
/// deviation_bps  = (twap_price - target_price) × 10_000 / target_price
/// raw_rebase_bps = deviation_bps × rebase_coefficient_bps / 10_000
/// final_bps      = clamp(raw_rebase_bps, max_negative_bps, max_positive_bps)
/// new_index      = old_index × (10_000 + final_bps) / 10_000
/// ```
///
/// A positive `final_bps` expands supply (index grows); negative contracts it.
///
/// ## Oracle sources
///
/// | Code | Source      | Notes                                          |
/// |------|-------------|------------------------------------------------|
/// |  0   | Pyth        | Feed pubkey stored in `oracle_price_feed`      |
/// |  1   | Switchboard | Feed pubkey stored in `oracle_price_feed`      |
/// |  2   | Manual      | Authority pushes price via `update_oracle_price`|
///
/// In the current implementation the on-chain feed account is stored for future
/// integration; the price value is passed as a parameter to `update_oracle_price`
/// regardless of source.  Use `update_pyth_price` for a permissionless, trustless
/// price update that reads directly from the Pyth on-chain price feed account.
use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkh476zPFsLnS");

#[program]
pub mod membra_rebase {
    use super::*;

    // ─── State initialisation ─────────────────────────────────────────────────

    /// Create and configure a new `RebaseState` PDA for the given SPL mint.
    ///
    /// This is a one-time, permissioned instruction.  The signer becomes the
    /// `authority` and supplies all initial configuration.  The `global_rebase_index`
    /// is set to `REBASE_INDEX_ONE` (= 1.0).
    pub fn initialize_rebase(
        ctx: Context<InitializeRebase>,
        params: InitializeRebaseParams,
    ) -> Result<()> {
        instructions::initialize_rebase::handler(ctx, params)
    }

    // ─── Oracle ────────────────────────────────────────────────────────────────

    /// Update oracle price directly from the Pyth price feed account.
    /// Permissionless — any keeper can call when oracle_source == 0 (Pyth).
    pub fn update_pyth_price(ctx: Context<UpdatePythPrice>) -> Result<()> {
        instructions::update_pyth_price::handler(ctx)
    }

    /// Update oracle price directly from the Switchboard V2 aggregator feed account.
    /// Permissionless — any keeper can call when oracle_source == 1 (Switchboard).
    pub fn update_switchboard_price(ctx: Context<UpdateSwitchboardPrice>) -> Result<()> {
        instructions::update_switchboard_price::handler(ctx)
    }

    /// Push a new price observation into `RebaseState`.
    ///
    /// The caller must be the `authority`.  For Manual oracle source the price is
    /// accepted directly; for Pyth/Switchboard the same parameter path is used
    /// until the feed-account CPI is wired in.
    ///
    /// Validates:
    /// - price > 0
    /// - oracle age ≤ `stale_price_threshold_seconds`
    /// - confidence < price / 10
    /// - emits `CircuitBreakerTripped` (non-blocking) if intra-update volatility
    ///   exceeds `volatility_circuit_breaker_bps`
    pub fn update_oracle_price(
        ctx: Context<UpdateOraclePrice>,
        new_price_usd_6: u64,
        confidence_usd_6: u64,
        oracle_ts: i64,
    ) -> Result<()> {
        instructions::update_oracle_price::handler(ctx, new_price_usd_6, confidence_usd_6, oracle_ts)
    }

    // ─── Rebase execution ─────────────────────────────────────────────────────

    /// Execute a rebase epoch, updating `global_rebase_index`.
    ///
    /// This instruction is permissionless once the preconditions are met:
    /// - not paused
    /// - minimum epoch interval elapsed
    /// - oracle price is fresh
    /// - intra-epoch volatility below circuit-breaker threshold
    ///
    /// Any signer may act as keeper.
    pub fn execute_rebase(ctx: Context<ExecuteRebase>) -> Result<()> {
        instructions::execute_rebase::handler(ctx)
    }

    // ─── Emergency controls ───────────────────────────────────────────────────

    /// Halt rebase execution.  Callable by `authority` or `governance`.
    pub fn pause_rebase(ctx: Context<PauseRebase>) -> Result<()> {
        instructions::pause_rebase::handler(ctx)
    }

    /// Lift the rebase pause.  Callable by `authority` or `governance`.
    pub fn resume_rebase(ctx: Context<ResumeRebase>) -> Result<()> {
        instructions::resume_rebase::handler(ctx)
    }

    // ─── Governance ───────────────────────────────────────────────────────────

    /// Update one or more rebase parameters.  Only the `governance` key may call
    /// this instruction.  All fields are optional; `None` means unchanged.
    pub fn update_rebase_params(
        ctx: Context<UpdateRebaseParams>,
        args: UpdateRebaseParamsArgs,
    ) -> Result<()> {
        instructions::update_rebase_params::handler(ctx, args)
    }
}
