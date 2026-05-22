use anchor_lang::prelude::*;

use crate::{
    errors::AttestationError,
    events::AttestationChallenged,
    state::{AttestationRecord, ChallengeRecord, ProjectRecord},
};

#[derive(Accounts)]
pub struct ChallengeAttestation<'info> {
    #[account(mut)]
    pub challenger: Signer<'info>,

    #[account(
        constraint = !attestation_record.challenged @ AttestationError::AlreadyChallenged
    )]
    pub attestation_record: Account<'info, AttestationRecord>,

    pub project_record: Account<'info, ProjectRecord>,

    #[account(
        init,
        payer = challenger,
        space = ChallengeRecord::LEN,
        seeds = [b"challenge", attestation_record.key().as_ref()],
        bump,
    )]
    pub challenge_record: Account<'info, ChallengeRecord>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<ChallengeAttestation>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    let challenge = &mut ctx.accounts.challenge_record;
    challenge.challenger = ctx.accounts.challenger.key();
    challenge.attestation = ctx.accounts.attestation_record.key();
    challenge.validator_target = ctx.accounts.attestation_record.validator;
    challenge.project = ctx.accounts.project_record.key();
    challenge.submitted_at = now;
    challenge.resolved = false;
    challenge.upheld = false;
    challenge.bump = ctx.bumps.challenge_record;

    emit!(AttestationChallenged {
        challenger: ctx.accounts.challenger.key(),
        attestation: ctx.accounts.attestation_record.key(),
        validator_target: ctx.accounts.attestation_record.validator,
        project: ctx.accounts.project_record.key(),
    });

    Ok(())
}
