use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::{
    errors::IdoError,
    events::IdoRefunded,
    state::{IdoConfig, UserIdoRecord},
};

#[derive(Accounts)]
pub struct RefundIdo<'info> {
    /// The user requesting a refund.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The global IDO configuration. Must be cancelled.
    #[account(
        seeds = [b"ido_config", ido_config.token_mint.as_ref()],
        bump = ido_config.bump,
    )]
    pub ido_config: Account<'info, IdoConfig>,

    /// The user's participation record.
    #[account(
        mut,
        seeds = [b"user_ido", ido_config.key().as_ref(), user.key().as_ref()],
        bump = user_ido_record.bump,
        has_one = user @ IdoError::Unauthorized,
        has_one = ido_config @ IdoError::Unauthorized,
    )]
    pub user_ido_record: Account<'info, UserIdoRecord>,

    /// Payment vault holding buyer USDC; authority is the ido_config PDA.
    #[account(
        mut,
        address = ido_config.payment_vault @ IdoError::InvalidVault,
    )]
    pub payment_vault: Account<'info, TokenAccount>,

    /// The user's USDC account that will receive the refund.
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = payment_mint,
        associated_token::authority = user,
    )]
    pub user_payment_account: Account<'info, TokenAccount>,

    /// Payment mint (USDC).
    #[account(address = ido_config.payment_mint @ IdoError::InvalidMint)]
    pub payment_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<RefundIdo>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let config = &ctx.accounts.ido_config;
    let record = &mut ctx.accounts.user_ido_record;

    // --- State guards ---
    require!(config.cancelled, IdoError::IdoNotCancelled);
    require!(!record.refunded, IdoError::AlreadyRefunded);
    require!(!record.tokens_claimed, IdoError::AlreadyClaimed);

    let payment_to_refund = record.payment_deposited;
    require!(payment_to_refund > 0, IdoError::InvalidAmount);

    // PDA signer seeds for the payment_vault transfer.
    let token_mint_key = config.token_mint;
    let bump = config.bump;
    let seeds: &[&[u8]] = &[b"ido_config", token_mint_key.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.payment_vault.to_account_info(),
            to: ctx.accounts.user_payment_account.to_account_info(),
            authority: ctx.accounts.ido_config.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, payment_to_refund)?;

    record.refunded = true;

    emit!(IdoRefunded {
        user: ctx.accounts.user.key(),
        payment_refunded: payment_to_refund,
        ts: now,
    });

    Ok(())
}
