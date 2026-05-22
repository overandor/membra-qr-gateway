use anchor_lang::prelude::*;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum ProjectState {
    /// Builder submitted; waiting for validator attestations.
    #[default]
    Pending,
    /// Minimum attestation threshold reached; ready for score publication.
    Scoring,
    /// Final scores published and visible to investors.
    Scored,
    /// Rejected by governance or authority.
    Rejected,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum JobType {
    RepoAnalysis          = 0,
    TokenomicsReview      = 1,
    TreasuryCheck         = 2,
    ContractAudit         = 3,
    MilestoneVerification = 4,
    SimulationRun         = 5,
}

// ---------------------------------------------------------------------------
// ProtocolConfig
// ---------------------------------------------------------------------------

/// Global configuration singleton.
///
/// PDA seeds: `[b"protocol_config"]`
#[account]
#[derive(Default)]
pub struct ProtocolConfig {
    /// Authority that can administer the protocol (governance address).
    pub authority: Pubkey,
    /// The MEMBRA token mint used for staking and rewards.
    pub token_mint: Pubkey,
    /// Protocol reward vault (funds validator rewards).
    pub reward_vault: Pubkey,

    /// Minimum stake required to register as a validator (in token base units).
    pub min_stake: u64,
    /// Basis points to slash on a successful challenge (e.g. 1000 = 10 %).
    pub slash_bps: u16,
    /// Minimum number of attestations before a score can be published.
    pub min_attestations: u8,
    /// Tokens paid to a validator for each successfully completed job.
    pub reward_per_job: u64,

    /// When true, no new attestations or stakes are accepted.
    pub paused: bool,

    /// PDA bump.
    pub bump: u8,
}

impl ProtocolConfig {
    pub const LEN: usize = 8
        + 32  // authority
        + 32  // token_mint
        + 32  // reward_vault
        + 8   // min_stake
        + 2   // slash_bps
        + 1   // min_attestations
        + 8   // reward_per_job
        + 1   // paused
        + 1   // bump
        + 32; // padding
}

// ---------------------------------------------------------------------------
// ValidatorRecord
// ---------------------------------------------------------------------------

/// Per-validator state.
///
/// PDA seeds: `[b"validator", authority.key().as_ref()]`
#[account]
#[derive(Default)]
pub struct ValidatorRecord {
    /// Validator's wallet keypair.
    pub authority: Pubkey,
    /// Token account (vault) holding this validator's staked tokens.
    pub vault: Pubkey,

    /// Current staked amount in token base units.
    pub stake: u64,
    /// Reputation score in basis points (0 – 10 000). Starts at 5 000 (neutral).
    pub reputation: u32,

    /// Total jobs completed successfully.
    pub completed_jobs: u64,
    /// Total jobs that resulted in a successful challenge against this validator.
    pub failed_jobs: u64,
    /// Number of times stake has been slashed.
    pub slash_count: u32,

    /// Unix timestamp of registration.
    pub registered_at: i64,

    /// PDA bump.
    pub bump: u8,
    /// Validator vault PDA bump.
    pub vault_bump: u8,
}

impl ValidatorRecord {
    pub const LEN: usize = 8
        + 32  // authority
        + 32  // vault
        + 8   // stake
        + 4   // reputation
        + 8   // completed_jobs
        + 8   // failed_jobs
        + 4   // slash_count
        + 8   // registered_at
        + 1   // bump
        + 1   // vault_bump
        + 32; // padding

    pub const INITIAL_REPUTATION: u32 = 5_000;
}

// ---------------------------------------------------------------------------
// ProjectRecord
// ---------------------------------------------------------------------------

/// Per-project submission state.
///
/// PDA seeds: `[b"project", builder.key().as_ref(), project_id.to_le_bytes()]`
#[account]
#[derive(Default)]
pub struct ProjectRecord {
    /// Builder who submitted the project.
    pub builder: Pubkey,
    /// Monotonically increasing project identifier (builder-scoped).
    pub project_id: u64,
    /// Unix timestamp when the project was submitted.
    pub submitted_at: i64,
    /// Current lifecycle state.
    pub state: ProjectState,

    /// Running count of attestations received.
    pub attestation_count: u32,
    /// Count of attestations marked as challenged (successfully disputed).
    pub challenged_count: u32,

    // --- Stake-weighted score accumulators (score_0_100 * validator_stake) ---
    pub weighted_tech_sum: u64,
    pub weighted_treasury_sum: u64,
    pub weighted_tokenomics_sum: u64,
    pub weighted_gov_sum: u64,
    pub weighted_transparency_sum: u64,
    /// Sum of all attesting validator stakes (denominator for weighted avg).
    pub total_stake_weight: u64,

    // --- Published final scores (set by publish_project_score) ---
    pub tech_score: u8,
    pub treasury_score: u8,
    pub tokenomics_score: u8,
    pub gov_score: u8,
    pub transparency_score: u8,
    /// (non_challenged_attestations / total_attestations) * 100.
    pub validator_confidence: u8,

    /// PDA bump.
    pub bump: u8,
}

impl ProjectRecord {
    pub const LEN: usize = 8
        + 32  // builder
        + 8   // project_id
        + 8   // submitted_at
        + 1   // state (enum tag)
        + 4   // attestation_count
        + 4   // challenged_count
        + 8   // weighted_tech_sum
        + 8   // weighted_treasury_sum
        + 8   // weighted_tokenomics_sum
        + 8   // weighted_gov_sum
        + 8   // weighted_transparency_sum
        + 8   // total_stake_weight
        + 1   // tech_score
        + 1   // treasury_score
        + 1   // tokenomics_score
        + 1   // gov_score
        + 1   // transparency_score
        + 1   // validator_confidence
        + 1   // bump
        + 32; // padding
}

// ---------------------------------------------------------------------------
// AttestationRecord
// ---------------------------------------------------------------------------

/// A single validator's signed assessment of a project.
///
/// PDA seeds: `[b"attestation", validator.key().as_ref(), project.key().as_ref()]`
#[account]
pub struct AttestationRecord {
    /// Validator that submitted this attestation.
    pub validator: Pubkey,
    /// The project being assessed.
    pub project: Pubkey,
    /// SHA-256 hash of the full off-chain report (32 bytes).
    pub report_hash: [u8; 32],
    /// Category of work performed (serialised JobType discriminant).
    pub job_type: u8,

    // --- Scores (0–100 each) ---
    pub tech_score: u8,
    pub treasury_score: u8,
    pub tokenomics_score: u8,
    pub gov_score: u8,
    pub transparency_score: u8,

    /// Validator stake captured at submission time (used for weighted average).
    pub stake_at_submission: u64,

    /// Unix timestamp when the attestation was submitted.
    pub submitted_at: i64,

    /// True if a challenge against this attestation was upheld.
    pub challenged: bool,

    /// PDA bump.
    pub bump: u8,
}

impl AttestationRecord {
    pub const LEN: usize = 8
        + 32  // validator
        + 32  // project
        + 32  // report_hash
        + 1   // job_type
        + 1   // tech_score
        + 1   // treasury_score
        + 1   // tokenomics_score
        + 1   // gov_score
        + 1   // transparency_score
        + 8   // stake_at_submission
        + 8   // submitted_at
        + 1   // challenged
        + 1   // bump
        + 16; // padding
}

// ---------------------------------------------------------------------------
// ScoreSet
// ---------------------------------------------------------------------------

/// Five-dimensional risk score bundle passed to `submit_attestation`.
/// Each field is in the range 0–100 (higher = lower risk).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct ScoreSet {
    pub tech: u8,
    pub treasury: u8,
    pub tokenomics: u8,
    pub gov: u8,
    pub transparency: u8,
}

// ---------------------------------------------------------------------------
// ChallengeRecord
// ---------------------------------------------------------------------------

/// A dispute raised against an attestation.
///
/// PDA seeds: `[b"challenge", attestation.key().as_ref()]`
#[account]
#[derive(Default)]
pub struct ChallengeRecord {
    /// Account that raised the challenge.
    pub challenger: Pubkey,
    /// The attestation being disputed.
    pub attestation: Pubkey,
    /// The validator whose attestation is disputed.
    pub validator_target: Pubkey,
    /// The project the attestation belongs to.
    pub project: Pubkey,

    /// Unix timestamp when the challenge was submitted.
    pub submitted_at: i64,
    /// True after the authority has resolved this challenge.
    pub resolved: bool,
    /// True if the challenge was upheld (validator penalised).
    pub upheld: bool,

    /// PDA bump.
    pub bump: u8,
}

impl ChallengeRecord {
    pub const LEN: usize = 8
        + 32  // challenger
        + 32  // attestation
        + 32  // validator_target
        + 32  // project
        + 8   // submitted_at
        + 1   // resolved
        + 1   // upheld
        + 1   // bump
        + 16; // padding
}
