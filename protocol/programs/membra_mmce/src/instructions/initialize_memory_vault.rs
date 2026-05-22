use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;

#[derive(Accounts)]
#[instruction(agent_id_hash: [u8; 32])]
pub struct InitializeMemoryVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = MemoryVault::LEN,
        seeds = [b"memory_vault", owner.key().as_ref(), &agent_id_hash],
        bump
    )]
    pub memory_vault: Account<'info, MemoryVault>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeMemoryVault>,
    agent_id_hash: [u8; 32],
    memory_root: [u8; 32],
    embedding_index_hash: [u8; 32],
    policy_hash: [u8; 32],
) -> Result<()> {
    let vault = &mut ctx.accounts.memory_vault;
    let clock = Clock::get()?;

    vault.owner = ctx.accounts.owner.key();
    vault.agent_id_hash = agent_id_hash;
    vault.memory_root = memory_root;
    vault.embedding_index_hash = embedding_index_hash;
    vault.policy_hash = policy_hash;
    vault.created_at = clock.unix_timestamp;
    vault.updated_at = clock.unix_timestamp;
    vault.bump = ctx.bumps.memory_vault;

    emit!(MemoryVaultInitialized {
        owner: ctx.accounts.owner.key(),
        agent_id_hash,
        memory_root,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
