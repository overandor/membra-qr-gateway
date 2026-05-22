use anchor_lang::prelude::*;

use crate::{
    errors::RebaseError,
    events::RebaseResumed,
    state::{RebaseState, REBASE_STATE_SEED},
};

#[derive(Accounts)]
pub struct ResumeRebase<'info> {
    /// Must be either the authority or the governance account.
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [REBASE_STATE_SEED, rebase_state.token_mint.as_ref()],
        bump = rebase_state.bump,
    )]
    pub rebase_state: Account<'info, RebaseState>,
}

/// Lift the pause and allow rebases to execute again.
///
/// Callable by either `rebase_state.authority` or `rebase_state.governance`.
pub fn handler(ctx: Context<ResumeRebase>) -> Result<()> {
    let rebase_state = &mut ctx.accounts.rebase_state;
    let caller_key = ctx.accounts.caller.key();

    require!(
        caller_key == rebase_state.authority || caller_key == rebase_state.governance,
        RebaseError::Unauthorized
    );

    rebase_state.paused = false;

    let clock = Clock::get()?;
    emit!(RebaseResumed {
        authority: caller_key,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
