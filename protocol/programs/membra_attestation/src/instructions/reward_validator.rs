use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::AttestationError,
    events::ValidatorRewarded,
    state::{ProtocolConfig, ValidatorRecord},
};

#[derive(Accounts)]
pub struct RewardValidator<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"protocol_config"],
        bump = config.bump,
        has_one = authority @ AttestationError::Unauthorized,
        has_one = reward_vault @ AttestationError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"validator", validator_record.authority.as_ref()],
        bump = validator_record.bump,
    )]
    pub validator_record: Account<'info, ValidatorRecord>,

    /// Validator's token account to receive the reward.
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = validator_record.authority,
    )]
    pub validator_ata: Account<'info, TokenAccount>,

    #[account(address = config.token_mint)]
    pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<RewardValidator>, amount: u64) -> Result<()> {
    require!(amount > 0, AttestationError::InvalidAmount);
    require!(
        ctx.accounts.reward_vault.amount >= amount,
        AttestationError::RewardVaultInsufficient
    );

    let config_bump = ctx.accounts.config.bump;

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.validator_ata.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            &[&[b"protocol_config", &[config_bump]]],
        ),
        amount,
    )?;

    let record = &mut ctx.accounts.validator_record;
    record.completed_jobs = record.completed_jobs.checked_add(1).unwrap_or(u64::MAX);
    // Reward improves reputation slightly (+50 bps, capped at 10 000).
    record.reputation = record.reputation.saturating_add(50).min(10_000);

    emit!(ValidatorRewarded {
        validator: record.authority,
        amount,
    });

    Ok(())
}
