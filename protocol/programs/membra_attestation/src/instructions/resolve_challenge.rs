use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};

use crate::{
    errors::AttestationError,
    events::ChallengeResolved,
    state::{AttestationRecord, ChallengeRecord, ProjectRecord, ProtocolConfig, ValidatorRecord},
};

#[derive(Accounts)]
pub struct ResolveChallenge<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"protocol_config"],
        bump = config.bump,
        has_one = authority @ AttestationError::Unauthorized,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"challenge", attestation_record.key().as_ref()],
        bump = challenge_record.bump,
        constraint = !challenge_record.resolved @ AttestationError::ChallengeAlreadyResolved,
    )]
    pub challenge_record: Account<'info, ChallengeRecord>,

    #[account(
        mut,
        address = challenge_record.attestation,
    )]
    pub attestation_record: Account<'info, AttestationRecord>,

    #[account(
        mut,
        address = challenge_record.project,
    )]
    pub project_record: Account<'info, ProjectRecord>,

    #[account(
        mut,
        seeds = [b"validator", challenge_record.validator_target.as_ref()],
        bump = validator_record.bump,
    )]
    pub validator_record: Account<'info, ValidatorRecord>,

    #[account(
        mut,
        address = validator_record.vault,
    )]
    pub validator_vault: Account<'info, TokenAccount>,

    #[account(address = config.token_mint)]
    pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ResolveChallenge>, upheld: bool) -> Result<()> {
    ctx.accounts.challenge_record.resolved = true;
    ctx.accounts.challenge_record.upheld = upheld;

    let mut slash_amount: u64 = 0;

    if upheld {
        ctx.accounts.attestation_record.challenged = true;

        // Compute slash amount from config before borrowing validator_record mutably.
        slash_amount = {
            let stake = ctx.accounts.validator_record.stake;
            let slash_bps = ctx.accounts.config.slash_bps;
            (stake as u128)
                .checked_mul(slash_bps as u128)
                .ok_or(AttestationError::ArithmeticOverflow)?
                .checked_div(10_000)
                .unwrap_or(0) as u64
        };

        if slash_amount > 0 {
            require!(ctx.accounts.validator_record.stake > 0, AttestationError::NoStakeToSlash);

            // Capture what we need for the PDA signer before any mutable borrow.
            let validator_key = ctx.accounts.validator_record.authority;
            let record_bump = ctx.accounts.validator_record.bump;

            // Get account_infos (cheap rc clones).
            let token_program_info = ctx.accounts.token_program.to_account_info();
            let mint_info = ctx.accounts.token_mint.to_account_info();
            let vault_info = ctx.accounts.validator_vault.to_account_info();
            let record_info = ctx.accounts.validator_record.to_account_info();

            token::burn(
                CpiContext::new_with_signer(
                    token_program_info,
                    Burn {
                        mint: mint_info,
                        from: vault_info,
                        authority: record_info,
                    },
                    &[&[b"validator", validator_key.as_ref(), &[record_bump]]],
                ),
                slash_amount,
            )?;
        }

        // Mutate validator_record.
        let record = &mut ctx.accounts.validator_record;
        record.stake = record.stake.saturating_sub(slash_amount);
        record.reputation = record.reputation.saturating_sub(500);
        record.failed_jobs = record.failed_jobs.saturating_add(1);
        record.slash_count = record.slash_count.saturating_add(1);

        // Remove challenged attestation's contribution from project sums.
        let stake = ctx.accounts.attestation_record.stake_at_submission;
        let tech = ctx.accounts.attestation_record.tech_score;
        let treasury = ctx.accounts.attestation_record.treasury_score;
        let tokenomics = ctx.accounts.attestation_record.tokenomics_score;
        let gov = ctx.accounts.attestation_record.gov_score;
        let transparency = ctx.accounts.attestation_record.transparency_score;

        let project = &mut ctx.accounts.project_record;
        project.weighted_tech_sum = project.weighted_tech_sum.saturating_sub((tech as u64).saturating_mul(stake));
        project.weighted_treasury_sum = project.weighted_treasury_sum.saturating_sub((treasury as u64).saturating_mul(stake));
        project.weighted_tokenomics_sum = project.weighted_tokenomics_sum.saturating_sub((tokenomics as u64).saturating_mul(stake));
        project.weighted_gov_sum = project.weighted_gov_sum.saturating_sub((gov as u64).saturating_mul(stake));
        project.weighted_transparency_sum = project.weighted_transparency_sum.saturating_sub((transparency as u64).saturating_mul(stake));
        project.total_stake_weight = project.total_stake_weight.saturating_sub(stake);
        project.challenged_count = project.challenged_count.saturating_add(1);
    }

    let attestation_key = ctx.accounts.attestation_record.key();

    emit!(ChallengeResolved {
        attestation: attestation_key,
        upheld,
        slash_amount,
    });

    Ok(())
}
