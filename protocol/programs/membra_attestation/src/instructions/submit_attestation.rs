use anchor_lang::prelude::*;

use crate::{
    errors::AttestationError,
    events::AttestationSubmitted,
    state::{AttestationRecord, ProjectRecord, ProjectState, ProtocolConfig, ScoreSet, ValidatorRecord},
};

#[derive(Accounts)]
pub struct SubmitAttestation<'info> {
    #[account(mut)]
    pub validator: Signer<'info>,

    #[account(
        seeds = [b"protocol_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        seeds = [b"validator", validator.key().as_ref()],
        bump = validator_record.bump,
        constraint = validator_record.authority == validator.key() @ AttestationError::Unauthorized,
    )]
    pub validator_record: Account<'info, ValidatorRecord>,

    #[account(mut)]
    pub project_record: Account<'info, ProjectRecord>,

    #[account(
        init,
        payer = validator,
        space = AttestationRecord::LEN,
        seeds = [b"attestation", validator.key().as_ref(), project_record.key().as_ref()],
        bump,
    )]
    pub attestation_record: Account<'info, AttestationRecord>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<SubmitAttestation>,
    report_hash: [u8; 32],
    job_type: u8,
    scores: ScoreSet,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, AttestationError::ProtocolPaused);

    let project_state = ctx.accounts.project_record.state;
    require!(
        project_state == ProjectState::Pending || project_state == ProjectState::Scoring,
        AttestationError::ProjectNotAcceptingAttestations
    );

    require!(
        ctx.accounts.validator_record.stake >= ctx.accounts.config.min_stake,
        AttestationError::InsufficientStake
    );

    require!(
        scores.tech <= 100
            && scores.treasury <= 100
            && scores.tokenomics <= 100
            && scores.gov <= 100
            && scores.transparency <= 100,
        AttestationError::InvalidScore
    );

    let now = Clock::get()?.unix_timestamp;
    let stake = ctx.accounts.validator_record.stake;
    let project_key = ctx.accounts.project_record.key();
    let min_attestations = ctx.accounts.config.min_attestations;

    let attestation = &mut ctx.accounts.attestation_record;
    attestation.validator = ctx.accounts.validator.key();
    attestation.project = project_key;
    attestation.report_hash = report_hash;
    attestation.job_type = job_type;
    attestation.tech_score = scores.tech;
    attestation.treasury_score = scores.treasury;
    attestation.tokenomics_score = scores.tokenomics;
    attestation.gov_score = scores.gov;
    attestation.transparency_score = scores.transparency;
    attestation.stake_at_submission = stake;
    attestation.submitted_at = now;
    attestation.challenged = false;
    attestation.bump = ctx.bumps.attestation_record;

    let project = &mut ctx.accounts.project_record;

    project.weighted_tech_sum = project
        .weighted_tech_sum
        .checked_add((scores.tech as u64).checked_mul(stake).ok_or(AttestationError::ArithmeticOverflow)?)
        .ok_or(AttestationError::ArithmeticOverflow)?;
    project.weighted_treasury_sum = project
        .weighted_treasury_sum
        .checked_add((scores.treasury as u64).checked_mul(stake).ok_or(AttestationError::ArithmeticOverflow)?)
        .ok_or(AttestationError::ArithmeticOverflow)?;
    project.weighted_tokenomics_sum = project
        .weighted_tokenomics_sum
        .checked_add((scores.tokenomics as u64).checked_mul(stake).ok_or(AttestationError::ArithmeticOverflow)?)
        .ok_or(AttestationError::ArithmeticOverflow)?;
    project.weighted_gov_sum = project
        .weighted_gov_sum
        .checked_add((scores.gov as u64).checked_mul(stake).ok_or(AttestationError::ArithmeticOverflow)?)
        .ok_or(AttestationError::ArithmeticOverflow)?;
    project.weighted_transparency_sum = project
        .weighted_transparency_sum
        .checked_add((scores.transparency as u64).checked_mul(stake).ok_or(AttestationError::ArithmeticOverflow)?)
        .ok_or(AttestationError::ArithmeticOverflow)?;
    project.total_stake_weight = project
        .total_stake_weight
        .checked_add(stake)
        .ok_or(AttestationError::ArithmeticOverflow)?;
    project.attestation_count = project
        .attestation_count
        .checked_add(1)
        .ok_or(AttestationError::ArithmeticOverflow)?;

    let new_count = project.attestation_count;
    if project.state == ProjectState::Pending && new_count >= min_attestations as u32 {
        project.state = ProjectState::Scoring;
    }

    emit!(AttestationSubmitted {
        validator: ctx.accounts.validator.key(),
        project: project_key,
        job_type,
        tech_score: scores.tech,
        treasury_score: scores.treasury,
        tokenomics_score: scores.tokenomics,
        gov_score: scores.gov,
        transparency_score: scores.transparency,
        attestation_count: new_count,
    });

    Ok(())
}
