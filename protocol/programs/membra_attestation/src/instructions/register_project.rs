use anchor_lang::prelude::*;

use crate::{
    errors::AttestationError,
    events::ProjectRegistered,
    state::{ProjectRecord, ProjectState, ProtocolConfig},
};

#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct RegisterProject<'info> {
    #[account(mut)]
    pub builder: Signer<'info>,

    #[account(
        seeds = [b"protocol_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = builder,
        space = ProjectRecord::LEN,
        seeds = [b"project", builder.key().as_ref(), &project_id.to_le_bytes()],
        bump,
    )]
    pub project_record: Account<'info, ProjectRecord>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<RegisterProject>, project_id: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, AttestationError::ProtocolPaused);

    let now = Clock::get()?.unix_timestamp;
    let project = &mut ctx.accounts.project_record;

    project.builder = ctx.accounts.builder.key();
    project.project_id = project_id;
    project.submitted_at = now;
    project.state = ProjectState::Pending;
    project.attestation_count = 0;
    project.challenged_count = 0;
    project.weighted_tech_sum = 0;
    project.weighted_treasury_sum = 0;
    project.weighted_tokenomics_sum = 0;
    project.weighted_gov_sum = 0;
    project.weighted_transparency_sum = 0;
    project.total_stake_weight = 0;
    project.tech_score = 0;
    project.treasury_score = 0;
    project.tokenomics_score = 0;
    project.gov_score = 0;
    project.transparency_score = 0;
    project.validator_confidence = 0;
    project.bump = ctx.bumps.project_record;

    emit!(ProjectRegistered {
        project: ctx.accounts.project_record.key(),
        builder: ctx.accounts.builder.key(),
        project_id,
        submitted_at: now,
    });

    Ok(())
}
