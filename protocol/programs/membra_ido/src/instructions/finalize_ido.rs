use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::IdoError,
    events::IdoFinalized,
    state::IdoConfig,
};

#[derive(Accounts)]
pub struct FinalizeIdo<'info> {
    /// Must be the authority or governance key stored in IdoConfig.
    #[account(mut)]
    pub caller: Signer<'info>,

    /// The global IDO configuration.
    #[account(
        mut,
        seeds = [b"ido_config", ido_config.token_mint.as_ref()],
        bump = ido_config.bump,
    )]
    pub ido_config: Account<'info, IdoConfig>,

    /// Token vault holding unsold IDO tokens.
    #[account(
        mut,
        address = ido_config.token_vault @ IdoError::InvalidVault,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// IDO token mint (needed for burn CPI).
    #[account(
        mut,
        address = ido_config.token_mint @ IdoError::InvalidMint,
    )]
    pub token_mint: Account<'info, Mint>,

    /// Treasury token account that receives unsold tokens when unsold_burn=false.
    /// Must hold the IDO token mint.
    #[account(
        mut,
        token::mint = token_mint,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    /// Payment vault (for reference; authority may withdraw separately).
    #[account(
        address = ido_config.payment_vault @ IdoError::InvalidVault,
    )]
    pub payment_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<FinalizeIdo>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    // --- Authorization ---
    let caller_key = ctx.accounts.caller.key();
    require!(
        caller_key == ctx.accounts.ido_config.authority
            || caller_key == ctx.accounts.ido_config.governance,
        IdoError::Unauthorized
    );

    // --- State guards ---
    require!(!ctx.accounts.ido_config.finalized, IdoError::IdoAlreadyFinalized);
    require!(!ctx.accounts.ido_config.cancelled, IdoError::IdoAlreadyCancelled);
    require!(now > ctx.accounts.ido_config.end_ts, IdoError::IdoNotEnded);

    // --- Compute unsold tokens ---
    let unsold_tokens = ctx
        .accounts
        .ido_config
        .hard_cap_tokens
        .checked_sub(ctx.accounts.ido_config.total_sold_tokens)
        .ok_or(IdoError::ArithmeticOverflow)?;

    // Extract the scalar fields needed for the PDA signer seeds.
    // These copies are taken before any mutable reborrow.
    let token_mint_key = ctx.accounts.ido_config.token_mint;
    let bump = ctx.accounts.ido_config.bump;
    let do_burn = ctx.accounts.ido_config.unsold_burn;

    // PDA signer seeds: the ido_config PDA is the vault authority.
    let seeds: &[&[u8]] = &[b"ido_config", token_mint_key.as_ref(), &[bump]];
    let signer_seeds = &[seeds];

    if unsold_tokens > 0 {
        if do_burn {
            // Burn unsold tokens from the vault.
            let burn_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.token_mint.to_account_info(),
                    from: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.ido_config.to_account_info(),
                },
                signer_seeds,
            );
            token::burn(burn_ctx, unsold_tokens)?;
        } else {
            // Transfer unsold tokens to treasury.
            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.ido_config.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(transfer_ctx, unsold_tokens)?;
        }
    }

    // Snapshot the totals for the event before the mutable borrow.
    let total_sold = ctx.accounts.ido_config.total_sold_tokens;
    let total_raised = ctx.accounts.ido_config.total_raised_payment;

    // Now mark finalized (mutable borrow on ido_config, no conflicting borrows above).
    ctx.accounts.ido_config.finalized = true;

    emit!(IdoFinalized {
        total_sold_tokens: total_sold,
        total_raised_payment: total_raised,
        ts: now,
    });

    Ok(())
}
