use anchor_lang::prelude::*;

use crate::{
    errors::GovernanceError,
    events::{ProposalApproved, ProposalThresholdReached},
    state::{GovernanceConfig, Proposal, ProposalStatus, MAX_APPROVALS},
};

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct ApproveAction<'info> {
    /// Governance configuration.
    ///
    /// PDA seeds: `[b"governance", governance_config.authority.as_ref()]`
    #[account(
        seeds = [b"governance", governance_config.authority.as_ref()],
        bump = governance_config.bump,
    )]
    pub governance_config: Account<'info, GovernanceConfig>,

    /// The proposal being approved.  Mutated to record the new approval.
    #[account(
        mut,
        constraint = proposal.governance == governance_config.key() @ GovernanceError::Unauthorized,
    )]
    pub proposal: Account<'info, Proposal>,

    /// The signer who is approving.  Must be in the governance signer set.
    pub approver: Signer<'info>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/// Adds one approval to the proposal.
///
/// If the approval count reaches the governance threshold the proposal status
/// transitions from `Pending` to `Approved` and `approved_ts` is recorded.
pub fn handler(ctx: Context<ApproveAction>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let config = &ctx.accounts.governance_config;
    let proposal = &mut ctx.accounts.proposal;
    let approver_key = ctx.accounts.approver.key();

    // ---- State guard -----------------------------------------------------

    require!(
        proposal.status == ProposalStatus::Pending,
        GovernanceError::ProposalNotPending
    );

    // ---- Authorisation ---------------------------------------------------

    require!(config.is_signer(&approver_key), GovernanceError::NotASigner);

    // ---- Duplicate approval check ----------------------------------------

    require!(
        !proposal.has_approved(&approver_key),
        GovernanceError::AlreadyApproved
    );

    // ---- Record the approval ---------------------------------------------

    // approval_count is bounded by MAX_APPROVALS (= MAX_SIGNERS = 10).
    // Since we have already verified approver_key is in the signer set and has
    // not yet approved, the count cannot exceed MAX_APPROVALS before all
    // signer slots are exhausted.
    let idx = proposal.approval_count as usize;
    require!(idx < MAX_APPROVALS, GovernanceError::MaxSignersReached);

    proposal.approvals[idx] = approver_key;
    proposal.approval_count = proposal
        .approval_count
        .checked_add(1)
        .ok_or(GovernanceError::ArithmeticOverflow)?;

    // ---- Emit per-approval event -----------------------------------------

    emit!(ProposalApproved {
        id: proposal.id,
        approver: approver_key,
        approval_count: proposal.approval_count,
        threshold: config.approval_threshold,
        ts: now,
    });

    // ---- Check threshold -------------------------------------------------

    if proposal.approval_count >= config.approval_threshold {
        proposal.status = ProposalStatus::Approved;
        proposal.approved_ts = now;

        emit!(ProposalThresholdReached {
            id: proposal.id,
            approval_count: proposal.approval_count,
            ts: now,
        });
    }

    Ok(())
}
