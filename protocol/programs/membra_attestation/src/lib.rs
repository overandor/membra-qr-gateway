//! # membra_attestation
//!
//! The on-chain settlement layer for the MEMBRA Proof-of-Build Network.
//!
//! ## Architecture
//! Compute validators run LLM inference, simulations, and code analysis
//! **off-chain**, then post signed attestation hashes here.  Solana stores
//! proof of the work — not the work itself.
//!
//! ## Core flow
//! ```text
//! Builder registers project
//!     → Compute validators stake + submit attestation hashes + scores
//!     → Running stake-weighted averages accumulate in ProjectRecord
//!     → Once threshold is met, authority publishes the final risk score
//!     → Challenger may dispute; authority resolves; bad actors get slashed
//!     → Honest validators earn rewards from the protocol vault
//! ```
//!
//! ## Safety invariants
//! - The protocol sets risk scores.  It does not set prices.
//! - The LLM may recommend.  The validator may attest.
//!   The governance may slash.  The market prices the result.
//! - No validator earns rewards for unchallenged bad attestations in the long run:
//!   successful challenges burn stake and drop reputation.

use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

#[allow(ambiguous_glob_reexports)]
pub use instructions::challenge_attestation::*;
#[allow(ambiguous_glob_reexports)]
pub use instructions::initialize::*;
#[allow(ambiguous_glob_reexports)]
pub use instructions::publish_project_score::*;
#[allow(ambiguous_glob_reexports)]
pub use instructions::register_project::*;
#[allow(ambiguous_glob_reexports)]
pub use instructions::register_validator::*;
#[allow(ambiguous_glob_reexports)]
pub use instructions::resolve_challenge::*;
#[allow(ambiguous_glob_reexports)]
pub use instructions::reward_validator::*;
#[allow(ambiguous_glob_reexports)]
pub use instructions::stake_validator::*;
#[allow(ambiguous_glob_reexports)]
pub use instructions::submit_attestation::*;

use state::ScoreSet;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkk476zPFsLnS");

#[program]
pub mod membra_attestation {
    use super::*;

    /// Initialise the protocol config PDA and protocol reward vault.
    ///
    /// # Parameters
    /// - `min_stake`         – minimum validator stake to submit attestations.
    /// - `slash_bps`         – basis points of stake to burn on a upheld challenge
    ///                         (e.g. 1000 = 10 %).
    /// - `min_attestations`  – minimum unique validator attestations before a
    ///                         project score can be published.
    /// - `reward_per_job`    – token amount paid per completed job (informational;
    ///                         actual transfer is caller-specified in reward_validator).
    pub fn initialize(
        ctx: Context<Initialize>,
        min_stake: u64,
        slash_bps: u16,
        min_attestations: u8,
        reward_per_job: u64,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, min_stake, slash_bps, min_attestations, reward_per_job)
    }

    /// Register a new compute validator and create their staking vault.
    pub fn register_validator(ctx: Context<RegisterValidator>) -> Result<()> {
        instructions::register_validator::handler(ctx)
    }

    /// Transfer tokens from the validator's wallet into their staking vault.
    ///
    /// Staked tokens are at risk of slashing if the validator submits a
    /// fraudulent attestation and a challenge is upheld.
    pub fn stake_validator(ctx: Context<StakeValidator>, amount: u64) -> Result<()> {
        instructions::stake_validator::handler(ctx, amount)
    }

    /// Register a project for validator review.
    ///
    /// # Parameters
    /// - `project_id` – builder-scoped monotonic identifier; used as a PDA seed.
    pub fn register_project(ctx: Context<RegisterProject>, project_id: u64) -> Result<()> {
        instructions::register_project::handler(ctx, project_id)
    }

    /// Submit a signed attestation for a project.
    ///
    /// The validator provides a 32-byte SHA-256 hash of their full off-chain
    /// report, along with 0–100 scores for each risk dimension.  Scores are
    /// accumulated into the project's stake-weighted running totals.
    ///
    /// # Parameters
    /// - `report_hash`       – SHA-256 of the off-chain report (provenance anchor).
    /// - `job_type`          – one of the `JobType` discriminant values.
    /// - `tech_score`        – Technical risk score (0 = high risk, 100 = low risk).
    /// - `treasury_score`    – Treasury risk score.
    /// - `tokenomics_score`  – Tokenomics design risk score.
    /// - `gov_score`         – Governance risk score.
    /// - `transparency_score`– Builder transparency score.
    pub fn submit_attestation(
        ctx: Context<SubmitAttestation>,
        report_hash: [u8; 32],
        job_type: u8,
        scores: ScoreSet,
    ) -> Result<()> {
        instructions::submit_attestation::handler(ctx, report_hash, job_type, scores)
    }

    /// Raise a challenge against a submitted attestation.
    ///
    /// Anyone may challenge.  The protocol authority resolves the dispute via
    /// `resolve_challenge`.
    pub fn challenge_attestation(ctx: Context<ChallengeAttestation>) -> Result<()> {
        instructions::challenge_attestation::handler(ctx)
    }

    /// Resolve a challenge.
    ///
    /// Only callable by the protocol authority.  If `upheld = true` the
    /// attestation is removed from score aggregation, the validator is slashed,
    /// and reputation is decremented.
    pub fn resolve_challenge(ctx: Context<ResolveChallenge>, upheld: bool) -> Result<()> {
        instructions::resolve_challenge::handler(ctx, upheld)
    }

    /// Pay a reward to a validator for a completed job.
    ///
    /// Funds are transferred from the protocol reward vault.  Calling this
    /// instruction also increments `completed_jobs` and improves reputation.
    pub fn reward_validator(ctx: Context<RewardValidator>, amount: u64) -> Result<()> {
        instructions::reward_validator::handler(ctx, amount)
    }

    /// Compute and publish the final stake-weighted risk scores for a project.
    ///
    /// Can only be called when `project.state == Scoring` and the minimum
    /// number of valid (non-challenged) attestations is present.  Sets state
    /// to `Scored` and emits `ProjectScorePublished`.
    pub fn publish_project_score(ctx: Context<PublishProjectScore>) -> Result<()> {
        instructions::publish_project_score::handler(ctx)
    }
}
