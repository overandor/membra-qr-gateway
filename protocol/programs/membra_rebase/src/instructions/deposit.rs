use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::RebaseError,
    events::TokensDeposited,
    state::{RebaseState, UserRebaseAccount, REBASE_INDEX_ONE, REBASE_STATE_SEED, USER_REBASE_SEED},
};

#[derive(Accounts)]
pub struct Deposit<'info> {
    /// The depositing user.
    #[account(mut)]
    pub user: Signer<'info>,

    /// RebaseState PDA.
    #[account(
        mut,
        seeds = [REBASE_STATE_SEED, rebase_state.token_mint.as_ref()],
        bump = rebase_state.bump,
    )]
    pub rebase_state: Account<'info, RebaseState>,

    /// Per-user share account; created on first deposit.
    #[account(
        init_if_needed,
        payer = user,
        space = UserRebaseAccount::LEN,
        seeds = [USER_REBASE_SEED, rebase_state.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub user_rebase_account: Account<'info, UserRebaseAccount>,

    /// User's token account (source of deposit).
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = user,
    )]
    pub user_ata: Account<'info, TokenAccount>,

    /// Program-owned vault that holds deposited tokens.
    /// Seeds: [b"rebase_vault", rebase_state.key()]
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
    pub system_program: Program<'info, System>,
}

/// Deposit `amount` tokens into the rebase vault and receive proportional shares.
///
/// Shares are computed as:
/// ```text
/// shares = amount * REBASE_INDEX_ONE / global_rebase_index
/// ```
/// At index = 1.0 (REBASE_INDEX_ONE), shares equal deposited tokens exactly.
/// As the index grows (supply expansion), each token buys fewer shares — reflecting
/// that existing shares have appreciated.
pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, RebaseError::InvalidPrice);
    require!(!ctx.accounts.rebase_state.paused, RebaseError::RebasePaused);

    let rebase_state = &mut ctx.accounts.rebase_state;
    let user_account = &mut ctx.accounts.user_rebase_account;

    // First-time init of user account.
    if user_account.user == Pubkey::default() {
        user_account.user = ctx.accounts.user.key();
        user_account.rebase_state = rebase_state.key();
        user_account.bump = ctx.bumps.user_rebase_account;
    }

    // shares = amount * REBASE_INDEX_ONE / global_rebase_index
    let shares = (amount as u128)
        .checked_mul(REBASE_INDEX_ONE)
        .ok_or(RebaseError::ArithmeticOverflow)?
        .checked_div(rebase_state.global_rebase_index)
        .ok_or(RebaseError::ArithmeticOverflow)?;

    require!(shares > 0, RebaseError::ArithmeticOverflow);

    // Transfer tokens from user → vault.
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_ata.to_account_info(),
                to: ctx.accounts.rebase_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    // Update state.
    user_account.shares = user_account
        .shares
        .checked_add(shares)
        .ok_or(RebaseError::ArithmeticOverflow)?;
    user_account.deposited_tokens = user_account
        .deposited_tokens
        .checked_add(amount)
        .ok_or(RebaseError::ArithmeticOverflow)?;

    rebase_state.total_shares = rebase_state
        .total_shares
        .checked_add(shares)
        .ok_or(RebaseError::ArithmeticOverflow)?;

    emit!(TokensDeposited {
        user: ctx.accounts.user.key(),
        amount,
        shares,
        global_rebase_index: rebase_state.global_rebase_index,
    });

    Ok(())
}
