use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum VisibilityClass {
    Public,
    Private,
    LocalOnly,
}

impl Default for VisibilityClass {
    fn default() -> Self {
        VisibilityClass::Private
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CollateralStatus {
    Created,
    RepoHashed,
    MemoryBound,
    InferenceLinked,
    M5Attested,
    AnchorRegistered,
    CollateralScored,
    ReadyForAppraisal,
    Disputed,
    Revoked,
    Expired,
    Updated,
    Reappraised,
    Escrowed,
    Licensed,
}

impl Default for CollateralStatus {
    fn default() -> Self {
        CollateralStatus::Created
    }
}

#[account]
#[derive(Default)]
pub struct MemoryVault {
    pub owner: Pubkey,
    pub agent_id_hash: [u8; 32],
    pub memory_root: [u8; 32],
    pub embedding_index_hash: [u8; 32],
    pub policy_hash: [u8; 32],
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl MemoryVault {
    pub const LEN: usize = 8
        + 32
        + 32
        + 32
        + 32
        + 32
        + 8
        + 8
        + 1;
}

#[account]
#[derive(Default)]
pub struct RepoProof {
    pub owner: Pubkey,
    pub repo_owner_hash: [u8; 32],
    pub repo_name_hash: [u8; 32],
    pub head_commit_hash: [u8; 32],
    pub file_tree_merkle_root: [u8; 32],
    pub ast_merkle_root: [u8; 32],
    pub dependency_fingerprint_hash: [u8; 32],
    pub test_trace_hash: [u8; 32],
    pub commit_count: u64,
    pub first_commit_unix: i64,
    pub last_commit_unix: i64,
    pub visibility_class: VisibilityClass,
    pub created_at: i64,
    pub bump: u8,
}

impl RepoProof {
    pub const LEN: usize = 8
        + 32
        + 32
        + 32
        + 32
        + 32
        + 32
        + 32
        + 32
        + 8
        + 8
        + 8
        + 1
        + 8
        + 1;
}

#[account]
#[derive(Default)]
pub struct MIRReceipt {
    pub owner: Pubkey,
    pub agent_id_hash: [u8; 32],
    pub job_id_hash: [u8; 32],
    pub input_merkle_root: [u8; 32],
    pub output_merkle_root: [u8; 32],
    pub model_manifest_hash: [u8; 32],
    pub compute_attestation_hash: [u8; 32],
    pub status: u8,
    pub created_at: i64,
    pub attested_at: i64,
    pub settled_at: i64,
    pub bump: u8,
}

impl MIRReceipt {
    pub const LEN: usize = 8
        + 32
        + 32
        + 32
        + 32
        + 32
        + 32
        + 32
        + 1
        + 8
        + 8
        + 8
        + 1;
}

#[account]
#[derive(Default)]
pub struct MemoryCollateralReceipt {
    pub owner: Pubkey,
    pub repo_proof: Pubkey,
    pub memory_vault: Pubkey,
    pub parent_mir: Pubkey,
    pub m5_attestation_root: [u8; 32],
    pub collateral_score: u64,
    pub appraisal_low_usd: u64,
    pub appraisal_high_usd: u64,
    pub risk_discount_bps: u16,
    pub status: CollateralStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl MemoryCollateralReceipt {
    pub const LEN: usize = 8
        + 32
        + 32
        + 32
        + 32
        + 32
        + 8
        + 8
        + 8
        + 2
        + 1
        + 8
        + 8
        + 1;
}
