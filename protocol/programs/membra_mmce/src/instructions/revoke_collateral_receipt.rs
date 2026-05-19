use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;

#[derive(Accounts)]
pub struct RevokeCollateralReceipt<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"mcr", mcr.owner.as_ref(), &mcr.key().to_bytes()[..32]],
        bump = mcr.bump,
        constraint = mcr.owner == owner.key() @ crate::errors::MmceError::Unauthorized
    )]
    pub mcr: Account<'info, MemoryCollateralReceipt>,
}

pub fn handler(ctx: Context<RevokeCollateralReceipt>) -> Result<()> {
    let mcr = &mut ctx.accounts.mcr;
    let clock = Clock::get()?;

    require!(
        mcr.status != CollateralStatus::Revoked,
        crate::errors::MmceError::AlreadyRevoked
    );

    let old_status = mcr.status as u8;
    mcr.status = CollateralStatus::Revoked;
    mcr.updated_at = clock.unix_timestamp;

    emit!(CollateralReceiptRevoked {
        mcr: mcr.key(),
        ts: clock.unix_timestamp,
    });

    emit!(CollateralReceiptStatusChanged {
        mcr: mcr.key(),
        old_status,
        new_status: mcr.status as u8,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
