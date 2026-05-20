use anchor_lang::prelude::*;

use crate::{
    errors::AttestationError,
    events::ProjectScorePublished,
    state::{ProjectRecord, ProjectState, ProtocolConfig},
};

#[derive(Accounts)]
pub struct PublishProjectScore<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"protocol_config"],
        bump = config.bump,
        has_one = authority @ AttestationError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        constraint = project_record.state == ProjectState::Scoring
            @ AttestationError::ProjectNotScoring,
    )]
    pub project_record: Account<'info, ProjectRecord>,
}

pub fn handler(ctx: Context<PublishProjectScore>) -> Result<()> {
    let project_key = ctx.accounts.project_record.key();
    let min_attestations = ctx.accounts.config.min_attestations;

    let project = &mut ctx.accounts.project_record;

    let valid_attestations = project
        .attestation_count
        .checked_sub(project.challenged_count)
        .ok_or(AttestationError::ArithmeticOverflow)?;

    require!(
        valid_attestations >= min_attestations as u32,
        AttestationError::InsufficientAttestations
    );
    require!(
        project.total_stake_weight > 0,
        AttestationError::InsufficientAttestations
    );

    let weight = project.total_stake_weight;
    project.tech_score = (project.weighted_tech_sum / weight).min(100) as u8;
    project.treasury_score = (project.weighted_treasury_sum / weight).min(100) as u8;
    project.tokenomics_score = (project.weighted_tokenomics_sum / weight).min(100) as u8;
    project.gov_score = (project.weighted_gov_sum / weight).min(100) as u8;
    project.transparency_score = (project.weighted_transparency_sum / weight).min(100) as u8;

    project.validator_confidence = if project.attestation_count > 0 {
        ((valid_attestations as u64)
            .checked_mul(100)
            .unwrap_or(0)
            .checked_div(project.attestation_count as u64)
            .unwrap_or(0)) as u8
    } else {
        0
    };

    project.state = ProjectState::Scored;

    emit!(ProjectScorePublished {
        project: project_key,
        tech_score: project.tech_score,
        treasury_score: project.treasury_score,
        tokenomics_score: project.tokenomics_score,
        gov_score: project.gov_score,
        transparency_score: project.transparency_score,
        validator_confidence: project.validator_confidence,
        attestation_count: project.attestation_count,
    });

    Ok(())
}
