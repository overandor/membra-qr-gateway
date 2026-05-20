use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{errors::AttestationError, state::ProtocolConfig};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = ProtocolConfig::LEN,
        seeds = [b"protocol_config"],
        bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    pub token_mint: Account<'info, Mint>,

    /// Pre-created protocol reward vault owned by the config PDA.
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = config,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<Initialize>,
    min_stake: u64,
    slash_bps: u16,
    min_attestations: u8,
    reward_per_job: u64,
) -> Result<()> {
    require!(min_stake > 0, AttestationError::InvalidAmount);
    require!(slash_bps <= 10_000, AttestationError::InvalidScore);
    require!(min_attestations >= 1, AttestationError::InsufficientAttestations);

    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.token_mint = ctx.accounts.token_mint.key();
    config.reward_vault = ctx.accounts.reward_vault.key();
    config.min_stake = min_stake;
    config.slash_bps = slash_bps;
    config.min_attestations = min_attestations;
    config.reward_per_job = reward_per_job;
    config.paused = false;
    config.bump = ctx.bumps.config;

    Ok(())
}
