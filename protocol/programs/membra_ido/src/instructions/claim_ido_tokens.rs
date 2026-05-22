use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::{
    errors::IdoError,
    events::IdoTokensClaimed,
    state::{IdoConfig, UserIdoRecord},
};

#[derive(Accounts)]
pub struct ClaimIdoTokens<'info> {
    /// The buyer claiming their tokens.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The global IDO configuration.
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

    /// Token vault holding IDO tokens; authority is the ido_config PDA.
    #[account(
        mut,
        address = ido_config.token_vault @ IdoError::InvalidVault,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// The user's destination token account for claimed IDO tokens.
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// IDO token mint.
    #[account(address = ido_config.token_mint @ IdoError::InvalidMint)]
    pub token_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<ClaimIdoTokens>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let config = &ctx.accounts.ido_config;
    let record = &mut ctx.accounts.user_ido_record;

    // --- State guards ---
    require!(config.finalized, IdoError::IdoNotFinalized);
    require!(!config.cancelled, IdoError::IdoAlreadyCancelled);
    require!(now >= config.claim_start_ts, IdoError::ClaimNotStarted);
    require!(!record.tokens_claimed, IdoError::AlreadyClaimed);
    require!(!record.refunded, IdoError::AlreadyRefunded);

    let tokens_to_claim = record.tokens_purchased;
    require!(tokens_to_claim > 0, IdoError::InvalidAmount);

    // PDA signer seeds for the token_vault transfer.
    let token_mint_key = config.token_mint;
    let bump = config.bump;
    let seeds: &[&[u8]] = &[b"ido_config", token_mint_key.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.token_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.ido_config.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, tokens_to_claim)?;

    record.tokens_claimed = true;

    emit!(IdoTokensClaimed {
        user: ctx.accounts.user.key(),
        tokens_claimed: tokens_to_claim,
        ts: now,
    });

    Ok(())
}
