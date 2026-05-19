use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;

#[derive(Accounts)]
#[instruction(job_id_hash: [u8; 32])]
pub struct CreateMir<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = MIRReceipt::LEN,
        seeds = [b"mir_receipt", owner.key().as_ref(), &job_id_hash],
        bump
    )]
    pub mir_receipt: Account<'info, MIRReceipt>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateMir>,
    job_id_hash: [u8; 32],
    agent_id_hash: [u8; 32],
    input_merkle_root: [u8; 32],
    output_merkle_root: [u8; 32],
    model_manifest_hash: [u8; 32],
) -> Result<()> {
    let mir = &mut ctx.accounts.mir_receipt;
    let clock = Clock::get()?;

    mir.owner = ctx.accounts.owner.key();
    mir.agent_id_hash = agent_id_hash;
    mir.job_id_hash = job_id_hash;
    mir.input_merkle_root = input_merkle_root;
    mir.output_merkle_root = output_merkle_root;
    mir.model_manifest_hash = model_manifest_hash;
    mir.compute_attestation_hash = [0u8; 32];
    mir.status = 0;
    mir.created_at = clock.unix_timestamp;
    mir.attested_at = 0;
    mir.settled_at = 0;
    mir.bump = ctx.bumps.mir_receipt;

    emit!(MIRCreated {
        owner: ctx.accounts.owner.key(),
        job_id_hash,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
