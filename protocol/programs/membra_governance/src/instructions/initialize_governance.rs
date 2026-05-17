use anchor_lang::prelude::*;

use crate::{
    errors::GovernanceError,
    events::GovernanceInitialized,
    state::{GovernanceConfig, MAX_SIGNERS},
};

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeGovernance<'info> {
    /// The governance configuration singleton PDA.
    ///
    /// PDA seeds: `[b"governance", authority.key().as_ref()]`
    #[account(
        init,
        payer = authority,
        space = GovernanceConfig::LEN,
        seeds = [b"governance", authority.key().as_ref()],
        bump,
    )]
    pub governance_config: Account<'info, GovernanceConfig>,

    /// Payer and bootstrap authority.  Becomes the stored `authority` field.
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/// Initialises the [`GovernanceConfig`] singleton for this authority.
///
/// # Parameters
/// - `signers`                  – up to [`MAX_SIGNERS`] pubkeys; must not be empty.
/// - `approval_threshold`       – 1 ≤ threshold ≤ len(signers).
/// - `timelock_seconds`         – ≥ 0; recommend ≥ 86 400 (24 h) on mainnet.
/// - `execution_window_seconds` – > 0; recommend ≥ 172 800 (48 h) on mainnet.
/// - `treasury`                 – must not be `Pubkey::default()`.
pub fn handler(
    ctx: Context<InitializeGovernance>,
    signers: Vec<Pubkey>,
    approval_threshold: u8,
    timelock_seconds: i64,
    execution_window_seconds: i64,
    treasury: Pubkey,
) -> Result<()> {
    // ---- Input validation -------------------------------------------------

    require!(!signers.is_empty(), GovernanceError::NoSigners);
    require!(
        signers.len() <= MAX_SIGNERS,
        GovernanceError::MaxSignersReached
    );

    let signer_count = signers.len() as u8;

    require!(approval_threshold >= 1, GovernanceError::InvalidThreshold);
    require!(
        approval_threshold <= signer_count,
        GovernanceError::InvalidThreshold
    );

    require!(timelock_seconds >= 0, GovernanceError::InvalidTimelockSeconds);
    require!(
        execution_window_seconds > 0,
        GovernanceError::InvalidExecutionWindow
    );

    require!(treasury != Pubkey::default(), GovernanceError::InvalidTreasury);

    // ---- Populate the account --------------------------------------------

    let config = &mut ctx.accounts.governance_config;
    let bump = ctx.bumps.governance_config;

    config.authority = ctx.accounts.authority.key();

    // Zero-initialise the entire fixed array then fill in active entries.
    config.signers = [Pubkey::default(); MAX_SIGNERS];
    for (i, pk) in signers.iter().enumerate() {
        config.signers[i] = *pk;
    }

    config.signer_count = signer_count;
    config.approval_threshold = approval_threshold;
    config.timelock_seconds = timelock_seconds;
    config.execution_window_seconds = execution_window_seconds;
    config.proposal_count = 0;
    config.treasury = treasury;
    config.paused = false;
    config.bump = bump;

    // ---- Emit event ------------------------------------------------------

    emit!(GovernanceInitialized {
        authority: config.authority,
        signer_count: config.signer_count,
        approval_threshold: config.approval_threshold,
        timelock_seconds: config.timelock_seconds,
        execution_window_seconds: config.execution_window_seconds,
        treasury: config.treasury,
    });

    Ok(())
}
