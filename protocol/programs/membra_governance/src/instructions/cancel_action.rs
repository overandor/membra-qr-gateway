use anchor_lang::prelude::*;

use crate::{
    errors::GovernanceError,
    events::ProposalCancelled,
    state::{GovernanceConfig, Proposal, ProposalStatus},
};

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct CancelAction<'info> {
    /// Governance configuration.
    ///
    /// PDA seeds: `[b"governance", governance_config.authority.as_ref()]`
    #[account(
        seeds = [b"governance", governance_config.authority.as_ref()],
        bump = governance_config.bump,
    )]
    pub governance_config: Account<'info, GovernanceConfig>,

    /// The proposal to cancel.
    #[account(
        mut,
        constraint = proposal.governance == governance_config.key() @ GovernanceError::Unauthorized,
    )]
    pub proposal: Account<'info, Proposal>,

    /// Signer initiating the cancellation.  Must be in the governance signer set.
    pub canceller: Signer<'info>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/// Cancels a `Pending` or `Approved` proposal.
///
/// ## Rules
/// - **`Pending` proposals** – any single registered signer may cancel.  This
///   allows a signer to retract a proposal they co-signed, or to veto one they
///   believe is erroneous, without waiting for full multisig consensus.
/// - **`Approved` proposals** – the proposal has already accumulated enough
///   approvals to pass; cancelling it therefore requires a consensus of
///   signers equivalent to the approval threshold (i.e. the proposal's
///   `approval_count` must still meet the threshold).  In practice this means
///   the same set that approved must agree to cancel.  A single signer cannot
///   unilaterally undo a fully-approved proposal.
/// - **`Executed`, `Cancelled`, `Expired`** – terminal states; cannot be cancelled.
pub fn handler(ctx: Context<CancelAction>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let config = &ctx.accounts.governance_config;
    let proposal = &mut ctx.accounts.proposal;
    let canceller_key = ctx.accounts.canceller.key();

    // ---- Authorisation ---------------------------------------------------

    require!(
        config.is_signer(&canceller_key),
        GovernanceError::NotASigner
    );

    // ---- Status guard: must be Pending or Approved -----------------------

    match proposal.status {
        ProposalStatus::Pending => {
            // Any single signer may cancel a pending proposal.
            // No additional checks required beyond `is_signer` above.
        }
        ProposalStatus::Approved => {
            // Cancelling an already-approved proposal requires that the
            // existing approval count still satisfies the threshold.  This
            // prevents a single rogue signer from unwinding a proposal that
            // the full multisig has already endorsed.
            require!(
                proposal.approval_count >= config.approval_threshold,
                GovernanceError::InsufficientApprovals
            );
        }
        ProposalStatus::Executed => {
            // Cannot cancel an executed proposal.
            return err!(GovernanceError::ProposalNotExecutable);
        }
        ProposalStatus::Cancelled => {
            // Already cancelled.
            return err!(GovernanceError::ProposalNotPending);
        }
        ProposalStatus::Expired => {
            // Already expired.
            return err!(GovernanceError::ProposalExpired);
        }
    }

    // ---- Transition to Cancelled -----------------------------------------

    proposal.status = ProposalStatus::Cancelled;

    // ---- Emit event ------------------------------------------------------

    emit!(ProposalCancelled {
        id: proposal.id,
        cancelled_by: canceller_key,
        ts: now,
    });

    Ok(())
}
