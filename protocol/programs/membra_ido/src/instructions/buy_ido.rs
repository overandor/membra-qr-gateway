use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::{
    errors::IdoError,
    events::IdoPurchased,
    state::{IdoConfig, UserIdoRecord},
};

#[derive(Accounts)]
pub struct BuyIdo<'info> {
    /// The buyer.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The global IDO configuration.
    #[account(
        mut,
        seeds = [b"ido_config", ido_config.token_mint.as_ref()],
        bump = ido_config.bump,
    )]
    pub ido_config: Account<'info, IdoConfig>,

    /// Per-user participation record. Created on first purchase.
    #[account(
        init_if_needed,
        payer = user,
        space = UserIdoRecord::LEN,
        seeds = [b"user_ido", ido_config.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub user_ido_record: Account<'info, UserIdoRecord>,

    /// The buyer's payment token account (USDC source).
    #[account(
        mut,
        token::mint = payment_mint,
        token::authority = user,
    )]
    pub user_payment_account: Account<'info, TokenAccount>,

    /// Payment vault that accumulates buyer USDC.
    #[account(
        mut,
        address = ido_config.payment_vault @ IdoError::InvalidVault,
    )]
    pub payment_vault: Account<'info, TokenAccount>,

    /// Payment mint (USDC). Used for mint constraint checks.
    #[account(address = ido_config.payment_mint @ IdoError::InvalidMint)]
    pub payment_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<BuyIdo>, token_amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let config = &mut ctx.accounts.ido_config;

    // --- State guards ---
    require!(!config.cancelled, IdoError::IdoAlreadyCancelled);
    require!(!config.finalized, IdoError::IdoAlreadyFinalized);
    require!(!config.paused, IdoError::IdoPaused);

    // --- Time window ---
    require!(now >= config.start_ts, IdoError::IdoNotStarted);
    require!(now <= config.end_ts, IdoError::IdoEnded);

    // --- Amount validations ---
    require!(token_amount > 0, IdoError::InvalidAmount);
    require!(
        token_amount >= config.min_purchase_tokens,
        IdoError::BelowMinimumPurchase
    );
    require!(
        token_amount <= config.max_purchase_tokens,
        IdoError::AboveMaximumPurchase
    );

    // --- Per-wallet cap ---
    let record = &mut ctx.accounts.user_ido_record;

    // On first init, set user and ido_config fields.
    if record.user == Pubkey::default() {
        record.user = ctx.accounts.user.key();
        record.ido_config = config.key();
        record.bump = ctx.bumps.user_ido_record;
    }

    let new_wallet_total = record
        .tokens_purchased
        .checked_add(token_amount)
        .ok_or(IdoError::ArithmeticOverflow)?;
    require!(
        new_wallet_total <= config.max_purchase_tokens,
        IdoError::WalletCapExceeded
    );

    // --- Hard cap ---
    let new_total_sold = config
        .total_sold_tokens
        .checked_add(token_amount)
        .ok_or(IdoError::ArithmeticOverflow)?;
    require!(
        new_total_sold <= config.hard_cap_tokens,
        IdoError::HardCapExceeded
    );

    // --- Compute payment amount ---
    // payment = token_amount * price_per_token
    // token_amount is in IDO token decimals; price is in USDC micro-units (6 dec).
    // The product uses the same decimal basis as the payment mint.
    let payment_amount = (token_amount as u128)
        .checked_mul(config.token_price_usd_6 as u128)
        .ok_or(IdoError::ArithmeticOverflow)?;

    // Divide by 10^(token_mint_decimals) if the IDO token has decimals other than 0.
    // For simplicity the price is defined such that:
    //   payment_amount (USDC 6-dec) = token_amount (IDO tokens, raw units) * price_usd_6
    // This keeps the math straightforward; the authority must set price accordingly.
    let payment_amount_u64 = u64::try_from(payment_amount)
        .map_err(|_| IdoError::ArithmeticOverflow)?;

    // --- Transfer payment from user to vault ---
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_payment_account.to_account_info(),
            to: ctx.accounts.payment_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, payment_amount_u64)?;

    // --- Update state ---
    config.total_sold_tokens = new_total_sold;
    config.total_raised_payment = config
        .total_raised_payment
        .checked_add(payment_amount_u64)
        .ok_or(IdoError::ArithmeticOverflow)?;

    record.tokens_purchased = new_wallet_total;
    record.payment_deposited = record
        .payment_deposited
        .checked_add(payment_amount_u64)
        .ok_or(IdoError::ArithmeticOverflow)?;

    emit!(IdoPurchased {
        user: ctx.accounts.user.key(),
        tokens_purchased: token_amount,
        payment_deposited: payment_amount_u64,
        total_sold_tokens: config.total_sold_tokens,
    });

    Ok(())
}
