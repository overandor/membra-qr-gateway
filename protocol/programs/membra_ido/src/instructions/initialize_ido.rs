use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
    errors::IdoError,
    events::IdoInitialized,
    state::IdoConfig,
};

#[derive(Accounts)]
#[instruction(
    token_price_usd_6: u64,
    hard_cap_tokens: u64,
    min_purchase_tokens: u64,
    max_purchase_tokens: u64,
    start_ts: i64,
    end_ts: i64,
    claim_start_ts: i64,
    unsold_burn: bool,
)]
pub struct InitializeIdo<'info> {
    /// Payer / authority of the IDO.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The token being sold.
    pub token_mint: Account<'info, Mint>,

    /// The payment token (USDC).
    pub payment_mint: Account<'info, Mint>,

    /// Vault that will hold IDO tokens. Must be pre-funded before buyers participate.
    #[account(
        mut,
        token::mint = token_mint,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// Vault that will accumulate payment from buyers.
    #[account(
        mut,
        token::mint = payment_mint,
    )]
    pub payment_vault: Account<'info, TokenAccount>,

    /// Treasury account (receives funds and/or unsold tokens at finalization).
    /// CHECK: Validated only by pubkey; no on-chain constraint required.
    pub treasury: UncheckedAccount<'info>,

    /// Governance/multisig that can co-administer the IDO.
    /// CHECK: Validated only by pubkey; no on-chain constraint required.
    pub governance: UncheckedAccount<'info>,

    /// The global IDO configuration PDA.
    #[account(
        init,
        payer = authority,
        space = IdoConfig::LEN,
        seeds = [b"ido_config", token_mint.key().as_ref()],
        bump,
    )]
    pub ido_config: Account<'info, IdoConfig>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializeIdo>,
    token_price_usd_6: u64,
    hard_cap_tokens: u64,
    min_purchase_tokens: u64,
    max_purchase_tokens: u64,
    start_ts: i64,
    end_ts: i64,
    claim_start_ts: i64,
    unsold_burn: bool,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    require!(token_price_usd_6 > 0, IdoError::InvalidPrice);
    require!(hard_cap_tokens > 0, IdoError::InvalidAmount);
    require!(min_purchase_tokens > 0, IdoError::InvalidAmount);
    require!(
        max_purchase_tokens >= min_purchase_tokens,
        IdoError::AboveMaximumPurchase
    );
    require!(start_ts < end_ts, IdoError::InvalidTimestamp);
    require!(end_ts > now, IdoError::InvalidTimestamp);
    require!(claim_start_ts >= end_ts, IdoError::InvalidTimestamp);

    // Treasury and governance must not be the default pubkey
    require!(
        ctx.accounts.treasury.key() != Pubkey::default(),
        IdoError::InvalidVault
    );
    require!(
        ctx.accounts.governance.key() != Pubkey::default(),
        IdoError::Unauthorized
    );

    let config = &mut ctx.accounts.ido_config;
    let bump = ctx.bumps.ido_config;

    config.authority = ctx.accounts.authority.key();
    config.token_mint = ctx.accounts.token_mint.key();
    config.payment_mint = ctx.accounts.payment_mint.key();
    config.token_vault = ctx.accounts.token_vault.key();
    config.payment_vault = ctx.accounts.payment_vault.key();
    config.treasury = ctx.accounts.treasury.key();
    config.governance = ctx.accounts.governance.key();
    config.token_price_usd_6 = token_price_usd_6;
    config.hard_cap_tokens = hard_cap_tokens;
    config.min_purchase_tokens = min_purchase_tokens;
    config.max_purchase_tokens = max_purchase_tokens;
    config.total_sold_tokens = 0;
    config.total_raised_payment = 0;
    config.start_ts = start_ts;
    config.end_ts = end_ts;
    config.claim_start_ts = claim_start_ts;
    config.finalized = false;
    config.cancelled = false;
    config.paused = false;
    config.unsold_burn = unsold_burn;
    config.bump = bump;

    emit!(IdoInitialized {
        authority: config.authority,
        token_mint: config.token_mint,
        payment_mint: config.payment_mint,
        hard_cap_tokens: config.hard_cap_tokens,
        token_price_usd_6: config.token_price_usd_6,
        start_ts: config.start_ts,
        end_ts: config.end_ts,
    });

    Ok(())
}
