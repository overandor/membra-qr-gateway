use anchor_lang::prelude::*;

use crate::{
    errors::IdoError,
    events::{IdoPaused, IdoResumed},
    state::IdoConfig,
};

#[derive(Accounts)]
pub struct PauseIdo<'info> {
    /// Must be the authority or governance key stored in IdoConfig.
    pub caller: Signer<'info>,

    /// The global IDO configuration.
    #[account(
        mut,
        seeds = [b"ido_config", ido_config.token_mint.as_ref()],
        bump = ido_config.bump,
    )]
    pub ido_config: Account<'info, IdoConfig>,
}

pub fn handler(ctx: Context<PauseIdo>, pause: bool) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let config = &mut ctx.accounts.ido_config;

    // --- Authorization ---
    let caller_key = ctx.accounts.caller.key();
    require!(
        caller_key == config.authority || caller_key == config.governance,
        IdoError::Unauthorized
    );

    // --- State guards ---
    require!(!config.cancelled, IdoError::IdoAlreadyCancelled);
    require!(!config.finalized, IdoError::IdoAlreadyFinalized);

    config.paused = pause;

    if pause {
        emit!(IdoPaused {
            authority: caller_key,
            ts: now,
        });
    } else {
        emit!(IdoResumed {
            authority: caller_key,
            ts: now,
        });
    }

    Ok(())
}
