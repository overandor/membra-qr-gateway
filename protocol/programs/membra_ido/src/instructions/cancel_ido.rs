use anchor_lang::prelude::*;

use crate::{
    errors::IdoError,
    events::IdoCancelled,
    state::{IdoConfig, IDO_CONFIG_SEED},
};

#[derive(Accounts)]
pub struct CancelIdo<'info> {
    /// Authority or governance may cancel an IDO.
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [IDO_CONFIG_SEED, ido_config.token_mint.as_ref()],
        bump = ido_config.bump,
    )]
    pub ido_config: Account<'info, IdoConfig>,
}

/// Cancel an active or paused IDO, enabling buyer refunds.
///
/// Only the IDO `authority` or the configured `governance` pubkey may cancel.
/// Once cancelled:
/// - Further purchases are blocked.
/// - Claims are blocked.
/// - Finalization is blocked.
/// - Refunds become available to all buyers.
pub fn handler(ctx: Context<CancelIdo>) -> Result<()> {
    let config = &mut ctx.accounts.ido_config;
    let caller = ctx.accounts.caller.key();

    // Only authority or governance can cancel
    require!(
        caller == config.authority || caller == config.governance,
        IdoError::Unauthorized
    );

    // Cannot cancel an already-finalized IDO
    require!(!config.finalized, IdoError::IdoAlreadyFinalized);

    // Cannot double-cancel
    require!(!config.cancelled, IdoError::IdoAlreadyCancelled);

    config.cancelled = true;

    let clock = Clock::get()?;
    emit!(IdoCancelled {
        authority: caller,
        total_sold_tokens: config.total_sold_tokens,
        total_raised_payment: config.total_raised_payment,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
