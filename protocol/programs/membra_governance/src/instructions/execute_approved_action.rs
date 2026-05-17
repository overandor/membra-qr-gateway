use anchor_lang::prelude::*;

use crate::{
    errors::GovernanceError,
    events::ProposalExecuted,
    state::{GovernanceConfig, Proposal, ProposalStatus},
};

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct ExecuteApprovedAction<'info> {
    /// Governance configuration.
    ///
    /// PDA seeds: `[b"governance", governance_config.authority.as_ref()]`
    #[account(
        seeds = [b"governance", governance_config.authority.as_ref()],
        bump = governance_config.bump,
    )]
    pub governance_config: Account<'info, GovernanceConfig>,

    /// The proposal being executed.
    #[account(
        mut,
        constraint = proposal.governance == governance_config.key() @ GovernanceError::Unauthorized,
    )]
    pub proposal: Account<'info, Proposal>,

    /// The signer triggering execution.  Must be a registered governance signer.
    pub executor: Signer<'info>,

    // Any additional accounts required by the target program are accessible
    // via `ctx.remaining_accounts`.  The target program is responsible for
    // reading the proposal status and treating `Executed` as authorisation.
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/// Marks a timelock-elapsed `Approved` proposal as `Executed`.
///
/// ## Design note
/// This instruction is a **pure authorization marker**.  It records that the
/// multisig has collectively approved and that the timelock has elapsed.  No
/// funds are moved here.  The target programs (IDO, Rebase, Rewards, …) check
/// that the governance proposal PDA is in `Executed` status before allowing
/// their own privileged operations, thereby enforcing the governance flow
/// without requiring complex CPI chains inside this program.
///
/// Any accounts needed by the target program can be forwarded via
/// `ctx.remaining_accounts` for off-chain tooling to inspect.
pub fn handler(ctx: Context<ExecuteApprovedAction>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let config = &ctx.accounts.governance_config;
    let proposal = &mut ctx.accounts.proposal;
    let executor_key = ctx.accounts.executor.key();

    // ---- Authorisation ---------------------------------------------------

    require!(config.is_signer(&executor_key), GovernanceError::NotASigner);

    // ---- Status guard ----------------------------------------------------

    require!(
        proposal.status == ProposalStatus::Approved,
        GovernanceError::ProposalNotApproved
    );

    // ---- Timelock check --------------------------------------------------

    // Safe arithmetic: approved_ts is always ≥ 0 (unix timestamp), and
    // timelock_seconds is validated to be ≥ 0 at initialization.
    let earliest_execution = proposal
        .approved_ts
        .checked_add(config.timelock_seconds)
        .ok_or(GovernanceError::ArithmeticOverflow)?;

    require!(now >= earliest_execution, GovernanceError::TimelockNotElapsed);

    // ---- Execution window check ------------------------------------------

    let latest_execution = earliest_execution
        .checked_add(config.execution_window_seconds)
        .ok_or(GovernanceError::ArithmeticOverflow)?;

    if now > latest_execution {
        // Mark the proposal as expired so callers can see it transitioned.
        proposal.status = ProposalStatus::Expired;
        return err!(GovernanceError::ExecutionWindowExpired);
    }

    // ---- Mark executed ---------------------------------------------------

    proposal.status = ProposalStatus::Executed;
    proposal.executed_ts = now;

    // Log the action for off-chain observability.  Actual execution of the
    // underlying action (fund transfers, parameter updates, etc.) is performed
    // by the target program via a separate CPI that validates this proposal's
    // `Executed` status.
    msg!(
        "GovernanceProposal[{}] executed: action={}",
        proposal.id,
        proposal.action_type.as_str(),
    );

    // ---- Emit event ------------------------------------------------------

    emit!(ProposalExecuted {
        id: proposal.id,
        executor: executor_key,
        ts: now,
    });

    Ok(())
}
