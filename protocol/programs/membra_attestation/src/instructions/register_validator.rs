use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
    errors::AttestationError,
    events::ValidatorRegistered,
    state::{ProtocolConfig, ValidatorRecord},
};

#[derive(Accounts)]
pub struct RegisterValidator<'info> {
    #[account(mut)]
    pub validator: Signer<'info>,

    #[account(
        seeds = [b"protocol_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = validator,
        space = ValidatorRecord::LEN,
        seeds = [b"validator", validator.key().as_ref()],
        bump,
    )]
    pub validator_record: Account<'info, ValidatorRecord>,

    #[account(address = config.token_mint)]
    pub token_mint: Account<'info, Mint>,

    /// Pre-created token vault owned by the validator_record PDA.
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = validator_record,
    )]
    pub validator_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<RegisterValidator>) -> Result<()> {
    require!(!ctx.accounts.config.paused, AttestationError::ProtocolPaused);

    let now = Clock::get()?.unix_timestamp;
    let record = &mut ctx.accounts.validator_record;

    record.authority = ctx.accounts.validator.key();
    record.vault = ctx.accounts.validator_vault.key();
    record.stake = 0;
    record.reputation = ValidatorRecord::INITIAL_REPUTATION;
    record.completed_jobs = 0;
    record.failed_jobs = 0;
    record.slash_count = 0;
    record.registered_at = now;
    record.bump = ctx.bumps.validator_record;
    record.vault_bump = 0; // vault is pre-created externally; bump tracked off-chain

    emit!(ValidatorRegistered {
        validator: ctx.accounts.validator.key(),
        registered_at: now,
    });

    Ok(())
}
