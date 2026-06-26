use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

pub use instructions::initialize_memory_vault::InitializeMemoryVault;
pub use instructions::register_repo_proof::RegisterRepoProof;
pub use instructions::create_mir::CreateMir;
pub use instructions::attest_mir::AttestMir;
pub use instructions::create_memory_collateral_receipt::CreateMemoryCollateralReceipt;
pub use instructions::update_collateral_score::UpdateCollateralScore;
pub use instructions::revoke_collateral_receipt::RevokeCollateralReceipt;
pub use state::VisibilityClass;

declare_id!("MmCe111111111111111111111111111111111111111");

#[program]
pub mod membra_mmce {
    use super::*;

    pub fn initialize_memory_vault(
        ctx: Context<InitializeMemoryVault>,
        agent_id_hash: [u8; 32],
        memory_root: [u8; 32],
        embedding_index_hash: [u8; 32],
        policy_hash: [u8; 32],
    ) -> Result<()> {
        instructions::initialize_memory_vault::handler(
            ctx,
            agent_id_hash,
            memory_root,
            embedding_index_hash,
            policy_hash,
        )
    }

    pub fn register_repo_proof(
        ctx: Context<RegisterRepoProof>,
        repo_owner_hash: [u8; 32],
        repo_name_hash: [u8; 32],
        head_commit_hash: [u8; 32],
        file_tree_merkle_root: [u8; 32],
        ast_merkle_root: [u8; 32],
        dependency_fingerprint_hash: [u8; 32],
        test_trace_hash: [u8; 32],
        commit_count: u64,
        first_commit_unix: i64,
        last_commit_unix: i64,
        visibility_class: VisibilityClass,
    ) -> Result<()> {
        instructions::register_repo_proof::handler(
            ctx,
            repo_owner_hash,
            repo_name_hash,
            head_commit_hash,
            file_tree_merkle_root,
            ast_merkle_root,
            dependency_fingerprint_hash,
            test_trace_hash,
            commit_count,
            first_commit_unix,
            last_commit_unix,
            visibility_class,
        )
    }

    pub fn create_mir(
        ctx: Context<CreateMir>,
        job_id_hash: [u8; 32],
        agent_id_hash: [u8; 32],
        input_merkle_root: [u8; 32],
        output_merkle_root: [u8; 32],
        model_manifest_hash: [u8; 32],
    ) -> Result<()> {
        instructions::create_mir::handler(
            ctx,
            job_id_hash,
            agent_id_hash,
            input_merkle_root,
            output_merkle_root,
            model_manifest_hash,
        )
    }

    pub fn attest_mir(
        ctx: Context<AttestMir>,
        compute_attestation_hash: [u8; 32],
    ) -> Result<()> {
        instructions::attest_mir::handler(ctx, compute_attestation_hash)
    }

    pub fn create_memory_collateral_receipt(
        ctx: Context<CreateMemoryCollateralReceipt>,
        mcr_id_hash: [u8; 32],
        m5_attestation_root: [u8; 32],
    ) -> Result<()> {
        instructions::create_memory_collateral_receipt::handler(
            ctx,
            mcr_id_hash,
            m5_attestation_root,
        )
    }

    pub fn update_collateral_score(
        ctx: Context<UpdateCollateralScore>,
        collateral_score: u64,
        appraisal_low_usd: u64,
        appraisal_high_usd: u64,
        risk_discount_bps: u16,
    ) -> Result<()> {
        instructions::update_collateral_score::handler(
            ctx,
            collateral_score,
            appraisal_low_usd,
            appraisal_high_usd,
            risk_discount_bps,
        )
    }

    pub fn revoke_collateral_receipt(
        ctx: Context<RevokeCollateralReceipt>,
    ) -> Result<()> {
        instructions::revoke_collateral_receipt::handler(ctx)
    }
}
