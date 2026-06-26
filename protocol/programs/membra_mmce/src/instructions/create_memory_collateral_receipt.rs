use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;

#[derive(Accounts)]
#[instruction(mcr_id_hash: [u8; 32])]
pub struct CreateMemoryCollateralReceipt<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub repo_proof: Account<'info, RepoProof>,

    pub memory_vault: Account<'info, MemoryVault>,

    pub parent_mir: Account<'info, MIRReceipt>,

    #[account(
        init,
        payer = owner,
        space = MemoryCollateralReceipt::LEN,
        seeds = [b"mcr", owner.key().as_ref(), &mcr_id_hash],
        bump
    )]
    pub mcr: Account<'info, MemoryCollateralReceipt>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateMemoryCollateralReceipt>,
    mcr_id_hash: [u8; 32],
    m5_attestation_root: [u8; 32],
) -> Result<()> {
    let mcr = &mut ctx.accounts.mcr;
    let clock = Clock::get()?;

    require_keys_eq!(
        ctx.accounts.repo_proof.owner,
        ctx.accounts.owner.key(),
        crate::errors::MmceError::InvalidRepoProofOwner
    );
    require_keys_eq!(
        ctx.accounts.memory_vault.owner,
        ctx.accounts.owner.key(),
        crate::errors::MmceError::InvalidMemoryVaultOwner
    );
    require_keys_eq!(
        ctx.accounts.parent_mir.owner,
        ctx.accounts.owner.key(),
        crate::errors::MmceError::InvalidMirReceiptOwner
    );

    mcr.owner = ctx.accounts.owner.key();
    mcr.mcr_id_hash = mcr_id_hash;
    mcr.repo_proof = ctx.accounts.repo_proof.key();
    mcr.memory_vault = ctx.accounts.memory_vault.key();
    mcr.parent_mir = ctx.accounts.parent_mir.key();
    mcr.m5_attestation_root = m5_attestation_root;
    mcr.collateral_score = 0;
    mcr.appraisal_low_usd = 0;
    mcr.appraisal_high_usd = 0;
    mcr.risk_discount_bps = 0;
    mcr.status = CollateralStatus::AnchorRegistered;
    mcr.created_at = clock.unix_timestamp;
    mcr.updated_at = clock.unix_timestamp;
    mcr.bump = ctx.bumps.mcr;

    emit!(MemoryCollateralReceiptCreated {
        owner: ctx.accounts.owner.key(),
        mcr: mcr.key(),
        repo_proof: ctx.accounts.repo_proof.key(),
        memory_vault: ctx.accounts.memory_vault.key(),
        parent_mir: ctx.accounts.parent_mir.key(),
        ts: clock.unix_timestamp,
    });

    Ok(())
}
