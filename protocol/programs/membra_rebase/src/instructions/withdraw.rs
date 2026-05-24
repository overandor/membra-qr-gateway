use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::RebaseError,
    events::TokensWithdrawn,
    state::{RebaseState, UserRebaseAccount, REBASE_INDEX_ONE, REBASE_STATE_SEED, USER_REBASE_SEED},
};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    /// The withdrawing user.
    #[account(mut)]
    pub user: Signer<'info>,

    /// RebaseState PDA.
    #[account(
        mut,
        seeds = [REBASE_STATE_SEED, rebase_state.token_mint.as_ref()],
        bump = rebase_state.bump,
    )]
    pub rebase_state: Account<'info, RebaseState>,

    /// Per-user share account.
    #[account(
        mut,
        seeds = [USER_REBASE_SEED, rebase_state.key().as_ref(), user.key().as_ref()],
        bump = user_rebase_account.bump,
        constraint = user_rebase_account.user == user.key() @ RebaseError::Unauthorized,
    )]
    pub user_rebase_account: Account<'info, UserRebaseAccount>,

    /// User's token account (destination for withdrawal).
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = user,
    )]
    pub user_ata: Account<'info, TokenAccount>,

    /// Program-owned vault that holds deposited tokens.
    #[account(
        mut,
        seeds = [b"rebase_vault", rebase_state.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = rebase_state,
    )]
    pub rebase_vault: Account<'info, TokenAccount>,

    /// The SPL mint managed by this rebase state.
    #[account(address = rebase_state.token_mint)]
    pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

/// Burn `shares` from the user's account and return the proportional token amount.
///
/// Redemption formula:
/// ```text
/// tokens = shares * global_rebase_index / REBASE_INDEX_ONE
/// ```
/// If the index has grown since deposit, the user receives more tokens than deposited
/// (supply expanded). If the index contracted, they receive fewer.
pub fn handler(ctx: Context<Withdraw>, shares: u128) -> Result<()> {
    require!(shares > 0, RebaseError::InvalidPrice);
    require!(!ctx.accounts.rebase_state.paused, RebaseError::RebasePaused);

    let user_account = &ctx.accounts.user_rebase_account;
    require!(
        user_account.shares >= shares,
        RebaseError::InsufficientShares
    );

    let rebase_state = &ctx.accounts.rebase_state;

    // tokens = shares * global_rebase_index / REBASE_INDEX_ONE
    let tokens = shares
        .checked_mul(rebase_state.global_rebase_index)
        .ok_or(RebaseError::ArithmeticOverflow)?
        .checked_div(REBASE_INDEX_ONE)
        .ok_or(RebaseError::ArithmeticOverflow)?;

    let tokens_u64 = u64::try_from(tokens).map_err(|_| RebaseError::ArithmeticOverflow)?;
    require!(tokens_u64 > 0, RebaseError::ArithmeticOverflow);
    require!(
        ctx.accounts.rebase_vault.amount >= tokens_u64,
        RebaseError::InsufficientShares
    );

    // PDA signer seeds for the rebase_state account (vault authority).
    let token_mint_key = rebase_state.token_mint;
    let state_bump = rebase_state.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        REBASE_STATE_SEED,
        token_mint_key.as_ref(),
        &[state_bump],
    ]];

    // Transfer tokens from vault → user.
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.rebase_vault.to_account_info(),
                to: ctx.accounts.user_ata.to_account_info(),
                authority: ctx.accounts.rebase_state.to_account_info(),
            },
            signer_seeds,
        ),
        tokens_u64,
    )?;

    // Update state.
    let user_account = &mut ctx.accounts.user_rebase_account;
    user_account.shares = user_account
        .shares
        .checked_sub(shares)
        .ok_or(RebaseError::ArithmeticOverflow)?;

    let rebase_state = &mut ctx.accounts.rebase_state;
    rebase_state.total_shares = rebase_state
        .total_shares
        .checked_sub(shares)
        .ok_or(RebaseError::ArithmeticOverflow)?;

    emit!(TokensWithdrawn {
        user: ctx.accounts.user.key(),
        shares,
        tokens_returned: tokens_u64,
        global_rebase_index: rebase_state.global_rebase_index,
    });

    Ok(())
}
