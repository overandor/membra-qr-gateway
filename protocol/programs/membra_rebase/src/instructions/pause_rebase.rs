use anchor_lang::prelude::*;

use crate::{errors::RebaseError, events::RebasePaused, state::{RebaseState, REBASE_STATE_SEED}};

#[derive(Accounts)]
pub struct PauseRebase<'info> {
    /// Must be either the authority or the governance account.
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [REBASE_STATE_SEED, rebase_state.token_mint.as_ref()],
        bump = rebase_state.bump,
    )]
    pub rebase_state: Account<'info, RebaseState>,
}

/// Halt all rebase executions.
///
/// Callable by either `rebase_state.authority` or `rebase_state.governance`.
pub fn handler(ctx: Context<PauseRebase>) -> Result<()> {
    let rebase_state = &mut ctx.accounts.rebase_state;
    let caller_key = ctx.accounts.caller.key();

    require!(
        caller_key == rebase_state.authority || caller_key == rebase_state.governance,
        RebaseError::Unauthorized
    );

    rebase_state.paused = true;

    let clock = Clock::get()?;
    emit!(RebasePaused {
        authority: caller_key,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
