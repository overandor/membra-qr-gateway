use anchor_lang::prelude::*;

#[event]
pub struct MemoryVaultInitialized {
    pub owner: Pubkey,
    pub agent_id_hash: [u8; 32],
    pub memory_root: [u8; 32],
    pub ts: i64,
}

#[event]
pub struct RepoProofRegistered {
    pub owner: Pubkey,
    pub head_commit_hash: [u8; 32],
    pub file_tree_merkle_root: [u8; 32],
    pub commit_count: u64,
    pub ts: i64,
}

#[event]
pub struct MIRCreated {
    pub owner: Pubkey,
    pub job_id_hash: [u8; 32],
    pub ts: i64,
}

#[event]
pub struct MIRAttested {
    pub mir_receipt: Pubkey,
    pub compute_attestation_hash: [u8; 32],
    pub ts: i64,
}

#[event]
pub struct MemoryCollateralReceiptCreated {
    pub owner: Pubkey,
    pub mcr: Pubkey,
    pub repo_proof: Pubkey,
    pub memory_vault: Pubkey,
    pub parent_mir: Pubkey,
    pub ts: i64,
}

#[event]
pub struct CollateralScoreUpdated {
    pub mcr: Pubkey,
    pub collateral_score: u64,
    pub appraisal_low_usd: u64,
    pub appraisal_high_usd: u64,
    pub risk_discount_bps: u16,
    pub ts: i64,
}

#[event]
pub struct CollateralReceiptRevoked {
    pub mcr: Pubkey,
    pub ts: i64,
}

#[event]
pub struct CollateralReceiptStatusChanged {
    pub mcr: Pubkey,
    pub old_status: u8,
    pub new_status: u8,
    pub ts: i64,
}
