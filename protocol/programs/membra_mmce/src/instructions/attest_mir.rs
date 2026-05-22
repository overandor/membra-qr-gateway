use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;

#[derive(Accounts)]
pub struct AttestMir<'info> {
    #[account(mut)]
    pub attester: Signer<'info>,

    #[account(
        mut,
        seeds = [b"mir_receipt", mir_receipt.owner.as_ref(), &mir_receipt.job_id_hash],
        bump = mir_receipt.bump,
        constraint = mir_receipt.owner == attester.key() @ crate::errors::MmceError::Unauthorized
    )]
    pub mir_receipt: Account<'info, MIRReceipt>,
}

pub fn handler(
    ctx: Context<AttestMir>,
    compute_attestation_hash: [u8; 32],
) -> Result<()> {
    let mir = &mut ctx.accounts.mir_receipt;
    let clock = Clock::get()?;

    mir.compute_attestation_hash = compute_attestation_hash;
    mir.status = 1;
    mir.attested_at = clock.unix_timestamp;

    emit!(MIRAttested {
        mir_receipt: mir.key(),
        compute_attestation_hash,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
