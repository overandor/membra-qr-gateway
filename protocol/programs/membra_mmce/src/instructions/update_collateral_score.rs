use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;

#[derive(Accounts)]
pub struct UpdateCollateralScore<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"mcr", mcr.owner.as_ref(), &mcr.mcr_id_hash],
        bump = mcr.bump,
        constraint = mcr.owner == owner.key() @ crate::errors::MmceError::Unauthorized
    )]
    pub mcr: Account<'info, MemoryCollateralReceipt>,
}

pub fn handler(
    ctx: Context<UpdateCollateralScore>,
    collateral_score: u64,
    appraisal_low_usd: u64,
    appraisal_high_usd: u64,
    risk_discount_bps: u16,
) -> Result<()> {
    let mcr = &mut ctx.accounts.mcr;
    let clock = Clock::get()?;

    require!(
        appraisal_low_usd <= appraisal_high_usd,
        crate::errors::MmceError::InvalidAppraisalRange
    );
    require!(
        risk_discount_bps <= 10000,
        crate::errors::MmceError::RiskDiscountOutOfRange
    );

    let old_status = mcr.status as u8;

    mcr.collateral_score = collateral_score;
    mcr.appraisal_low_usd = appraisal_low_usd;
    mcr.appraisal_high_usd = appraisal_high_usd;
    mcr.risk_discount_bps = risk_discount_bps;
    mcr.status = CollateralStatus::ReadyForAppraisal;
    mcr.updated_at = clock.unix_timestamp;

    emit!(CollateralScoreUpdated {
        mcr: mcr.key(),
        collateral_score,
        appraisal_low_usd,
        appraisal_high_usd,
        risk_discount_bps,
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
