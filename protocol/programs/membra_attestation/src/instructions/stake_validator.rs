use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::AttestationError,
    events::ValidatorStaked,
    state::{ProtocolConfig, ValidatorRecord},
};

#[derive(Accounts)]
pub struct StakeValidator<'info> {
    #[account(mut)]
    pub validator: Signer<'info>,

    #[account(
        seeds = [b"protocol_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"validator", validator.key().as_ref()],
        bump = validator_record.bump,
        constraint = validator_record.authority == validator.key() @ AttestationError::Unauthorized,
    )]
    pub validator_record: Account<'info, ValidatorRecord>,

    #[account(address = config.token_mint)]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = validator,
    )]
    pub validator_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        address = validator_record.vault,
        token::mint = token_mint,
    )]
    pub validator_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<StakeValidator>, amount: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, AttestationError::ProtocolPaused);
    require!(amount > 0, AttestationError::InvalidAmount);

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.validator_ata.to_account_info(),
                to: ctx.accounts.validator_vault.to_account_info(),
                authority: ctx.accounts.validator.to_account_info(),
            },
        ),
        amount,
    )?;

    let record = &mut ctx.accounts.validator_record;
    record.stake = record
        .stake
        .checked_add(amount)
        .ok_or(AttestationError::ArithmeticOverflow)?;

    emit!(ValidatorStaked {
        validator: ctx.accounts.validator.key(),
        amount,
        total_stake: record.stake,
    });

    Ok(())
}
